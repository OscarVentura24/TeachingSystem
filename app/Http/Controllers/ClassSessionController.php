<?php

namespace App\Http\Controllers;

use App\Models\ClassSession;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\StudentTopicProgress;
use App\Services\InstitutionContext;
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
        protected TopicSuggestionEngine $suggestionEngine,
        protected InstitutionContext $contextService
    ) {}

    /**
     * Display a listing of all class sessions in execution order.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);

        $coursesQuery = Course::query();
        if ($activeInstitutionId) {
            $coursesQuery->where('institution_id', $activeInstitutionId);
            if (!$user->isInstitutionAdmin($activeInstitutionId)) {
                $coursesQuery->where(function ($q) use ($user) {
                    $q->whereHas('teachers', fn($tq) => $tq->where('users.id', $user->id))
                        ->orWhereDoesntHave('teachers');
                });
            }
        } else {
            if (!$user->isSuperAdmin()) {
                $userInstitutionIds = $user->institutions()->pluck('institutions.id')->toArray();
                $coursesQuery->whereIn('institution_id', $userInstitutionIds);
            }
        }

        $accessibleCourses = $coursesQuery->orderBy('name')->get(['id', 'name', 'section', 'code', 'institution_id']);
        $accessibleCourseIds = $accessibleCourses->pluck('id')->toArray();

        $sessionsQuery = ClassSession::whereIn('course_id', $accessibleCourseIds)
            ->with([
                'course:id,name,section,code,institution_id,academic_period_id',
                'course.institution:id,name',
                'course.academicPeriod:id,name',
                'topics:id,course_id,title,unit_title',
                'attendances.student:id,first_name,last_name,student_id_number',
                'createdBy:id,name',
            ]);

        // Filters
        if ($request->filled('course_id')) {
            $sessionsQuery->where('course_id', $request->input('course_id'));
        }

        if ($request->filled('status')) {
            $sessionsQuery->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $sessionsQuery->where(function ($q) use ($term) {
                $q->where('title', 'like', $term)
                    ->orWhere('notes', 'like', $term)
                    ->orWhereHas('course', fn($cq) => $cq->where('name', 'like', $term))
                    ->orWhereHas('topics', fn($tq) => $tq->where('title', 'like', $term))
                    ->orWhereHas('attendances.student', fn($sq) => $sq->where('first_name', 'like', $term)->orWhere('last_name', 'like', $term));
            });
        }

        $sortDirection = $request->input('direction', 'desc') === 'asc' ? 'asc' : 'desc';
        $sessions = $sessionsQuery->orderBy('session_date', $sortDirection)
            ->orderBy('id', $sortDirection)
            ->get();

        return Inertia::render('sessions/index', [
            'sessions' => $sessions,
            'courses' => $accessibleCourses,
            'filters' => [
                'search' => $request->input('search', ''),
                'course_id' => $request->input('course_id', ''),
                'status' => $request->input('status', ''),
                'direction' => $sortDirection,
            ],
        ]);
    }

    /**
     * Show the form for creating a new class session with live topic suggestion.
     */
    public function create(Request $request, Course $course): Response
    {
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar sesiones en este curso.');
        }

        $course->load([
            'students' => function ($query) {
                $query->orderBy('last_name')->orderBy('first_name');
            },
            'courseTopics' => function ($query) {
                $query->whereNull('parent_id')
                    ->orderBy('sort_order')
                    ->with('subtopics');
            },
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
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar este curso.');
        }

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
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar sesiones en este curso.');
        }
        $validated = $request->validate([
            'session_date' => ['required', 'date'],
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:draft,completed,cancelled'],
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
            if ($validated['status'] === 'completed') {
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
            }
        });

        return redirect()->route('courses.show', $course)
            ->with('success', 'Sesión de clase registrada y acreditada exitosamente.');
    }

    /**
     * Show the form for editing an existing class session.
     */
    public function edit(Request $request, Course $course, ClassSession $session): Response
    {
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar sesiones en este curso.');
        }

        if ($session->course_id !== $course->id) {
            abort(404);
        }

        $course->load([
            'students' => function ($query) {
                $query->orderBy('last_name')->orderBy('first_name');
            },
            'courseTopics' => function ($query) {
                $query->whereNull('parent_id')
                    ->orderBy('sort_order')
                    ->with('subtopics');
            },
        ]);

        $session->load([
            'topics:id,title,unit_title',
            'attendances.student:id,first_name,last_name,student_id_number,preferred_workstation',
        ]);

        return Inertia::render('sessions/edit', [
            'course' => $course,
            'session' => $session,
            'students' => $course->students,
            'courseTopics' => $course->courseTopics,
        ]);
    }

    /**
     * Update an existing class session and recalculate accreditation.
     */
    public function update(Request $request, Course $course, ClassSession $session): RedirectResponse
    {
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar sesiones en este curso.');
        }

        if ($session->course_id !== $course->id) {
            abort(404);
        }

        $validated = $request->validate([
            'session_date' => ['required', 'date'],
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:draft,completed,cancelled'],
            'topic_ids' => ['required', 'array', 'min:1'],
            'topic_ids.*' => ['integer', 'exists:course_topics,id'],
            'attendances' => ['required', 'array', 'min:1'],
            'attendances.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'attendances.*.workstation' => ['nullable', 'string', 'max:50'],
            'attendances.*.notes' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($validated, $session) {
            // 1. Update session details
            $session->update([
                'session_date' => $validated['session_date'],
                'title' => $validated['title'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => $validated['status'],
            ]);

            // 2. Sync Topics
            $session->topics()->sync($validated['topic_ids']);

            // 3. Sync Attendances
            $session->attendances()->delete();
            foreach ($validated['attendances'] as $att) {
                $session->attendances()->create([
                    'student_id' => $att['student_id'],
                    'workstation' => $att['workstation'] ?? null,
                    'notes' => $att['notes'] ?? null,
                ]);
            }

            // 4. Update Student Progress
            $session->progressRecords()->delete();
            if ($validated['status'] === 'completed') {
                foreach ($validated['attendances'] as $att) {
                    $studentId = $att['student_id'];
                    foreach ($validated['topic_ids'] as $topicId) {
                        StudentTopicProgress::updateOrCreate(
                            [
                                'class_session_id' => $session->id,
                                'student_id' => $studentId,
                                'course_topic_id' => $topicId,
                            ],
                            [
                                'coverage_status' => 'explained',
                                'mastery_level' => 'not_evaluated',
                            ]
                        );
                    }
                }
            }
        });

        return redirect()->route('courses.show', $course)
            ->with('success', 'Sesión de clase actualizada exitosamente.');
    }

    /**
     * Quick status update for a session.
     */
    public function updateStatus(Request $request, Course $course, ClassSession $session): RedirectResponse
    {
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar este curso.');
        }

        if ($session->course_id !== $course->id) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:draft,completed,cancelled'],
        ]);

        DB::transaction(function () use ($session, $validated) {
            $session->update(['status' => $validated['status']]);

            if ($validated['status'] === 'completed') {
                $topicIds = $session->topics()->pluck('course_topics.id');
                $studentIds = $session->attendances()->pluck('student_id');

                foreach ($studentIds as $studentId) {
                    foreach ($topicIds as $topicId) {
                        StudentTopicProgress::updateOrCreate(
                            [
                                'class_session_id' => $session->id,
                                'student_id' => $studentId,
                                'course_topic_id' => $topicId,
                            ],
                            [
                                'coverage_status' => 'explained',
                                'mastery_level' => 'not_evaluated',
                            ]
                        );
                    }
                }
            } elseif ($validated['status'] === 'cancelled') {
                $session->progressRecords()->delete();
            }
        });

        $statusLabels = [
            'completed' => 'Completada',
            'draft' => 'Borrador',
            'cancelled' => 'Cancelada',
        ];

        return back()->with('success', 'Estado de la sesión actualizado a "' . ($statusLabels[$validated['status']] ?? $validated['status']) . '".');
    }

    /**
     * Direct quick status update without course prefix in route.
     */
    public function updateStatusDirect(Request $request, ClassSession $session): RedirectResponse
    {
        return $this->updateStatus($request, $session->course, $session);
    }

    /**
     * Delete a class session and clean up progress records.
     */
    public function destroy(Request $request, Course $course, ClassSession $session): RedirectResponse
    {
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para eliminar sesiones en este curso.');
        }

        if ($session->course_id !== $course->id) {
            abort(404);
        }

        DB::transaction(function () use ($session) {
            $session->progressRecords()->delete();
            $session->attendances()->delete();
            $session->topics()->detach();
            $session->delete();
        });

        return back()->with('success', 'Sesión de clase eliminada correctamente.');
    }

    /**
     * Direct delete without course prefix in route.
     */
    public function destroyDirect(Request $request, ClassSession $session): RedirectResponse
    {
        return $this->destroy($request, $session->course, $session);
    }
}
