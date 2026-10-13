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
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    public function __construct(
        protected InstitutionContext $contextService
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

        $courses = $coursesQuery->latest()->get();

        $academicPeriodsQuery = AcademicPeriod::query();
        if ($activeInstitutionId) {
            $academicPeriodsQuery->where('institution_id', $activeInstitutionId);
        }
        $academicPeriods = $academicPeriodsQuery->get();

        $institutions = $this->contextService->getAvailableInstitutions($user);
        $activeInstitution = $activeInstitutionId ? Institution::find($activeInstitutionId) : null;

        return Inertia::render('courses/index', [
            'courses' => $courses,
            'institutions' => $institutions,
            'academicPeriods' => $academicPeriods,
            'activeInstitution' => $activeInstitution,
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
            'students' => function ($query) {
                $query->orderBy('last_name')->orderBy('first_name');
            },
            'sessions' => function ($query) {
                $query->with(['topics', 'attendances'])->orderByDesc('session_date');
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

        return Inertia::render('courses/show', [
            'course' => $course,
            'progressByStudent' => $progressRecords,
            'globalTopics' => $globalTopics,
            'availableTeachers' => $availableTeachers,
            'institutionStudents' => $institutionStudents,
            'canManageTeachers' => $canManageTeachers,
        ]);
    }

    /**
     * Add a topic from the global bank (or custom) into the course pensum.
     */
    public function addTopic(Request $request, Course $course): RedirectResponse
    {
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
     * Reorder topics in the course pensum.
     */
    public function reorderTopics(Request $request, Course $course): RedirectResponse
    {
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
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar estudiantes en este curso.');
        }

        Enrollment::where('course_id', $course->id)
            ->where('student_id', $student->id)
            ->delete();

        return back()->with('success', 'Estudiante desmatriculado del curso.');
    }
}
