<?php

namespace App\Http\Controllers;

use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Institution;
use App\Models\Student;
use App\Models\Topic;
use App\Models\User;
use App\Services\InstitutionContext;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected InstitutionContext $contextService
    ) {}

    public function __invoke(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $user = $request->user();
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);
        $isGlobalMode = $this->contextService->isGlobalMode($request);

        if ($isGlobalMode) {
            // Global Platform Dashboard for Super Admin
            $totalInstitutions = Institution::count();
            $activeInstitutions = Institution::where('is_active', true)->count();
            $totalCourses = Course::count();
            $totalStudents = Student::count();
            $totalTeachers = User::whereHas('institutionMemberships', fn ($q) => $q->where('role', 'teacher'))->distinct()->count();
            $totalGlobalTopics = Topic::count();

            $institutions = Institution::withCount(['courses', 'students', 'users'])
                ->orderBy('name')
                ->get()
                ->map(fn ($inst) => [
                    'id' => $inst->id,
                    'name' => $inst->name,
                    'code' => $inst->code,
                    'is_active' => $inst->is_active,
                    'courses_count' => $inst->courses_count,
                    'students_count' => $inst->students_count,
                    'teachers_count' => $inst->users_count,
                ]);

            $recentCourses = Course::with(['institution', 'academicPeriod'])
                ->withCount(['students', 'sessions'])
                ->latest()
                ->take(5)
                ->get();

            return Inertia::render('dashboard', [
                'mode' => 'global',
                'stats' => [
                    'totalInstitutions' => $totalInstitutions,
                    'activeInstitutions' => $activeInstitutions,
                    'totalCourses' => $totalCourses,
                    'totalStudents' => $totalStudents,
                    'totalTeachers' => $totalTeachers,
                    'totalGlobalTopics' => $totalGlobalTopics,
                ],
                'institutions' => $institutions,
                'recentCourses' => $recentCourses,
            ]);
        }

        // Institutional Context Dashboard
        if (!$activeInstitutionId) {
            // Non-super-admin with no active institution, try to find their first institution
            $available = $this->contextService->getAvailableInstitutions($user);
            if ($available->isNotEmpty()) {
                $this->contextService->setActiveInstitution($request, $available->first()->id);
                $activeInstitutionId = $available->first()->id;
            } else {
                return Inertia::render('dashboard', [
                    'mode' => 'no_institution',
                    'stats' => [
                        'totalCourses' => 0,
                        'totalStudents' => 0,
                        'totalTeachers' => 0,
                        'totalSessions' => 0,
                    ],
                ]);
            }
        }

        $institution = Institution::withCount(['courses', 'students'])
            ->find($activeInstitutionId);

        if (!$institution) {
            return redirect()->route('dashboard');
        }

        $coursesQuery = Course::where('institution_id', $institution->id)
            ->with(['academicPeriod', 'teachers'])
            ->withCount(['students', 'courseTopics', 'sessions']);

        // If not institutional admin, show only their assigned courses
        if (!$user->isInstitutionAdmin($institution->id)) {
            $coursesQuery->whereHas('teachers', fn ($tq) => $tq->where('users.id', $user->id));
        }

        $courses = $coursesQuery->latest()->get();

        $totalTeachers = User::whereHas('institutionMemberships', function ($q) use ($institution) {
            $q->where('institution_id', $institution->id)->where('is_active', true);
        })->count();

        $totalSessions = ClassSession::whereHas('course', function ($q) use ($institution) {
            $q->where('institution_id', $institution->id);
        })->count();

        $recentSessions = ClassSession::whereHas('course', function ($q) use ($institution) {
            $q->where('institution_id', $institution->id);
        })
        ->with(['course'])
        ->withCount('attendances')
        ->orderByDesc('session_date')
        ->take(5)
        ->get();

        return Inertia::render('dashboard', [
            'mode' => 'institution',
            'institution' => [
                'id' => $institution->id,
                'name' => $institution->name,
                'code' => $institution->code,
                'slug' => $institution->slug,
                'description' => $institution->description,
            ],
            'stats' => [
                'totalCourses' => $courses->count(),
                'totalStudents' => $institution->students_count,
                'totalTeachers' => $totalTeachers,
                'totalSessions' => $totalSessions,
            ],
            'courses' => $courses,
            'recentSessions' => $recentSessions,
        ]);
    }
}
