<?php

namespace App\Http\Controllers;

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Institution;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            'courseTopics',
            'students' => function ($query) {
                $query->orderBy('last_name')->orderBy('first_name');
            },
            'sessions' => function ($query) {
                $query->with(['topics', 'attendances'])->orderByDesc('session_date');
            },
        ]);

        // Load progress records for matrix
        $progressRecords = StudentTopicProgress::whereIn('course_topic_id', $course->courseTopics->pluck('id'))
            ->get()
            ->groupBy('student_id');

        // Global topics available to add to pensum
        $globalTopics = Topic::where('is_active', true)
            ->with('prerequisites')
            ->orderBy('area')
            ->orderBy('title')
            ->get();

        // Teachers in the institution for assignment
        $availableTeachers = User::whereHas('institutionMemberships', function ($q) use ($course) {
            $q->where('institution_id', $course->institution_id)
              ->where('is_active', true);
        })->get(['id', 'name', 'email']);

        $canManageTeachers = $request->user()->isInstitutionAdmin($course->institution_id) ||
            $course->teachers()->where('users.id', $request->user()->id)->wherePivot('is_primary', true)->exists();

        return Inertia::render('courses/show', [
            'course' => $course,
            'progressByStudent' => $progressRecords,
            'globalTopics' => $globalTopics,
            'availableTeachers' => $availableTeachers,
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
            'title' => ['required', 'string', 'max:255'],
            'unit_title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $nextSortOrder = ($course->courseTopics()->max('sort_order') ?? 0) + 1;

        $course->courseTopics()->create([
            'topic_id' => $validated['topic_id'] ?? null,
            'title' => $validated['title'],
            'unit_title' => $validated['unit_title'] ?? null,
            'description' => $validated['description'] ?? null,
            'sort_order' => $nextSortOrder,
            'is_required' => true,
        ]);

        return back()->with('success', 'Tema agregado al pensum.');
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
}
