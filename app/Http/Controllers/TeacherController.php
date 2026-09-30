<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    /**
     * Display a listing of teachers and staff.
     */
    public function index(Request $request): Response
    {
        $currentUser = $request->user();
        $isGlobalOrInstAdmin = $currentUser->isInstitutionAdmin();

        $institutions = Institution::where('is_active', true)->get();
        $institutionIds = $institutions->pluck('id')->toArray();

        // Get all users who belong to these institutions
        $teachers = User::whereHas('institutionMemberships', function ($q) use ($institutionIds) {
            $q->whereIn('institution_id', $institutionIds);
        })
        ->with([
            'institutionMemberships.institution',
            'taughtCourses' => function ($q) {
                $q->select('courses.id', 'courses.name', 'courses.section', 'courses.institution_id');
            },
        ])
        ->withCount('createdSessions')
        ->orderBy('name')
        ->get()
        ->map(function ($teacher) {
            $membership = $teacher->institutionMemberships->first();
            return [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'role' => $membership ? $membership->role : 'teacher',
                'is_active' => $membership ? (bool) $membership->is_active : true,
                'institution_id' => $membership ? $membership->institution_id : null,
                'institution_name' => $membership && $membership->institution ? $membership->institution->name : null,
                'courses' => $teacher->taughtCourses->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'section' => $c->section,
                    'is_primary' => (bool) ($c->pivot->is_primary ?? false),
                ]),
                'sessions_count' => $teacher->created_sessions_count,
            ];
        });

        // Courses for dropdown assignments
        $courses = Course::with('institution')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'section', 'institution_id']);

        return Inertia::render('teachers/index', [
            'teachers' => $teachers,
            'institutions' => $institutions,
            'courses' => $courses,
            'isCurrentUserAdmin' => $isGlobalOrInstAdmin,
        ]);
    }

    /**
     * Store a newly created teacher/user.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8'],
            'institution_id' => ['required', 'exists:institutions,id'],
            'role' => ['required', 'string', Rule::in(['teacher', 'admin'])],
            'course_ids' => ['nullable', 'array'],
            'course_ids.*' => ['exists:courses,id'],
        ]);

        $defaultPassword = $validated['password'] ?? 'Docente2026*';

        $teacher = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($defaultPassword),
            'email_verified_at' => now(),
        ]);

        InstitutionMembership::create([
            'institution_id' => $validated['institution_id'],
            'user_id' => $teacher->id,
            'role' => $validated['role'],
            'is_active' => true,
        ]);

        if (!empty($validated['course_ids'])) {
            $syncData = [];
            foreach ($validated['course_ids'] as $courseId) {
                $syncData[$courseId] = ['is_primary' => false];
            }
            $teacher->taughtCourses()->sync($syncData);
        }

        return redirect()->route('teachers.index')
            ->with('message', "Docente {$teacher->name} registrado exitosamente.");
    }

    /**
     * Update an existing teacher/user.
     */
    public function update(Request $request, User $teacher): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($teacher->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'institution_id' => ['required', 'exists:institutions,id'],
            'role' => ['required', 'string', Rule::in(['teacher', 'admin'])],
            'is_active' => ['required', 'boolean'],
            'course_ids' => ['nullable', 'array'],
            'course_ids.*' => ['exists:courses,id'],
        ]);

        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
        ];

        if (!empty($validated['password'])) {
            $userData['password'] = Hash::make($validated['password']);
        }

        $teacher->update($userData);

        InstitutionMembership::updateOrCreate(
            [
                'institution_id' => $validated['institution_id'],
                'user_id' => $teacher->id,
            ],
            [
                'role' => $validated['role'],
                'is_active' => $validated['is_active'],
            ]
        );

        $syncData = [];
        if (!empty($validated['course_ids'])) {
            foreach ($validated['course_ids'] as $courseId) {
                $syncData[$courseId] = ['is_primary' => false];
            }
        }
        $teacher->taughtCourses()->sync($syncData);

        return redirect()->route('teachers.index')
            ->with('message', "Datos de {$teacher->name} actualizados.");
    }

    /**
     * Remove or safely deactivate a teacher.
     */
    public function destroy(Request $request, User $teacher): RedirectResponse
    {
        if ($teacher->id === $request->user()->id) {
            return back()->withErrors(['error' => 'No puedes eliminar tu propia cuenta de usuario.']);
        }

        // Check if teacher has recorded class sessions to protect history
        if ($teacher->createdSessions()->count() > 0) {
            // Deactivate and unlink courses to maintain historical audit integrity
            $teacher->institutionMemberships()->update(['is_active' => false]);
            $teacher->taughtCourses()->detach();

            return redirect()->route('teachers.index')
                ->with('message', "El docente {$teacher->name} fue desactivado y desvinculado de los cursos. Su historial de clases se conservó íntegro.");
        }

        // If no class sessions recorded, clean removal
        $teacher->taughtCourses()->detach();
        $teacher->institutionMemberships()->delete();
        $teacher->delete();

        return redirect()->route('teachers.index')
            ->with('message', 'Docente eliminado correctamente.');
    }
}
