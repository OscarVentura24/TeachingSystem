<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PensumDuplicationService
{
    /**
     * Get candidate courses from which the target course can duplicate its pensum,
     * sorted and enriched with intelligent matching recommendations.
     */
    public function getCandidateSourceCourses(Course $targetCourse, ?User $user = null): Collection
    {
        $courses = Course::where('institution_id', $targetCourse->institution_id)
            ->where('id', '!=', $targetCourse->id)
            ->whereHas('courseTopics')
            ->with([
                'academicPeriod:id,name,is_current,is_closed,start_date',
                'courseTopics' => function ($q) {
                    $q->whereNull('parent_id')
                        ->orderBy('sort_order')
                        ->with(['subtopics' => function ($sq) {
                            $sq->orderBy('sort_order');
                        }]);
                },
            ])
            ->withCount(['courseTopics'])
            ->get();

        $targetName = mb_strtolower(trim($targetCourse->name));
        $targetCode = $targetCourse->code ? mb_strtolower(trim($targetCourse->code)) : null;

        return $courses->map(function ($source) use ($targetName, $targetCode) {
            $sourceName = mb_strtolower(trim($source->name));
            $sourceCode = $source->code ? mb_strtolower(trim($source->code)) : null;

            $score = 0;
            $matchReason = null;

            if ($targetCode && $sourceCode && $targetCode === $sourceCode) {
                $score += 100;
                $matchReason = 'Mismo código de asignatura (' . $source->code . ')';
            } elseif ($targetName === $sourceName) {
                $score += 80;
                if ($source->academic_period_id !== $targetCourse->academic_period_id && $source->academicPeriod) {
                    $matchReason = 'Mismo curso del período anterior (' . $source->academicPeriod->name . ')';
                } else {
                    $matchReason = 'Mismo nombre de materia (' . $source->name . ')';
                }
            } elseif (str_contains($sourceName, $targetName) || str_contains($targetName, $sourceName)) {
                $score += 50;
                $matchReason = 'Nombre de materia muy similar';
            }

            // Bonus for recent / current periods
            if ($source->academicPeriod?->is_current) {
                $score += 10;
            }

            // Units count (distinct unit_titles)
            $unitTitles = $source->courseTopics->pluck('unit_title')->filter()->unique()->values();

            return [
                'id' => $source->id,
                'name' => $source->name,
                'code' => $source->code,
                'section' => $source->section,
                'academic_period' => $source->academicPeriod ? [
                    'id' => $source->academicPeriod->id,
                    'name' => $source->academicPeriod->name,
                    'is_current' => (bool) $source->academicPeriod->is_current,
                ] : null,
                'topics_count' => (int) $source->course_topics_count,
                'root_topics_count' => $source->courseTopics->count(),
                'units_count' => $unitTitles->count(),
                'units' => $unitTitles->toArray(),
                'is_recommended' => $score >= 50,
                'match_reason' => $matchReason,
                'score' => $score,
                'topics_tree' => $source->courseTopics->map(function ($root) {
                    return [
                        'id' => $root->id,
                        'title' => $root->title,
                        'unit_title' => $root->unit_title,
                        'description' => $root->description,
                        'subtopics_count' => $root->subtopics->count(),
                        'subtopics' => $root->subtopics->map(fn ($sub) => [
                            'id' => $sub->id,
                            'title' => $sub->title,
                            'unit_title' => $sub->unit_title,
                        ])->toArray(),
                    ];
                })->toArray(),
            ];
        })->sort(function ($a, $b) {
            // Sort by recommendation score descending, then by academic period descending
            if ($a['score'] !== $b['score']) {
                return $b['score'] <=> $a['score'];
            }
            return $b['id'] <=> $a['id'];
        })->values();
    }

    /**
     * Get candidate destination courses to which the source course can duplicate its pensum.
     * Only non-read-only courses in the same institution are candidates.
     */
    public function getCandidateTargetCourses(Course $sourceCourse, ?User $user = null): Collection
    {
        $courses = Course::where('institution_id', $sourceCourse->institution_id)
            ->where('id', '!=', $sourceCourse->id)
            ->with([
                'academicPeriod:id,name,is_current,is_closed',
                'courseTopics' => function ($q) {
                    $q->select('id', 'course_id', 'title', 'parent_id');
                },
            ])
            ->withCount(['courseTopics'])
            ->get();

        // Target must not be read-only
        $courses = $courses->filter(fn ($c) => !$c->isReadOnly());

        return $courses->map(function ($target) use ($sourceCourse) {
            $isSamePeriod = $target->academic_period_id === $sourceCourse->academic_period_id;

            return [
                'id' => $target->id,
                'name' => $target->name,
                'code' => $target->code,
                'section' => $target->section,
                'academic_period' => $target->academicPeriod ? [
                    'id' => $target->academicPeriod->id,
                    'name' => $target->academicPeriod->name,
                    'is_current' => (bool) $target->academicPeriod->is_current,
                ] : null,
                'topics_count' => (int) $target->course_topics_count,
                'is_same_period' => $isSamePeriod,
                'existing_titles' => $target->courseTopics->pluck('title')->map(fn ($t) => mb_strtolower(trim($t)))->values()->toArray(),
            ];
        })->sort(function ($a, $b) {
            if ($a['is_same_period'] !== $b['is_same_period']) {
                return $b['is_same_period'] <=> $a['is_same_period'];
            }
            return strcmp($a['name'], $b['name']);
        })->values();
    }

    /**
     * Duplicate pensum from source course to target course according to chosen strategy.
     *
     * @param Course $sourceCourse Course containing topics to copy
     * @param Course $targetCourse Destination course
     * @param array $options Options: mode ('replace', 'merge', 'selected'), selected_topic_ids (array)
     * @return array Summary of duplicated topics
     */
    public function duplicatePensum(Course $sourceCourse, Course $targetCourse, array $options = []): array
    {
        if ($sourceCourse->id === $targetCourse->id) {
            throw new InvalidArgumentException('El curso de origen y el curso de destino no pueden ser el mismo.');
        }

        if ($sourceCourse->institution_id !== $targetCourse->institution_id) {
            throw new InvalidArgumentException('Ambos cursos deben pertenecer a la misma institución.');
        }

        $mode = $options['mode'] ?? 'merge'; // 'replace', 'merge', or 'selected'
        $selectedTopicIds = $options['selected_topic_ids'] ?? [];

        return DB::transaction(function () use ($sourceCourse, $targetCourse, $mode, $selectedTopicIds) {
            // If replace mode, delete all existing topics in target course
            if ($mode === 'replace') {
                $targetCourse->courseTopics()->delete();
                $existingTitlesNormalized = [];
                $currentSortOrder = 0;
            } else {
                // If merge or selected mode, collect existing titles normalized to prevent duplicates
                $existingTitlesNormalized = $targetCourse->courseTopics()
                    ->pluck('title')
                    ->map(fn ($t) => mb_strtolower(trim($t)))
                    ->toArray();

                $currentSortOrder = (int) ($targetCourse->courseTopics()->max('sort_order') ?? 0);
            }

            // Query root topics from source course
            $query = CourseTopic::where('course_id', $sourceCourse->id)
                ->whereNull('parent_id')
                ->orderBy('sort_order')
                ->with(['subtopics' => function ($sq) {
                    $sq->orderBy('sort_order');
                }]);

            if ($mode === 'selected' && !empty($selectedTopicIds)) {
                $query->whereIn('id', $selectedTopicIds);
            }

            $sourceRoots = $query->get();

            $importedRootsCount = 0;
            $importedSubtopicsCount = 0;
            $skippedCount = 0;

            foreach ($sourceRoots as $root) {
                $normalizedTitle = mb_strtolower(trim($root->title));

                // If in merge mode and title already exists in target course, skip root to prevent duplication
                if ($mode === 'merge' && in_array($normalizedTitle, $existingTitlesNormalized, true)) {
                    $skippedCount++;
                    continue;
                }

                $currentSortOrder++;

                $newRoot = $targetCourse->courseTopics()->create([
                    'topic_id' => $root->topic_id,
                    'title' => $root->title,
                    'unit_title' => $root->unit_title,
                    'description' => $root->description,
                    'sort_order' => $currentSortOrder,
                    'is_required' => $root->is_required ?? true,
                ]);

                $importedRootsCount++;
                $existingTitlesNormalized[] = $normalizedTitle;

                // Clone subtopics under this root
                if ($root->subtopics && $root->subtopics->isNotEmpty()) {
                    $subOrder = 0;
                    foreach ($root->subtopics as $sub) {
                        $subOrder++;
                        $targetCourse->courseTopics()->create([
                            'parent_id' => $newRoot->id,
                            'topic_id' => $sub->topic_id,
                            'title' => $sub->title,
                            'unit_title' => $sub->unit_title,
                            'description' => $sub->description,
                            'sort_order' => $subOrder,
                            'is_required' => $sub->is_required ?? true,
                        ]);
                        $importedSubtopicsCount++;
                    }
                }
            }

            return [
                'imported_roots' => $importedRootsCount,
                'imported_subtopics' => $importedSubtopicsCount,
                'total_imported' => $importedRootsCount + $importedSubtopicsCount,
                'skipped_duplicates' => $skippedCount,
                'mode' => $mode,
            ];
        });
    }
}
