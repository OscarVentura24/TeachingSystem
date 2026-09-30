<?php

namespace App\Http\Controllers;

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Institution;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    /**
     * Display a listing of courses.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Get courses taught by or associated with user's institutions
        $courses = Course::with(['institution', 'academicPeriod'])
            ->withCount(['students', 'courseTopics', 'sessions'])
            ->latest()
            ->get();

        $institutions = Institution::where('is_active', true)->get();
        $academicPeriods = AcademicPeriod::all();

        return Inertia::render('courses/index', [
            'courses' => $courses,
            'institutions' => $institutions,
            'academicPeriods' => $academicPeriods,
        ]);
    }

    /**
     * Store a newly created course in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'institution_id' => ['required', 'exists:institutions,id'],
            'academic_period_id' => ['nullable', 'exists:academic_periods,id'],
            'name' => ['required', 'string', 'max:255'],
            'section' => ['nullable', 'string', 'max:50'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $course = Course::create($validated);

        // Assign current user as primary teacher
        $course->teachers()->attach($request->user()->id, ['is_primary' => true]);

        return redirect()->route('courses.show', $course)
            ->with('success', 'Curso creado exitosamente.');
    }

    /**
     * Display the specified course with its syllabus, students, and coverage matrix.
     */
    public function show(Course $course): Response
    {
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

        return Inertia::render('courses/show', [
            'course' => $course,
            'progressByStudent' => $progressRecords,
            'globalTopics' => $globalTopics,
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
}
