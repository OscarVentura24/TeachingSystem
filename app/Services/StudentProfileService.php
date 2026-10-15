<?php

namespace App\Services;

use App\Models\Student;
use Illuminate\Support\Collection;

class StudentProfileService
{
    /**
     * Build the comprehensive profile, academic trajectory and metrics for a student.
     */
    public function getStudentProfile(Student $student): array
    {
        $student->load(['institution:id,name,code']);

        // 1. Load enrollments with courses, academic periods, and teachers
        $enrollments = $student->enrollments()
            ->with([
                'course' => function ($q) {
                    $q->with([
                        'academicPeriod',
                        'teachers:id,name,email',
                        'assessments',
                    ])->withCount(['courseTopics', 'sessions']);
                },
            ])
            ->latest('enrolled_at')
            ->get();

        // 2. Load all assessment scores
        $assessmentScores = $student->assessmentScores()
            ->with(['assessment.course.academicPeriod'])
            ->orderByDesc('graded_at')
            ->orderByDesc('created_at')
            ->get();

        // 3. Load all session attendances
        $sessionAttendances = $student->sessionAttendances()
            ->with([
                'classSession.course.academicPeriod',
                'classSession.topics:id,title,unit_title',
            ])
            ->orderByDesc('created_at')
            ->get();

        // 4. Load all student topic progress records
        $topicProgressRecords = $student->topicProgress()
            ->with(['courseTopic.course.academicPeriod'])
            ->orderByDesc('evaluated_at')
            ->orderByDesc('created_at')
            ->get();

        // Group enrollments by Academic Period for the trajectory timeline
        $trajectory = $this->buildTrajectory(
            $enrollments,
            $assessmentScores,
            $sessionAttendances,
            $topicProgressRecords
        );

        // Compute overall student metrics
        $metrics = $this->calculateOverallMetrics(
            $enrollments,
            $assessmentScores,
            $sessionAttendances,
            $topicProgressRecords
        );

        // Format detailed lists for dedicated tabs
        $formattedAssessments = $this->formatAssessmentScores($assessmentScores);
        $formattedAttendances = $this->formatSessionAttendances($sessionAttendances);
        $formattedTopicProgress = $this->formatTopicProgress($topicProgressRecords);

        return [
            'student' => [
                'id' => $student->id,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'full_name' => $student->full_name,
                'student_id_number' => $student->student_id_number,
                'email' => $student->email,
                'phone' => $student->phone,
                'notes' => $student->notes,
                'is_active' => (bool) $student->is_active,
                'created_at' => $student->created_at?->toIso8601String(),
                'institution' => $student->institution ? [
                    'id' => $student->institution->id,
                    'name' => $student->institution->name,
                    'code' => $student->institution->code,
                ] : null,
            ],
            'metrics' => $metrics,
            'trajectory' => $trajectory,
            'assessments' => $formattedAssessments,
            'attendances' => $formattedAttendances,
            'topicProgress' => $formattedTopicProgress,
        ];
    }

    /**
     * Build the structured academic trajectory timeline grouped by academic period.
     */
    protected function buildTrajectory(
        Collection $enrollments,
        Collection $assessmentScores,
        Collection $sessionAttendances,
        Collection $topicProgressRecords
    ): array {
        // Group enrollments by academic period
        $grouped = [];

        foreach ($enrollments as $enrollment) {
            $course = $enrollment->course;
            if (!$course) {
                continue;
            }

            $period = $course->academicPeriod;
            $periodKey = $period ? $period->id : 0;

            if (!isset($grouped[$periodKey])) {
                $grouped[$periodKey] = [
                    'period' => $period ? [
                        'id' => $period->id,
                        'name' => $period->name,
                        'is_current' => (bool) $period->is_current,
                        'is_closed' => (bool) $period->is_closed,
                        'start_date' => $period->start_date?->format('Y-m-d'),
                        'end_date' => $period->end_date?->format('Y-m-d'),
                    ] : [
                        'id' => 0,
                        'name' => 'Sin Período Definido',
                        'is_current' => false,
                        'is_closed' => false,
                        'start_date' => null,
                        'end_date' => null,
                    ],
                    'courses' => [],
                ];
            }

            // Scores for this specific course
            $courseScores = $assessmentScores->filter(function ($score) use ($course) {
                return $score->assessment && $score->assessment->course_id === $course->id;
            });

            $averageScore = null;
            if ($courseScores->isNotEmpty()) {
                $validScores = $courseScores->filter(fn ($s) => $s->score !== null && $s->assessment && $s->assessment->max_score > 0);
                if ($validScores->isNotEmpty()) {
                    $totalPct = $validScores->sum(fn ($s) => ($s->score / $s->assessment->max_score) * 100);
                    $averageScore = round($totalPct / $validScores->count(), 1);
                }
            }

            // Attendances for this specific course
            $courseAttendances = $sessionAttendances->filter(function ($att) use ($course) {
                return $att->classSession && $att->classSession->course_id === $course->id;
            });

            $totalSessions = (int) ($course->sessions_count ?? 0);
            $attendedCount = $courseAttendances->count();
            $attendanceRate = $totalSessions > 0 ? round(($attendedCount / $totalSessions) * 100, 1) : null;

            // Topics covered for this student in this course
            $courseTopicsEvaluated = $topicProgressRecords->filter(function ($tp) use ($course) {
                return $tp->courseTopic && $tp->courseTopic->course_id === $course->id;
            });
            $masteredCount = $courseTopicsEvaluated->filter(function ($tp) {
                return in_array($tp->mastery_level, ['competent', 'mastered']);
            })->count();

            $grouped[$periodKey]['courses'][] = [
                'course_id' => $course->id,
                'name' => $course->name,
                'code' => $course->code,
                'section' => $course->section,
                'course_status' => $course->status,
                'enrollment_status' => $enrollment->status,
                'enrolled_at' => $enrollment->enrolled_at?->format('Y-m-d'),
                'preferred_workstation' => $enrollment->preferred_workstation,
                'teachers' => $course->teachers->pluck('name')->toArray(),
                'metrics' => [
                    'average_score' => $averageScore,
                    'scores_count' => $courseScores->count(),
                    'attended_sessions' => $attendedCount,
                    'total_sessions' => $totalSessions,
                    'attendance_rate' => $attendanceRate,
                    'topics_total' => (int) ($course->course_topics_count ?? 0),
                    'topics_mastered' => $masteredCount,
                ],
            ];
        }

        // Sort periods: current first, then by period id descending
        uasort($grouped, function ($a, $b) {
            if ($a['period']['is_current'] && !$b['period']['is_current']) {
                return -1;
            }
            if (!$a['period']['is_current'] && $b['period']['is_current']) {
                return 1;
            }
            return $b['period']['id'] <=> $a['period']['id'];
        });

        return array_values($grouped);
    }

    /**
     * Calculate global cumulative metrics for the student.
     */
    protected function calculateOverallMetrics(
        Collection $enrollments,
        Collection $assessmentScores,
        Collection $sessionAttendances,
        Collection $topicProgressRecords
    ): array {
        $totalCourses = $enrollments->count();
        $promotedCourses = $enrollments->where('status', 'promoted')->count();
        $repeatedCourses = $enrollments->where('status', 'repeated')->count();
        $activeCourses = $enrollments->where('status', 'active')->count();
        $withdrawnCourses = $enrollments->where('status', 'withdrawn')->count();

        // Distinct periods
        $distinctPeriodsCount = $enrollments
            ->map(fn ($e) => $e->course?->academic_period_id)
            ->filter()
            ->unique()
            ->count();

        // Overall GPA / Assessment average
        $validScores = $assessmentScores->filter(
            fn ($s) => $s->score !== null && $s->assessment && $s->assessment->max_score > 0
        );

        $averageScore = null;
        if ($validScores->isNotEmpty()) {
            $totalPct = $validScores->sum(fn ($s) => ($s->score / $s->assessment->max_score) * 100);
            $averageScore = round($totalPct / $validScores->count(), 1);
        }

        // Overall attendance rate
        $totalCourseSessions = $enrollments->sum(fn ($e) => (int) ($e->course?->sessions_count ?? 0));
        $totalAttended = $sessionAttendances->count();
        $attendanceRate = $totalCourseSessions > 0
            ? min(100.0, round(($totalAttended / $totalCourseSessions) * 100, 1))
            : ($totalAttended > 0 ? 100.0 : null);

        // Topics mastered
        $topicsMastered = $topicProgressRecords->filter(
            fn ($tp) => in_array($tp->mastery_level, ['competent', 'mastered'])
        )->pluck('course_topic_id')->unique()->count();

        return [
            'total_periods' => $distinctPeriodsCount,
            'total_courses' => $totalCourses,
            'promoted_courses' => $promotedCourses,
            'repeated_courses' => $repeatedCourses,
            'active_courses' => $activeCourses,
            'withdrawn_courses' => $withdrawnCourses,
            'average_score' => $averageScore,
            'assessments_taken' => $assessmentScores->count(),
            'attendance_rate' => $attendanceRate,
            'sessions_attended' => $totalAttended,
            'total_course_sessions' => $totalCourseSessions,
            'topics_mastered' => $topicsMastered,
            'total_topics_evaluated' => $topicProgressRecords->pluck('course_topic_id')->unique()->count(),
        ];
    }

    /**
     * Format assessment scores for detailed view.
     */
    protected function formatAssessmentScores(Collection $assessmentScores): array
    {
        return $assessmentScores->map(function ($score) {
            $assessment = $score->assessment;
            $course = $assessment?->course;
            $period = $course?->academicPeriod;

            $maxScore = (float) ($assessment?->max_score ?? 100);
            $numScore = $score->score !== null ? (float) $score->score : null;
            $percentage = ($numScore !== null && $maxScore > 0)
                ? round(($numScore / $maxScore) * 100, 1)
                : null;

            return [
                'id' => $score->id,
                'title' => $assessment?->title ?? 'Evaluación',
                'type' => $assessment?->assessment_type ?? 'general',
                'score' => $numScore,
                'max_score' => $maxScore,
                'percentage' => $percentage,
                'status' => $score->status ?? 'graded',
                'feedback' => $score->feedback,
                'graded_at' => $score->graded_at?->toIso8601String(),
                'course_id' => $course?->id,
                'course_name' => $course?->name,
                'course_section' => $course?->section,
                'period_name' => $period?->name,
            ];
        })->values()->toArray();
    }

    /**
     * Format session attendances for detailed view.
     */
    protected function formatSessionAttendances(Collection $sessionAttendances): array
    {
        return $sessionAttendances->map(function ($attendance) {
            $session = $attendance->classSession;
            $course = $session?->course;
            $period = $course?->academicPeriod;

            return [
                'id' => $attendance->id,
                'session_id' => $session?->id,
                'session_title' => $session?->title ?? 'Sesión de Clase',
                'session_date' => $session?->session_date?->format('Y-m-d'),
                'start_time' => $session?->start_time,
                'end_time' => $session?->end_time,
                'course_id' => $course?->id,
                'course_name' => $course?->name,
                'course_section' => $course?->section,
                'period_name' => $period?->name,
                'workstation' => $attendance->workstation,
                'notes' => $attendance->notes,
                'topics' => $session?->topics?->pluck('title')->toArray() ?? [],
            ];
        })->values()->toArray();
    }

    /**
     * Format topic progress records for detailed view.
     */
    protected function formatTopicProgress(Collection $topicProgressRecords): array
    {
        return $topicProgressRecords->map(function ($record) {
            $topic = $record->courseTopic;
            $course = $topic?->course;
            $period = $course?->academicPeriod;

            return [
                'id' => $record->id,
                'topic_id' => $topic?->id,
                'topic_title' => $topic?->title ?? 'Tema',
                'unit_title' => $topic?->unit_title,
                'course_id' => $course?->id,
                'course_name' => $course?->name,
                'period_name' => $period?->name,
                'coverage_status' => $record->coverage_status,
                'mastery_level' => $record->mastery_level,
                'evaluation_notes' => $record->evaluation_notes,
                'evaluated_at' => $record->evaluated_at?->toIso8601String(),
            ];
        })->values()->toArray();
    }
}
