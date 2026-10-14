<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StudentPromotionService
{
    /**
     * Process student promotions from a source course into target courses or status updates.
     *
     * @param Course $sourceCourse
     * @param array<int, array{
     *     student_id: int,
     *     action: 'promote'|'repeat'|'withdraw'|'none',
     *     target_course_id?: int|null,
     *     mark_institution_inactive?: bool
     * }> $promotions
     * @return array{promoted: int, repeated: int, withdrawn: int, unchanged: int}
     */
    public function processPromotions(Course $sourceCourse, array $promotions): array
    {
        return DB::transaction(function () use ($sourceCourse, $promotions) {
            $summary = [
                'promoted' => 0,
                'repeated' => 0,
                'withdrawn' => 0,
                'unchanged' => 0,
            ];

            foreach ($promotions as $item) {
                $studentId = (int) $item['student_id'];
                $action = $item['action'] ?? 'none';
                $targetCourseId = !empty($item['target_course_id']) ? (int) $item['target_course_id'] : null;
                $markInactive = !empty($item['mark_institution_inactive']);

                if ($action === 'none') {
                    $summary['unchanged']++;
                    continue;
                }

                // Verify student is enrolled in source course
                $sourceEnrollment = Enrollment::where('course_id', $sourceCourse->id)
                    ->where('student_id', $studentId)
                    ->first();

                if (!$sourceEnrollment) {
                    continue;
                }

                $student = Student::find($studentId);
                if (!$student) {
                    continue;
                }

                if ($action === 'promote' || $action === 'repeat') {
                    if (!$targetCourseId) {
                        throw new InvalidArgumentException("Se requiere un curso de destino para la acción '{$action}' del estudiante {$student->full_name}.");
                    }

                    $targetCourse = Course::with('academicPeriod')->find($targetCourseId);
                    if (!$targetCourse) {
                        throw new InvalidArgumentException("El curso de destino ID {$targetCourseId} no existe.");
                    }

                    if ($targetCourse->institution_id !== $sourceCourse->institution_id) {
                        throw new InvalidArgumentException("El curso de destino no pertenece a la misma institución.");
                    }

                    if ($targetCourse->isReadOnly()) {
                        throw new InvalidArgumentException("No se puede matricular estudiantes en un curso de un período cerrado o archivado.");
                    }

                    // 1. Update source enrollment
                    $newSourceStatus = $action === 'promote' ? 'promoted' : 'repeated';
                    $sourceEnrollment->update(['status' => $newSourceStatus]);

                    // 2. Enroll student into target course
                    Enrollment::updateOrCreate(
                        [
                            'course_id' => $targetCourse->id,
                            'student_id' => $studentId,
                        ],
                        [
                            'status' => 'active',
                            'preferred_workstation' => $sourceEnrollment->preferred_workstation,
                            'enrolled_at' => now(),
                        ]
                    );

                    // Ensure student is active in institution
                    if (!$student->is_active) {
                        $student->update(['is_active' => true]);
                    }

                    if ($action === 'promote') {
                        $summary['promoted']++;
                    } else {
                        $summary['repeated']++;
                    }
                } elseif ($action === 'withdraw') {
                    // Update source enrollment to withdrawn
                    $sourceEnrollment->update(['status' => 'withdrawn']);

                    if ($markInactive) {
                        $student->update(['is_active' => false]);
                    }

                    $summary['withdrawn']++;
                }
            }

            return $summary;
        });
    }
}
