<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\StudentTopicProgress;

class AssessmentMasterySyncService
{
    /**
     * Synchronize student topic progress and mastery level based on assessment scores.
     */
    public function syncForAssessment(Assessment $assessment): void
    {
        if (! $assessment->auto_sync_mastery) {
            return;
        }

        $assessment->loadMissing(['topics', 'scores']);

        if ($assessment->topics->isEmpty()) {
            return;
        }

        $maxScore = (float) $assessment->max_score;
        $passingScore = (float) $assessment->passing_score;

        if ($maxScore <= 0) {
            return;
        }

        foreach ($assessment->scores as $scoreRecord) {
            if ($scoreRecord->status !== 'present' || $scoreRecord->score === null) {
                continue;
            }

            $numericScore = (float) $scoreRecord->score;
            $percentage = ($numericScore / $maxScore) * 100;

            // Determine mastery level
            if ($percentage >= 85.0) {
                $masteryLevel = 'mastered';
            } elseif ($numericScore >= $passingScore) {
                $masteryLevel = 'not_evaluated';
            } else {
                $masteryLevel = 'needs_reinforcement';
            }

            foreach ($assessment->topics as $topic) {
                $existing = StudentTopicProgress::where('student_id', $scoreRecord->student_id)
                    ->where('course_topic_id', $topic->id)
                    ->latest()
                    ->first();

                $note = "Evaluación: {$assessment->title} ({$numericScore}/{$maxScore})";

                if ($existing) {
                    $existing->update([
                        'coverage_status' => 'explained',
                        'mastery_level' => $masteryLevel,
                        'evaluated_at' => now(),
                        'evaluation_notes' => $note,
                    ]);
                } else {
                    StudentTopicProgress::create([
                        'student_id' => $scoreRecord->student_id,
                        'course_topic_id' => $topic->id,
                        'coverage_status' => 'explained',
                        'mastery_level' => $masteryLevel,
                        'evaluated_at' => now(),
                        'evaluation_notes' => $note,
                    ]);
                }
            }
        }
    }
}
