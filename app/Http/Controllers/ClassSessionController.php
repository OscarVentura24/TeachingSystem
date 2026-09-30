<?php

namespace App\Http\Controllers;

use App\Models\ClassSession;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\StudentTopicProgress;
use App\Services\TopicSuggestionEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClassSessionController extends Controller
{
    public function __construct(
        protected TopicSuggestionEngine $suggestionEngine
    ) {}

    /**
     * Show the form for creating a new class session with live topic suggestion.
     */
    public function create(Course $course): Response
    {
        $course->load([
            'students' => function ($query) {
                $query->orderBy('last_name')->orderBy('first_name');
            },
            'courseTopics',
        ]);

        return Inertia::render('sessions/create', [
            'course' => $course,
            'students' => $course->students,
            'courseTopics' => $course->courseTopics,
        ]);
    }

    /**
     * Compute live deterministic topic suggestion for selected present students.
     */
    public function suggestTopic(Request $request, Course $course): JsonResponse
    {
        $request->validate([
            'student_ids' => ['present', 'array'],
            'student_ids.*' => ['integer', 'exists:students,id'],
        ]);

        $presentStudentIds = $request->input('student_ids', []);

        $result = $this->suggestionEngine->suggest($course, $presentStudentIds);

        return response()->json($result);
    }

    /**
     * Store a newly created class session with atomic attendance & progress accreditation.
     */
    public function store(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'session_date' => ['required', 'date'],
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:draft,completed'],
            'topic_ids' => ['required', 'array', 'min:1'],
            'topic_ids.*' => ['integer', 'exists:course_topics,id'],
            'attendances' => ['required', 'array', 'min:1'],
            'attendances.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'attendances.*.workstation' => ['nullable', 'string', 'max:50'],
            'attendances.*.notes' => ['nullable', 'string'],
            // Optional individual topic exclusions or mastery overrides
            'progress_overrides' => ['nullable', 'array'],
            'progress_overrides.*.student_id' => ['required', 'integer'],
            'progress_overrides.*.course_topic_id' => ['required', 'integer'],
            'progress_overrides.*.coverage_status' => ['required', 'in:explained,pending'],
            'progress_overrides.*.mastery_level' => ['nullable', 'in:not_evaluated,needs_reinforcement,mastered'],
        ]);

        DB::transaction(function () use ($validated, $course, $request) {
            // 1. Create Class Session
            $session = ClassSession::create([
                'course_id' => $course->id,
                'created_by_user_id' => $request->user()->id,
                'session_date' => $validated['session_date'],
                'title' => $validated['title'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => $validated['status'],
            ]);

            // 2. Attach Session Topics
            $session->topics()->sync($validated['topic_ids']);

            // 3. Register Attendances
            foreach ($validated['attendances'] as $att) {
                $session->attendances()->create([
                    'student_id' => $att['student_id'],
                    'workstation' => $att['workstation'] ?? null,
                    'notes' => $att['notes'] ?? null,
                ]);
            }

            // 4. Register Student Topic Progress (Accreditation)
            // By default, every present student gets 'explained' for all session topics,
            // unless overridden by specific exceptions.
            $overridesMap = [];
            if (! empty($validated['progress_overrides'])) {
                foreach ($validated['progress_overrides'] as $po) {
                    $key = "{$po['student_id']}_{$po['course_topic_id']}";
                    $overridesMap[$key] = $po;
                }
            }

            foreach ($validated['attendances'] as $att) {
                $studentId = $att['student_id'];

                foreach ($validated['topic_ids'] as $topicId) {
                    $overrideKey = "{$studentId}_{$topicId}";
                    $override = $overridesMap[$overrideKey] ?? null;

                    $coverageStatus = $override['coverage_status'] ?? 'explained';
                    $masteryLevel = $override['mastery_level'] ?? 'not_evaluated';

                    StudentTopicProgress::updateOrCreate(
                        [
                            'class_session_id' => $session->id,
                            'student_id' => $studentId,
                            'course_topic_id' => $topicId,
                        ],
                        [
                            'coverage_status' => $coverageStatus,
                            'mastery_level' => $masteryLevel,
                            'evaluated_at' => ($masteryLevel !== 'not_evaluated' ? now() : null),
                        ]
                    );
                }
            }
        });

        return redirect()->route('courses.show', $course)
            ->with('success', 'Sesión de clase registrada y acreditada exitosamente.');
    }
}
