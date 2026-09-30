<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Student;
use App\Models\StudentTopicProgress;
use Illuminate\Support\Collection;

class TopicSuggestionEngine
{
    /**
     * Analyze present students and return a deterministic topic recommendation.
     *
     * @param Course $course
     * @param array<int> $presentStudentIds
     * @return array<string, mixed>
     */
    public function suggest(Course $course, array $presentStudentIds): array
    {
        if (empty($presentStudentIds)) {
            return [
                'status' => 'empty_selection',
                'message' => 'No hay estudiantes seleccionados en la sesión.',
                'primary_recommendation' => null,
                'analysis' => [],
            ];
        }

        // 1. Load present students
        $students = Student::whereIn('id', $presentStudentIds)
            ->get()
            ->keyBy('id');

        $totalPresent = $students->count();

        // 2. Load Course Topics (Pensum) in order with global topic and prerequisites
        $courseTopics = CourseTopic::where('course_id', $course->id)
            ->with(['globalTopic.prerequisites'])
            ->orderBy('sort_order')
            ->get();

        if ($courseTopics->isEmpty()) {
            return [
                'status' => 'no_topics',
                'message' => 'El curso no tiene temas configurados en su pensum.',
                'primary_recommendation' => null,
                'analysis' => [],
            ];
        }

        // Map global topic ID to CourseTopic in this pensum for prerequisite resolution
        $topicIdToCourseTopic = [];
        foreach ($courseTopics as $ct) {
            if ($ct->topic_id) {
                $topicIdToCourseTopic[$ct->topic_id] = $ct;
            }
        }

        // 3. Load completed progress records for these students in this course
        $courseTopicIds = $courseTopics->pluck('id')->all();

        $completedProgress = StudentTopicProgress::whereIn('student_id', $presentStudentIds)
            ->whereIn('course_topic_id', $courseTopicIds)
            ->where('coverage_status', 'explained')
            ->get()
            ->groupBy('student_id');

        // Helper set of completed course_topic_ids per student
        $studentCompletedTopicIds = [];
        foreach ($presentStudentIds as $sId) {
            $records = $completedProgress->get($sId, collect());
            $studentCompletedTopicIds[$sId] = $records->pluck('course_topic_id')->flip()->all();
        }

        // 4. Analyze each topic for the present students
        $analysis = [];

        foreach ($courseTopics as $courseTopic) {
            $readyStudentIds = [];
            $alreadyCoveredStudentIds = [];
            $missingPrereqDetails = [];

            // Identify prerequisite CourseTopic IDs in this pensum
            $prereqCourseTopicIds = [];
            if ($courseTopic->globalTopic && $courseTopic->globalTopic->prerequisites->isNotEmpty()) {
                foreach ($courseTopic->globalTopic->prerequisites as $prereqGlobal) {
                    if (isset($topicIdToCourseTopic[$prereqGlobal->id])) {
                        $prereqCourseTopicIds[] = $topicIdToCourseTopic[$prereqGlobal->id];
                    }
                }
            }

            foreach ($presentStudentIds as $sId) {
                $student = $students->get($sId);
                if (! $student) {
                    continue;
                }

                $hasCovered = isset($studentCompletedTopicIds[$sId][$courseTopic->id]);

                if ($hasCovered) {
                    $alreadyCoveredStudentIds[] = [
                        'id' => $student->id,
                        'name' => $student->full_name,
                    ];
                    continue;
                }

                // Check if student has met all prerequisites
                $missingForStudent = [];
                foreach ($prereqCourseTopicIds as $prereqCt) {
                    if (! isset($studentCompletedTopicIds[$sId][$prereqCt->id])) {
                        $missingForStudent[] = [
                            'course_topic_id' => $prereqCt->id,
                            'title' => $prereqCt->title,
                        ];
                    }
                }

                if (empty($missingForStudent)) {
                    $readyStudentIds[] = [
                        'id' => $student->id,
                        'name' => $student->full_name,
                    ];
                } else {
                    $missingPrereqDetails[] = [
                        'id' => $student->id,
                        'name' => $student->full_name,
                        'missing_prerequisites' => $missingForStudent,
                    ];
                }
            }

            $readyCount = count($readyStudentIds);
            $coveredCount = count($alreadyCoveredStudentIds);
            $missingCount = count($missingPrereqDetails);

            $analysis[] = [
                'course_topic_id' => $courseTopic->id,
                'title' => $courseTopic->title,
                'unit_title' => $courseTopic->unit_title,
                'sort_order' => $courseTopic->sort_order,
                'ready_and_pending_count' => $readyCount,
                'already_covered_count' => $coveredCount,
                'missing_prerequisites_count' => $missingCount,
                'ready_students' => $readyStudentIds,
                'already_covered_students' => $alreadyCoveredStudentIds,
                'missing_prerequisite_students' => $missingPrereqDetails,
                'is_fully_covered' => ($coveredCount === $totalPresent),
                'is_all_ready' => ($readyCount === $totalPresent),
            ];
        }

        // 5. Determine Primary Recommendation
        $recommendation = $this->determinePrimaryRecommendation($analysis, $totalPresent);

        return [
            'status' => 'success',
            'present_students_count' => $totalPresent,
            'primary_recommendation' => $recommendation,
            'analysis' => $analysis,
        ];
    }

    /**
     * Deterministic scoring and ranking to select the optimal recommendation.
     *
     * @param array<int, array<string, mixed>> $analysis
     * @param int $totalPresent
     * @return array<string, mixed>|null
     */
    private function determinePrimaryRecommendation(array $analysis, int $totalPresent): ?array
    {
        // Filter out topics already completed by 100% of present students
        $pendingTopics = array_filter($analysis, fn ($t) => ! $t['is_fully_covered']);

        if (empty($pendingTopics)) {
            return [
                'action_type' => 'all_completed',
                'course_topic_id' => null,
                'title' => 'Todos los temas completados',
                'rationale' => 'Todos los estudiantes presentes han cubierto el 100% de los temas del pensum.',
            ];
        }

        // Case 1: Look for a topic where 100% of present students are ready
        foreach ($pendingTopics as $topicData) {
            if ($topicData['ready_and_pending_count'] === $totalPresent) {
                return array_merge($topicData, [
                    'action_type' => ($topicData['sort_order'] === 1 ? 'start' : 'advance'),
                    'rationale' => sprintf(
                        'Avanzar con "%s": el 100%% de los estudiantes presentes (%d/%d) cumplen los prerrequisitos y tienen pendiente este tema.',
                        $topicData['title'],
                        $totalPresent,
                        $totalPresent
                    ),
                ]);
            }
        }

        // Case 2: Group is divergent (some have seen topics or are missing prerequisites)
        // Find the earliest topic that has students ready or missing prerequisites.
        // Rule: Prioritize the earliest topic with pending students that has 0 missing prerequisites,
        // so that lagging students can catch up without being left behind.
        $levelingTopic = null;
        foreach ($pendingTopics as $topicData) {
            if ($topicData['missing_prerequisites_count'] === 0 && $topicData['ready_and_pending_count'] > 0) {
                $levelingTopic = $topicData;
                break;
            }
        }

        if ($levelingTopic) {
            $readyCount = $levelingTopic['ready_and_pending_count'];
            $coveredCount = $levelingTopic['already_covered_count'];

            $rationale = sprintf(
                'Nivelación recomendada en "%s": %d estudiante(s) lo tienen pendiente sin bloqueos de prerrequisitos, mientras %d estudiante(s) ya lo recibieron.',
                $levelingTopic['title'],
                $readyCount,
                $coveredCount
            );

            return array_merge($levelingTopic, [
                'action_type' => 'review_leveling',
                'rationale' => $rationale,
            ]);
        }

        // Case 3: Topics have prerequisites that some students are missing
        // Choose the topic with the maximum ready students
        usort($pendingTopics, function ($a, $b) {
            if ($a['ready_and_pending_count'] !== $b['ready_and_pending_count']) {
                return $b['ready_and_pending_count'] <=> $a['ready_and_pending_count'];
            }
            return $a['sort_order'] <=> $b['sort_order'];
        });

        $bestCandidate = reset($pendingTopics);

        $missingNames = array_map(fn ($s) => $s['name'], $bestCandidate['missing_prerequisite_students']);
        $missingStr = implode(', ', $missingNames);

        $rationale = sprintf(
            'Tema con mayor avance disponible: "%s" (%d listos), pero %d estudiante(s) (%s) carecen de prerrequisitos previos.',
            $bestCandidate['title'],
            $bestCandidate['ready_and_pending_count'],
            $bestCandidate['missing_prerequisites_count'],
            $missingStr
        );

        return array_merge($bestCandidate, [
            'action_type' => 'advance_with_caveats',
            'rationale' => $rationale,
        ]);
    }
}
