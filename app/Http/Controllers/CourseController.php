<?php

namespace App\Http\Controllers;

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Enrollment;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\InstitutionContext;
use App\Services\PensumDuplicationService;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    public function __construct(
        protected InstitutionContext $contextService,
        protected PensumDuplicationService $pensumDuplicationService,
    ) {}

    /**
     * Display a listing of courses.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);

        $coursesQuery = Course::with(['institution', 'academicPeriod', 'teachers'])
            ->withCount(['students', 'courseTopics', 'sessions']);

        if ($activeInstitutionId) {
            $coursesQuery->where('institution_id', $activeInstitutionId);

            // If user is not an admin of this institution, restrict to their assigned courses
            if (!$user->isInstitutionAdmin($activeInstitutionId)) {
                $coursesQuery->where(function ($q) use ($user) {
                    $q->whereHas('teachers', function ($tq) use ($user) {
                        $tq->where('users.id', $user->id);
                    })->orWhereDoesntHave('teachers');
                });
            }
        } else {
            // Global view: if not super admin, restrict to user's institutions
            if (!$user->isSuperAdmin()) {
                $userInstitutionIds = $user->institutions()->pluck('institutions.id')->toArray();
                $coursesQuery->whereIn('institution_id', $userInstitutionIds);
            }
        }

        $academicPeriodsQuery = AcademicPeriod::query();
        if ($activeInstitutionId) {
            $academicPeriodsQuery->where('institution_id', $activeInstitutionId);
        }
        $academicPeriods = $academicPeriodsQuery->orderByDesc('is_current')->orderByDesc('id')->get();

        // Academic period filtering
        $selectedPeriodId = $request->input('academic_period_id');
        if ($selectedPeriodId === 'all') {
            // Do not filter by period, show all
        } elseif ($selectedPeriodId) {
            $coursesQuery->where('academic_period_id', $selectedPeriodId);
        } else {
            // Default: if there's a current period, default to it; otherwise show all
            $currentPeriod = $academicPeriods->firstWhere('is_current', true);
            if ($currentPeriod) {
                $coursesQuery->where('academic_period_id', $currentPeriod->id);
                $selectedPeriodId = (string) $currentPeriod->id;
            } else {
                $selectedPeriodId = 'all';
            }
        }

        $courses = $coursesQuery
            ->with(['academicPeriod', 'teachers', 'students' => function ($q) {
                $q->select('students.id', 'students.first_name', 'students.last_name', 'students.student_id_number')
                  ->withPivot('status', 'preferred_workstation')
                  ->orderBy('last_name')
                  ->orderBy('first_name');
            }])
            ->withCount(['students', 'courseTopics', 'sessions'])
            ->latest()
            ->get();

        $institutions = $this->contextService->getAvailableInstitutions($user);
        $activeInstitution = $activeInstitutionId ? Institution::find($activeInstitutionId) : null;

        return Inertia::render('courses/index', [
            'courses' => $courses,
            'institutions' => $institutions,
            'academicPeriods' => $academicPeriods,
            'activeInstitution' => $activeInstitution,
            'selectedPeriodId' => $selectedPeriodId,
            'isInstitutionAdmin' => $activeInstitutionId ? $user->isInstitutionAdmin($activeInstitutionId) : $user->isSuperAdmin(),
        ]);
    }

    /**
     * Store a newly created course in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);

        $validated = $request->validate([
            'institution_id' => [$activeInstitutionId ? 'nullable' : 'required', 'exists:institutions,id'],
            'academic_period_id' => ['nullable', 'exists:academic_periods,id'],
            'name' => ['required', 'string', 'max:255'],
            'section' => ['nullable', 'string', 'max:50'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $institutionId = $validated['institution_id'] ?? $activeInstitutionId;
        if (!$institutionId) {
            return back()->withErrors(['institution_id' => 'Debes seleccionar una institución.']);
        }

        $course = Course::create([
            ...$validated,
            'institution_id' => $institutionId,
        ]);

        // Assign current user as primary teacher
        $course->teachers()->attach($request->user()->id, ['is_primary' => true]);

        return redirect()->route('courses.show', $course)
            ->with('success', 'Curso creado exitosamente.');
    }

    /**
     * Display the specified course with its syllabus, students, and coverage matrix.
     */
    public function show(Request $request, Course $course): Response
    {
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para acceder a este curso.');
        }

        $course->load([
            'institution',
            'academicPeriod',
            'teachers',
            'courseTopics' => function ($query) {
                $query->whereNull('parent_id')
                    ->orderBy('sort_order')
                    ->with('subtopics');
            },
            'students' => function ($query) use ($course) {
                if (!$course->isReadOnly()) {
                    $query->wherePivotIn('status', ['active', 'repeated']);
                }
                $query->orderBy('last_name')->orderBy('first_name');
            },
            'sessions' => function ($query) {
                $query->with([
                    'topics',
                    'attendances.student',
                    'createdBy:id,name',
                ])->orderByDesc('session_date')->orderByDesc('id');
            },
            'assessments' => function ($query) {
                $query->with([
                    'topics:id,title,unit_title',
                    'scores',
                    'createdBy:id,name',
                ])->orderBy('assessment_date')->orderBy('id');
            },
        ]);

        // Load progress records for matrix (for all topics and subtopics in this course)
        $allCourseTopicIds = CourseTopic::where('course_id', $course->id)->pluck('id');
        $progressRecords = StudentTopicProgress::whereIn('course_topic_id', $allCourseTopicIds)
            ->get()
            ->groupBy('student_id');

        // Topics available to add to pensum: global topics OR topics belonging to this course's institution
        $globalTopics = Topic::where('is_active', true)
            ->whereNull('parent_id')
            ->where(function ($q) use ($course) {
                $q->where('is_global', true)
                  ->orWhere('institution_id', $course->institution_id);
            })
            ->with(['prerequisites', 'subject', 'subtopics'])
            ->orderBy('area')
            ->orderBy('title')
            ->get();

        // Teachers in the institution for assignment
        $availableTeachers = User::whereHas('institutionMemberships', function ($q) use ($course) {
            $q->where('institution_id', $course->institution_id)
              ->where('is_active', true);
        })->get(['id', 'name', 'email']);

        // Active students enrolled in this institution (available for course enrollment)
        $institutionStudents = Student::where('institution_id', $course->institution_id)
            ->where('is_active', true)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['id', 'institution_id', 'first_name', 'last_name', 'student_id_number', 'email']);

        $canManageTeachers = $request->user()->isInstitutionAdmin($course->institution_id) ||
            $course->teachers()->where('users.id', $request->user()->id)->wherePivot('is_primary', true)->exists();

        $candidateSourceCourses = $this->pensumDuplicationService->getCandidateSourceCourses($course, $request->user());

        return Inertia::render('courses/show', [
            'course' => $course,
            'progressByStudent' => $progressRecords,
            'globalTopics' => $globalTopics,
            'availableTeachers' => $availableTeachers,
            'institutionStudents' => $institutionStudents,
            'canManageTeachers' => $canManageTeachers,
            'candidateSourceCourses' => $candidateSourceCourses,
        ]);
    }

    /**
     * Duplicate or merge pensum topics from another course intelligently.
     */
    public function clonePensum(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para modificar el pensum de este curso.');
        }

        $validated = $request->validate([
            'source_course_id' => ['required', 'integer', 'exists:courses,id'],
            'mode' => ['required', 'string', 'in:replace,merge,selected'],
            'selected_topic_ids' => ['nullable', 'array'],
            'selected_topic_ids.*' => ['integer', 'exists:course_topics,id'],
        ]);

        $sourceCourse = Course::findOrFail($validated['source_course_id']);

        $result = $this->pensumDuplicationService->duplicatePensum(
            $sourceCourse,
            $course,
            [
                'mode' => $validated['mode'],
                'selected_topic_ids' => $validated['selected_topic_ids'] ?? [],
            ]
        );

        $msg = "Se importaron exitosamente {$result['total_imported']} temas y subtemas desde el pensum de '{$sourceCourse->name}'.";
        if ($result['skipped_duplicates'] > 0) {
            $msg .= " ({$result['skipped_duplicates']} temas omitidos por estar ya presentes).";
        }

        return back()->with('success', $msg);
    }

    /**
     * Add a topic from the global bank (or custom) into the course pensum.
     */
    public function addTopic(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        $validated = $request->validate([
            'topic_id' => ['nullable', 'exists:topics,id'],
            'parent_id' => ['nullable', 'exists:course_topics,id'],
            'title' => ['required', 'string', 'max:255'],
            'unit_title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $parentId = $validated['parent_id'] ?? null;
        if ($parentId) {
            $parent = CourseTopic::where('course_id', $course->id)->findOrFail($parentId);
            if ($parent->parent_id !== null) {
                return back()->withErrors(['parent_id' => 'Solo se permite 1 nivel de subtemas.']);
            }
        }

        $topic = null;
        if (!empty($validated['topic_id'])) {
            $topic = Topic::with('subtopics')->find($validated['topic_id']);
            if (!$topic || (!$topic->is_global && $topic->institution_id !== $course->institution_id)) {
                abort(403, 'El tema seleccionado no pertenece al catálogo disponible para esta institución.');
            }
        }

        $nextSortOrder = ($course->courseTopics()->where('parent_id', $parentId)->max('sort_order') ?? 0) + 1;

        $newCourseTopic = $course->courseTopics()->create([
            'topic_id' => $validated['topic_id'] ?? null,
            'parent_id' => $parentId,
            'title' => $validated['title'],
            'unit_title' => $validated['unit_title'] ?? null,
            'description' => $validated['description'] ?? null,
            'sort_order' => $nextSortOrder,
            'is_required' => true,
        ]);

        // If importing a parent topic from the bank that has subtopics, automatically import them as well
        if ($topic && !$parentId && $topic->subtopics->isNotEmpty()) {
            foreach ($topic->subtopics as $subIndex => $sub) {
                $course->courseTopics()->create([
                    'topic_id' => $sub->id,
                    'parent_id' => $newCourseTopic->id,
                    'title' => $sub->title,
                    'unit_title' => $sub->unit_title ?? $newCourseTopic->unit_title,
                    'description' => $sub->description,
                    'sort_order' => $subIndex + 1,
                    'is_required' => true,
                ]);
            }
        }

        return back()->with('success', $parentId ? 'Subtema agregado al pensum.' : 'Tema agregado al pensum.');
    }

    /**
     * Bulk import multiple topics from the global/institutional bank into the course pensum.
     */
    public function bulkAddTopics(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        $validated = $request->validate([
            'topic_ids' => ['required', 'array', 'min:1'],
            'topic_ids.*' => ['integer', 'exists:topics,id'],
        ]);

        $topicsToImport = Topic::whereIn('id', $validated['topic_ids'])
            ->where('is_active', true)
            ->whereNull('parent_id')
            ->where(function ($q) use ($course) {
                $q->where('is_global', true)
                  ->orWhere('institution_id', $course->institution_id);
            })
            ->with(['subtopics' => fn($q) => $q->orderBy('sort_order')->orderBy('id')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if ($topicsToImport->isEmpty()) {
            return back()->withErrors(['topic_ids' => 'Ninguno de los temas seleccionados está disponible para importar en este curso.']);
        }

        $existingTopicIds = $course->courseTopics()
            ->whereNotNull('topic_id')
            ->pluck('topic_id')
            ->toArray();

        $importedCount = 0;
        $currentSortOrder = $course->courseTopics()->whereNull('parent_id')->max('sort_order') ?? 0;

        DB::transaction(function () use ($course, $topicsToImport, $existingTopicIds, &$importedCount, &$currentSortOrder) {
            foreach ($topicsToImport as $topic) {
                if (in_array($topic->id, $existingTopicIds)) {
                    continue;
                }

                $currentSortOrder++;
                $newCourseTopic = $course->courseTopics()->create([
                    'topic_id' => $topic->id,
                    'parent_id' => null,
                    'title' => $topic->title,
                    'unit_title' => $topic->unit_title,
                    'description' => $topic->description,
                    'sort_order' => $currentSortOrder,
                    'is_required' => true,
                ]);
                $importedCount++;

                // If the topic has child subtopics, import them as well
                if ($topic->subtopics->isNotEmpty()) {
                    foreach ($topic->subtopics as $subIndex => $sub) {
                        $course->courseTopics()->create([
                            'topic_id' => $sub->id,
                            'parent_id' => $newCourseTopic->id,
                            'title' => $sub->title,
                            'unit_title' => $sub->unit_title ?? $newCourseTopic->unit_title,
                            'description' => $sub->description,
                            'sort_order' => $sub->sort_order ?: ($subIndex + 1),
                            'is_required' => true,
                        ]);
                    }
                }
            }
        });

        return back()->with('success', "Se importaron {$importedCount} temas al pensum del curso exitosamente.");
    }

    /**
     * Synchronize all linked topics in the course pensum with the topics bank.
     * Preserves sort_order and existing positions in the syllabus.
     */
    public function syncTopics(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para modificar el pensum de este curso.');
        }

        $courseTopics = $course->courseTopics()
            ->whereNull('parent_id')
            ->whereNotNull('topic_id')
            ->with('subtopics')
            ->get();

        if ($courseTopics->isEmpty()) {
            return back()->with('info', 'No hay temas vinculados al banco global para actualizar.');
        }

        $bankTopicIds = $courseTopics->pluck('topic_id')->filter()->unique();
        $bankTopics = Topic::whereIn('id', $bankTopicIds)
            ->with(['subtopics' => fn($q) => $q->orderBy('sort_order')->orderBy('id')])
            ->get()
            ->keyBy('id');

        $updatedCount = 0;

        DB::transaction(function () use ($courseTopics, $bankTopics, &$updatedCount) {
            foreach ($courseTopics as $ct) {
                $bankTopic = $bankTopics->get($ct->topic_id);
                if ($bankTopic) {
                    if ($this->syncCourseTopicRecord($ct, $bankTopic)) {
                        $updatedCount++;
                    }
                }
            }
        });

        return back()->with('success', $updatedCount > 0
            ? "Se actualizaron {$updatedCount} tema(s) desde el banco global sin alterar el orden del pensum."
            : 'Todos los temas vinculados ya están actualizados con el banco global.');
    }

    /**
     * Synchronize a single course topic (and its subtopics) with the topics bank.
     */
    public function syncSingleTopic(Request $request, Course $course, CourseTopic $courseTopic): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para modificar el pensum de este curso.');
        }

        if ($courseTopic->course_id !== $course->id) {
            abort(404);
        }

        if (!$courseTopic->topic_id) {
            return back()->withErrors(['topic' => 'Este tema fue creado manualmente y no está vinculado al banco de temas.']);
        }

        $bankTopic = Topic::with(['subtopics' => fn($q) => $q->orderBy('sort_order')->orderBy('id')])
            ->find($courseTopic->topic_id);

        if (!$bankTopic) {
            return back()->withErrors(['topic' => 'El tema de origen ya no existe en el banco de temas.']);
        }

        DB::transaction(function () use ($courseTopic, $bankTopic) {
            if ($courseTopic->parent_id !== null) {
                $courseTopic->update([
                    'title' => $bankTopic->title,
                    'unit_title' => $bankTopic->unit_title ?? $courseTopic->unit_title,
                    'description' => $bankTopic->description,
                ]);
            } else {
                $this->syncCourseTopicRecord($courseTopic, $bankTopic);
            }
        });

        return back()->with('success', "Tema \"{$courseTopic->title}\" actualizado desde el banco global.");
    }

    /**
     * Helper to synchronize a CourseTopic and its subtopics from a bank Topic.
     * Preserves sort_order and existing sequence.
     */
    protected function syncCourseTopicRecord(CourseTopic $courseTopic, ?Topic $bankTopic = null): bool
    {
        if (!$courseTopic->topic_id) {
            return false;
        }

        $bankTopic = $bankTopic ?: Topic::with(['subtopics' => fn($q) => $q->orderBy('sort_order')->orderBy('id')])
            ->find($courseTopic->topic_id);

        if (!$bankTopic) {
            return false;
        }

        $updated = false;

        $changes = [];
        if ($courseTopic->title !== $bankTopic->title) {
            $changes['title'] = $bankTopic->title;
        }
        if ($courseTopic->unit_title !== $bankTopic->unit_title) {
            $changes['unit_title'] = $bankTopic->unit_title;
        }
        if ($courseTopic->description !== $bankTopic->description) {
            $changes['description'] = $bankTopic->description;
        }

        if (!empty($changes)) {
            $courseTopic->update($changes);
            $updated = true;
        }

        // Subtopics sync
        if ($bankTopic->subtopics && $bankTopic->subtopics->isNotEmpty()) {
            $existingCourseSubtopics = $courseTopic->subtopics()->get();
            $existingSubtopicsByTopicId = $existingCourseSubtopics->whereNotNull('topic_id')->keyBy('topic_id');
            $maxSortOrder = $existingCourseSubtopics->max('sort_order') ?? 0;

            foreach ($bankTopic->subtopics as $bankSubtopic) {
                if ($existingSubtopicsByTopicId->has($bankSubtopic->id)) {
                    $existingSub = $existingSubtopicsByTopicId->get($bankSubtopic->id);
                    $subChanges = [];
                    if ($existingSub->title !== $bankSubtopic->title) {
                        $subChanges['title'] = $bankSubtopic->title;
                    }
                    $targetUnit = $bankSubtopic->unit_title ?? $bankTopic->unit_title;
                    if ($existingSub->unit_title !== $targetUnit) {
                        $subChanges['unit_title'] = $targetUnit;
                    }
                    if ($existingSub->description !== $bankSubtopic->description) {
                        $subChanges['description'] = $bankSubtopic->description;
                    }
                    if (!empty($subChanges)) {
                        $existingSub->update($subChanges);
                        $updated = true;
                    }
                } else {
                    $maxSortOrder++;
                    $courseTopic->course->courseTopics()->create([
                        'course_id' => $courseTopic->course_id,
                        'topic_id' => $bankSubtopic->id,
                        'parent_id' => $courseTopic->id,
                        'title' => $bankSubtopic->title,
                        'unit_title' => $bankSubtopic->unit_title ?? $bankTopic->unit_title,
                        'description' => $bankSubtopic->description,
                        'sort_order' => $bankSubtopic->sort_order ?: $maxSortOrder,
                        'is_required' => true,
                    ]);
                    $updated = true;
                }
            }
        }

        return $updated;
    }

    /**
     * Reorder topics in the course pensum.
     */
    public function reorderTopics(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        $validated = $request->validate([
            'topic_ids' => ['required', 'array'],
            'topic_ids.*' => ['integer', 'exists:course_topics,id'],
        ]);

        foreach ($validated['topic_ids'] as $index => $topicId) {
            CourseTopic::where('id', $topicId)
                ->where('course_id', $course->id)
                ->update(['sort_order' => $index + 1]);
        }

        return back()->with('success', 'Orden del pensum actualizado.');
    }

    /**
     * Assign a teacher to the course.
     */
    public function addTeacher(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar docentes en este curso.');
        }

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'is_primary' => ['nullable', 'boolean'],
        ]);

        $course->teachers()->syncWithoutDetaching([
            $validated['user_id'] => ['is_primary' => $validated['is_primary'] ?? false],
        ]);

        return back()->with('success', 'Docente asignado al curso.');
    }

    /**
     * Remove a teacher from the course.
     */
    public function removeTeacher(Request $request, Course $course, User $user): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar docentes en este curso.');
        }

        $course->teachers()->detach($user->id);

        return back()->with('success', 'Docente desvinculado del curso.');
    }

    /**
     * Update the specified course.
     */
    public function update(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para editar este curso.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'section' => ['nullable', 'string', 'max:50'],
            'code' => ['nullable', 'string', 'max:50'],
            'academic_period_id' => ['nullable', 'exists:academic_periods,id'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $course->update($validated);

        return back()->with('success', 'Curso actualizado exitosamente.');
    }

    /**
     * Remove the specified course.
     */
    public function destroy(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para eliminar este curso.');
        }

        $course->delete();

        return redirect()->route('courses.index')->with('success', 'Curso eliminado exitosamente.');
    }

    /**
     * Remove a topic from the course pensum.
     */
    public function removeTopic(Request $request, Course $course, CourseTopic $courseTopic): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para modificar el pensum de este curso.');
        }

        if ($courseTopic->course_id !== $course->id) {
            abort(404);
        }

        $courseTopic->delete();

        return back()->with('success', 'Tema retirado del pensum.');
    }

    /**
     * Remove a student enrollment from the course.
     */
    public function removeStudent(Request $request, Course $course, Student $student): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar estudiantes en este curso.');
        }

        Enrollment::where('course_id', $course->id)
            ->where('student_id', $student->id)
            ->delete();

        return back()->with('success', 'Estudiante desmatriculado del curso.');
    }

    /**
     * Update student topic progress directly from coverage matrix.
     */
    public function updateStudentProgress(Request $request, Course $course): RedirectResponse
    {
        $this->ensureCourseNotReadOnly($course);

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar este curso.');
        }

        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'course_topic_id' => ['required', 'integer', 'exists:course_topics,id'],
            'status' => ['required', 'in:explained,needs_reinforcement,pending'],
        ]);

        $courseTopic = CourseTopic::where('course_id', $course->id)
            ->where('id', $validated['course_topic_id'])
            ->firstOrFail();

        $studentId = $validated['student_id'];
        $courseTopicId = $courseTopic->id;
        $status = $validated['status'];

        if ($status === 'pending') {
            StudentTopicProgress::where('student_id', $studentId)
                ->where('course_topic_id', $courseTopicId)
                ->delete();
        } elseif ($status === 'needs_reinforcement') {
            $existing = StudentTopicProgress::where('student_id', $studentId)
                ->where('course_topic_id', $courseTopicId)
                ->latest()
                ->first();

            if ($existing) {
                $existing->update([
                    'coverage_status' => 'explained',
                    'mastery_level' => 'needs_reinforcement',
                    'evaluated_at' => now(),
                ]);
            } else {
                StudentTopicProgress::create([
                    'student_id' => $studentId,
                    'course_topic_id' => $courseTopicId,
                    'coverage_status' => 'explained',
                    'mastery_level' => 'needs_reinforcement',
                    'evaluated_at' => now(),
                ]);
            }
        } else { // 'explained'
            $existing = StudentTopicProgress::where('student_id', $studentId)
                ->where('course_topic_id', $courseTopicId)
                ->latest()
                ->first();

            if ($existing) {
                $existing->update([
                    'coverage_status' => 'explained',
                    'mastery_level' => 'not_evaluated',
                ]);
            } else {
                StudentTopicProgress::create([
                    'student_id' => $studentId,
                    'course_topic_id' => $courseTopicId,
                    'coverage_status' => 'explained',
                    'mastery_level' => 'not_evaluated',
                ]);
            }
        }

        return back()->with('success', 'Progreso del estudiante actualizado.');
    }

    /**
     * Ensure the course is not in read-only / archived mode.
     */
    protected function ensureCourseNotReadOnly(Course $course): void
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se puede modificar un curso archivado o perteneciente a un período escolar cerrado.');
        }
    }
}
