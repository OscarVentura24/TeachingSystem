<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use App\Models\Student;
use App\Services\InstitutionContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function __construct(
        protected InstitutionContext $contextService
    ) {}

    /**
     * Display a listing of enrolled students.
     */
    public function index(Request $request): Response
    {
        $isGlobalMode = $this->contextService->isGlobalMode($request);
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);
        $user = $request->user();

        if ($isGlobalMode) {
            $studentsQuery = Student::with(['institution'])
                ->withCount('courses')
                ->orderBy('last_name')
                ->orderBy('first_name');

            if ($request->filled('institution_id')) {
                $studentsQuery->where('institution_id', $request->input('institution_id'));
            }

            $students = $studentsQuery->get();
            $institutions = Institution::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
            $activeInstitution = null;
        } else {
            $students = Student::where('institution_id', $activeInstitutionId)
                ->withCount('courses')
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get();

            $institutions = [];
            $activeInstitution = $activeInstitutionId ? Institution::find($activeInstitutionId) : null;
        }

        return Inertia::render('students/index', [
            'students' => $students,
            'institutions' => $institutions,
            'isGlobalMode' => $isGlobalMode,
            'activeInstitution' => $activeInstitution ? [
                'id' => $activeInstitution->id,
                'name' => $activeInstitution->name,
                'code' => $activeInstitution->code,
            ] : null,
        ]);
    }

    /**
     * Store a newly enrolled student in the institution.
     */
    public function store(Request $request): RedirectResponse
    {
        $isGlobalMode = $this->contextService->isGlobalMode($request);
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);
        $user = $request->user();

        $institutionId = $isGlobalMode ? $request->input('institution_id') : $activeInstitutionId;

        if (!$institutionId) {
            abort(403, 'Debes especificar una institución para matricular al estudiante.');
        }

        if (!$isGlobalMode) {
            $hasAccess = $user->isSuperAdmin() ||
                $user->institutionMemberships()
                    ->where('institution_id', $institutionId)
                    ->where('is_active', true)
                    ->exists();

            if (!$hasAccess) {
                abort(403, 'No tienes permisos para matricular estudiantes en esta institución.');
            }
        } elseif (!$user->isSuperAdmin()) {
            abort(403, 'Solo el Super Administrador puede matricular estudiantes en modo global.');
        }

        $validated = $request->validate([
            'institution_id' => $isGlobalMode ? ['required', 'exists:institutions,id'] : ['nullable'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'student_id_number' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        Student::create([
            'institution_id' => $institutionId,
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'student_id_number' => $validated['student_id_number'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_active' => true,
        ]);

        return back()->with('success', 'Estudiante matriculado en la institución exitosamente.');
    }

    /**
     * Update the specified student's information.
     */
    public function update(Request $request, Student $student): RedirectResponse
    {
        $user = $request->user();
        $isGlobalMode = $this->contextService->isGlobalMode($request);
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);

        $canEdit = $user->isSuperAdmin() ||
            ($student->institution_id === $activeInstitutionId &&
             $user->institutionMemberships()
                 ->where('institution_id', $student->institution_id)
                 ->where('is_active', true)
                 ->exists());

        if (!$canEdit) {
            abort(403, 'No tienes permisos para modificar los datos de este estudiante.');
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'student_id_number' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $student->update([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'student_id_number' => $validated['student_id_number'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_active' => $validated['is_active'] ?? $student->is_active,
        ]);

        return back()->with('success', 'Datos del estudiante actualizados exitosamente.');
    }

    /**
     * Remove the specified student from the institution.
     */
    public function destroy(Request $request, Student $student): RedirectResponse
    {
        $user = $request->user();
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);

        $canDelete = $user->isSuperAdmin() ||
            ($student->institution_id === $activeInstitutionId &&
             $user->isInstitutionAdmin($student->institution_id));

        if (!$canDelete) {
            abort(403, 'Solo el Administrador de la institución o Super Admin puede eliminar estudiantes.');
        }

        $student->delete();

        return back()->with('success', 'Estudiante retirado de la institución.');
    }
}
