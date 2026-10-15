<?php

namespace App\Services;

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

class AcademicPeriodRolloverService
{
    /**
     * Close an academic period and archive its courses.
     */
    public function closePeriod(AcademicPeriod $period): void
    {
        DB::transaction(function () use ($period) {
            $period->update([
                'is_closed' => true,
                'closed_at' => now(),
                'is_current' => false,
            ]);

            $period->courses()->update(['status' => 'archived']);
        });
    }

    /**
     * Reopen an academic period and restore its courses to active.
     */
    public function reopenPeriod(AcademicPeriod $period): void
    {
        DB::transaction(function () use ($period) {
            $period->update([
                'is_closed' => false,
                'closed_at' => null,
                'is_current' => true,
            ]);

            $period->courses()->update(['status' => 'active']);
        });
    }

    /**
     * Execute full academic period rollover:
     * - Create new academic period.
     * - Optionally close source period.
     * - Clone selected courses with their full pensums (root and subtopics) and teachers.
     * - Optionally promote/transfer students into the cloned courses.
     *
     * @param AcademicPeriod $sourcePeriod
     * @param array{name: string, start_date?: string|null, end_date?: string|null, is_current?: bool} $newPeriodData
     * @param array{
     *     close_source_period?: bool,
     *     clone_course_ids?: array<int>,
     *     promote_students?: bool
     * } $options
     * @return AcademicPeriod
     */
    public function rollover(AcademicPeriod $sourcePeriod, array $newPeriodData, array $options = []): AcademicPeriod
    {
        return DB::transaction(function () use ($sourcePeriod, $newPeriodData, $options) {
            $isCurrent = $newPeriodData['is_current'] ?? true;

            if ($isCurrent) {
                AcademicPeriod::where('institution_id', $sourcePeriod->institution_id)
                    ->update(['is_current' => false]);
            }

            // 1. Create or adopt existing Academic Period
            $newPeriod = AcademicPeriod::firstOrCreate(
                [
                    'institution_id' => $sourcePeriod->institution_id,
                    'name' => $newPeriodData['name'],
                ],
                [
                    'start_date' => $newPeriodData['start_date'] ?? null,
                    'end_date' => $newPeriodData['end_date'] ?? null,
                    'is_current' => $isCurrent,
                    'is_closed' => false,
                ]
            );

            if (! $newPeriod->wasRecentlyCreated) {
                $newPeriod->update(array_filter([
                    'start_date' => $newPeriodData['start_date'] ?? null,
                    'end_date' => $newPeriodData['end_date'] ?? null,
                    'is_current' => $isCurrent,
                    'is_closed' => false,
                ], fn ($val) => ! is_null($val)));
            }

            // 2. Close source period if requested
            if ($options['close_source_period'] ?? true) {
                $this->closePeriod($sourcePeriod);
            }

            // 3. Clone selected courses and their pensums
            $cloneCourseIds = $options['clone_course_ids'] ?? [];
            if (!empty($cloneCourseIds)) {
                $coursesToClone = Course::where('academic_period_id', $sourcePeriod->id)
                    ->whereIn('id', $cloneCourseIds)
                    ->with(['teachers', 'students'])
                    ->get();

                $promoteStudents = $options['promote_students'] ?? false;
                $promotions = $options['promotions'] ?? [];
                $clonedCoursesMap = [];

                foreach ($coursesToClone as $sourceCourse) {
                    $newCourse = Course::create([
                        'institution_id' => $sourceCourse->institution_id,
                        'academic_period_id' => $newPeriod->id,
                        'name' => $sourceCourse->name,
                        'section' => $sourceCourse->section,
                        'code' => $sourceCourse->code,
                        'description' => $sourceCourse->description,
                        'color' => $sourceCourse->color,
                        'status' => 'active',
                    ]);

                    $clonedCoursesMap[$sourceCourse->id] = $newCourse;

                    // Clone teachers
                    foreach ($sourceCourse->teachers as $teacher) {
                        $newCourse->teachers()->attach($teacher->id, [
                            'is_primary' => $teacher->pivot->is_primary,
                        ]);
                    }

                    // Clone pensum (root topics and subtopics)
                    $rootTopics = CourseTopic::where('course_id', $sourceCourse->id)
                        ->whereNull('parent_id')
                        ->orderBy('sort_order')
                        ->with('subtopics')
                        ->get();

                    foreach ($rootTopics as $root) {
                        $newRoot = $newCourse->courseTopics()->create([
                            'topic_id' => $root->topic_id,
                            'title' => $root->title,
                            'unit_title' => $root->unit_title,
                            'description' => $root->description,
                            'sort_order' => $root->sort_order,
                            'is_required' => $root->is_required,
                        ]);

                        if ($root->subtopics) {
                            foreach ($root->subtopics as $sub) {
                                $newCourse->courseTopics()->create([
                                    'parent_id' => $newRoot->id,
                                    'topic_id' => $sub->topic_id,
                                    'title' => $sub->title,
                                    'unit_title' => $sub->unit_title,
                                    'description' => $sub->description,
                                    'sort_order' => $sub->sort_order,
                                    'is_required' => $sub->is_required,
                                ]);
                            }
                        }
                    }
                }

                // Process student promotions if configured
                if (!empty($promotions)) {
                    foreach ($promotions as $item) {
                        $studentId = (int) $item['student_id'];
                        $sourceCourseId = (int) $item['source_course_id'];
                        $action = $item['action'] ?? 'none';
                        $targetSourceCourseId = !empty($item['target_source_course_id']) ? (int) $item['target_source_course_id'] : null;
                        $markInactive = !empty($item['mark_institution_inactive']);

                        if ($action === 'none') {
                            continue;
                        }

                        $sourceEnrollment = Enrollment::where('course_id', $sourceCourseId)
                            ->where('student_id', $studentId)
                            ->first();

                        $student = Student::find($studentId);
                        if (!$sourceEnrollment || !$student) {
                            continue;
                        }

                        if ($action === 'promote') {
                            // Update historical status in source course
                            $sourceEnrollment->update(['status' => 'promoted']);

                            // Enroll in target course clone in new period
                            $targetNewCourse = $targetSourceCourseId && isset($clonedCoursesMap[$targetSourceCourseId])
                                ? $clonedCoursesMap[$targetSourceCourseId]
                                : null;

                            if ($targetNewCourse) {
                                Enrollment::create([
                                    'course_id' => $targetNewCourse->id,
                                    'student_id' => $studentId,
                                    'status' => 'active',
                                    'preferred_workstation' => $sourceEnrollment->preferred_workstation,
                                    'enrolled_at' => now(),
                                ]);
                            }
                        } elseif ($action === 'repeat') {
                            // Update historical status in source course
                            $sourceEnrollment->update(['status' => 'repeated']);

                            // Repeater is enrolled in the new period's clone of the SAME level/course
                            $targetNewCourse = $clonedCoursesMap[$sourceCourseId] ?? null;

                            if ($targetNewCourse) {
                                Enrollment::create([
                                    'course_id' => $targetNewCourse->id,
                                    'student_id' => $studentId,
                                    'status' => 'active',
                                    'preferred_workstation' => $sourceEnrollment->preferred_workstation,
                                    'enrolled_at' => now(),
                                ]);
                            }
                        } elseif ($action === 'withdraw') {
                            $sourceEnrollment->update(['status' => 'withdrawn']);
                            if ($markInactive) {
                                $student->update(['is_active' => false]);
                            }
                        }

                        if ($action !== 'withdraw' && !$student->is_active) {
                            $student->update(['is_active' => true]);
                        }
                    }
                } elseif ($promoteStudents) {
                    // Legacy fallback: attach to identical cloned course
                    foreach ($coursesToClone as $sourceCourse) {
                        $newCourse = $clonedCoursesMap[$sourceCourse->id] ?? null;
                        if ($newCourse) {
                            foreach ($sourceCourse->students as $student) {
                                $newCourse->students()->attach($student->id, [
                                    'preferred_workstation' => $student->pivot->preferred_workstation,
                                    'status' => 'active',
                                    'enrolled_at' => now(),
                                ]);
                            }
                        }
                    }
                }
            }

            return $newPeriod;
        });
    }
}
