<?php

namespace App\Http\Controllers;

use App\Models\AcademicPeriod;
use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Services\InstitutionContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class InstitutionController extends Controller
{
    public function __construct(
        protected InstitutionContext $contextService
    ) {}

    /**
     * Display a listing of institutions (Super Admin view).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (!$user->isSuperAdmin()) {
            abort(403, 'Solo el Super Administrador de la plataforma puede acceder a la gestión global de instituciones.');
        }

        // Entering Global Institutions Hub automatically sets Global Mode
        $this->contextService->setActiveInstitution($request, 'global');

        $institutions = Institution::withCount(['courses', 'students', 'users', 'academicPeriods'])
            ->orderBy('name')
            ->get();

        return Inertia::render('institutions/index', [
            'institutions' => $institutions,
            'activeInstitutionId' => null,
            'totalStats' => [
                'totalInstitutions' => $institutions->count(),
                'activeInstitutions' => $institutions->where('is_active', true)->count(),
                'totalCourses' => $institutions->sum('courses_count'),
                'totalStudents' => $institutions->sum('students_count'),
            ],
        ]);
    }

    /**
     * Store a newly created institution.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            abort(403, 'No tienes permiso para crear instituciones.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
        ]);

        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $counter = 1;
        while (Institution::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $institution = Institution::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'code' => $validated['code'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        // Attach creator as admin
        InstitutionMembership::firstOrCreate(
            [
                'institution_id' => $institution->id,
                'user_id' => $user->id,
            ],
            [
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        // Create an initial current academic period so it is ready for courses
        AcademicPeriod::create([
            'institution_id' => $institution->id,
            'name' => date('Y') . '-I',
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
        ]);

        // Switch to this new institution automatically
        $this->contextService->setActiveInstitution($request, $institution->id);

        return redirect()->route('courses.index')
            ->with('message', "Institución \"{$institution->name}\" creada. Ahora estás en su panel operativo.");
    }

    /**
     * Update the specified institution.
     */
    public function update(Request $request, Institution $institution): RedirectResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            abort(403, 'No tienes permiso para modificar instituciones.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        $institution->update($validated);

        return back()->with('message', "Institución \"{$institution->name}\" actualizada correctamente.");
    }

    /**
     * Deactivate or remove an institution.
     */
    public function destroy(Request $request, Institution $institution): RedirectResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            abort(403, 'No tienes permiso para eliminar instituciones.');
        }

        // If it has courses or students, deactivate rather than hard delete to protect history
        if ($institution->courses()->count() > 0 || $institution->students()->count() > 0) {
            $institution->update(['is_active' => false]);
            return back()->with('message', "Institución \"{$institution->name}\" desactivada para proteger el historial académico existente.");
        }

        $institution->academicPeriods()->delete();
        $institution->memberships()->delete();
        $institution->delete();

        return back()->with('message', 'Institución eliminada correctamente.');
    }

    /**
     * Switch active institution in session.
     */
    public function switch(Request $request): RedirectResponse
    {
        $target = $request->input('institution_id');
        $success = $this->contextService->setActiveInstitution($request, $target);

        if (!$success) {
            return back()->withErrors(['institution_id' => 'No tienes acceso a esta institución.']);
        }

        if ($target === 'global' || $target === null) {
            return redirect()->route('dashboard');
        }

        return redirect()->route('dashboard');
    }
}
