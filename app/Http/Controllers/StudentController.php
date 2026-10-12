<?php

namespace App\Http\Controllers;

use App\Models\AcademicPeriod;
use App\Models\Institution;
use App\Models\Student;
use App\Services\InstitutionContext;
use App\Services\MatriculaGeneratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function __construct(
        protected InstitutionContext $contextService,
        protected MatriculaGeneratorService $matriculaService,
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

            $filterInstId = $request->input('institution_id');
            if ($filterInstId) {
                $studentsQuery->where('institution_id', $filterInstId);
            }

            $students = $studentsQuery->get();
            $institutions = Institution::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'matricula_format']);

            $activeInstitution = $filterInstId ? Institution::find($filterInstId) : null;
        } else {
            $students = Student::where('institution_id', $activeInstitutionId)
                ->withCount('courses')
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get();

            $institutions = [];
            $activeInstitution = $activeInstitutionId ? Institution::find($activeInstitutionId) : null;
        }

        // Matrícula calculation variables & formats
        $availableFormats = $this->matriculaService->getAvailableFormats();
        $academicPeriods = [];
        $activePeriod = null;
        $suggestedMatricula = null;
        $defaultFormat = MatriculaGeneratorService::FORMAT_YEAR_SEQ_SHORT;

        if ($activeInstitution) {
            $defaultFormat = $activeInstitution->matricula_format ?: MatriculaGeneratorService::FORMAT_YEAR_SEQ_SHORT;
            $academicPeriods = AcademicPeriod::where('institution_id', $activeInstitution->id)
                ->orderByDesc('start_date')
                ->get(['id', 'name', 'is_current']);
            $activePeriod = $academicPeriods->firstWhere('is_current', true) ?: $academicPeriods->first();

            $suggestedMatricula = $this->matriculaService->generateNext(
                $activeInstitution,
                $defaultFormat,
                $activePeriod?->id
            );
        }

        return Inertia::render('students/index', [
            'students' => $students,
            'institutions' => $institutions,
            'isGlobalMode' => $isGlobalMode,
            'availableFormats' => $availableFormats,
            'academicPeriods' => $academicPeriods,
            'activePeriod' => $activePeriod ? [
                'id' => $activePeriod->id,
                'name' => $activePeriod->name,
                'is_current' => (bool) $activePeriod->is_current,
            ] : null,
            'suggestedMatricula' => $suggestedMatricula,
            'defaultFormat' => $defaultFormat,
            'activeInstitution' => $activeInstitution ? [
                'id' => $activeInstitution->id,
                'name' => $activeInstitution->name,
                'code' => $activeInstitution->code,
                'matricula_format' => $activeInstitution->matricula_format,
            ] : null,
        ]);
    }

    /**
     * Preview / calculate the next matrícula dynamically via AJAX/JSON.
     */
    public function generateMatricula(Request $request): JsonResponse
    {
        $isGlobalMode = $this->contextService->isGlobalMode($request);
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);
        $institutionId = $isGlobalMode ? $request->input('institution_id') : $activeInstitutionId;

        if (!$institutionId) {
            return response()->json(['error' => 'Institución no especificada'], 400);
        }

        $institution = Institution::findOrFail($institutionId);
        $format = $request->input('format', $institution->matricula_format ?: MatriculaGeneratorService::FORMAT_YEAR_SEQ_SHORT);
        $periodId = $request->input('period_id') ? (int) $request->input('period_id') : null;

        $result = $this->matriculaService->generateNext($institution, $format, $periodId);

        return response()->json($result);
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
            'generation_mode' => ['nullable', 'in:auto,manual'],
            'matricula_format' => ['nullable', 'string', 'max:50'],
            'academic_period_id' => ['nullable', 'exists:academic_periods,id'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $institution = Institution::findOrFail($institutionId);
        $studentIdNumber = trim($validated['student_id_number'] ?? '');
        $generationMode = $validated['generation_mode'] ?? 'auto';

        // Automatic generation if requested or if no manual code was entered
        if ($generationMode === 'auto' && empty($studentIdNumber)) {
            $periodId = !empty($validated['academic_period_id']) ? (int) $validated['academic_period_id'] : null;
            $format = $validated['matricula_format'] ?: ($institution->matricula_format ?: MatriculaGeneratorService::FORMAT_YEAR_SEQ_SHORT);

            $genResult = $this->matriculaService->generateNext($institution, $format, $periodId);
            $studentIdNumber = $genResult['matricula'];
        }

        Student::create([
            'institution_id' => $institutionId,
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'student_id_number' => $studentIdNumber ?: null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_active' => true,
        ]);

        return back()->with('success', "Estudiante matriculado exitosamente con matrícula: {$studentIdNumber}.");
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
