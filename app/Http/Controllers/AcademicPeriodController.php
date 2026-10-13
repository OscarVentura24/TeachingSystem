<?php

namespace App\Http\Controllers;

use App\Models\AcademicPeriod;
use App\Services\AcademicPeriodRolloverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AcademicPeriodController extends Controller
{
    public function __construct(
        protected AcademicPeriodRolloverService $rolloverService
    ) {}

    /**
     * Store a newly created academic period.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'institution_id' => ['required', 'exists:institutions,id'],
            'name' => ['required', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'is_current' => ['nullable', 'boolean'],
        ]);

        if (! $request->user()->isInstitutionAdmin($validated['institution_id'])) {
            abort(403, 'No tienes permiso para gestionar los períodos académicos de esta institución.');
        }

        if (! empty($validated['is_current'])) {
            AcademicPeriod::where('institution_id', $validated['institution_id'])
                ->update(['is_current' => false]);
        }

        AcademicPeriod::create([
            'institution_id' => $validated['institution_id'],
            'name' => $validated['name'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'is_current' => $validated['is_current'] ?? false,
            'is_closed' => false,
        ]);

        return back()->with('success', 'Período académico creado exitosamente.');
    }

    /**
     * Update the specified academic period.
     */
    public function update(Request $request, AcademicPeriod $academicPeriod): RedirectResponse
    {
        if (! $request->user()->isInstitutionAdmin($academicPeriod->institution_id)) {
            abort(403, 'No tienes permiso para gestionar los períodos académicos de esta institución.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'is_current' => ['nullable', 'boolean'],
        ]);

        if (! empty($validated['is_current'])) {
            AcademicPeriod::where('institution_id', $academicPeriod->institution_id)
                ->where('id', '!=', $academicPeriod->id)
                ->update(['is_current' => false]);
        }

        $academicPeriod->update($validated);

        return back()->with('success', 'Período académico actualizado exitosamente.');
    }

    /**
     * Remove the specified academic period.
     */
    public function destroy(Request $request, AcademicPeriod $academicPeriod): RedirectResponse
    {
        if (! $request->user()->isInstitutionAdmin($academicPeriod->institution_id)) {
            abort(403, 'No tienes permiso para gestionar los períodos académicos de esta institución.');
        }

        $academicPeriod->delete();

        return back()->with('success', 'Período académico eliminado.');
    }

    /**
     * Close an academic period and archive its courses.
     */
    public function close(Request $request, AcademicPeriod $academicPeriod): RedirectResponse
    {
        if (! $request->user()->isInstitutionAdmin($academicPeriod->institution_id)) {
            abort(403, 'No tienes permiso para cerrar este período académico.');
        }

        $this->rolloverService->closePeriod($academicPeriod);

        return back()->with('success', "El período '{$academicPeriod->name}' ha sido cerrado y sus cursos archivados.");
    }

    /**
     * Reopen an academic period.
     */
    public function reopen(Request $request, AcademicPeriod $academicPeriod): RedirectResponse
    {
        if (! $request->user()->isInstitutionAdmin($academicPeriod->institution_id)) {
            abort(403, 'No tienes permiso para reabrir este período académico.');
        }

        $this->rolloverService->reopenPeriod($academicPeriod);

        return back()->with('success', "El período '{$academicPeriod->name}' ha sido reabierto.");
    }

    /**
     * Execute full transition/rollover to a new academic period.
     */
    public function rollover(Request $request, AcademicPeriod $academicPeriod): RedirectResponse
    {
        if (! $request->user()->isInstitutionAdmin($academicPeriod->institution_id)) {
            abort(403, 'No tienes permiso para ejecutar la transición de período.');
        }

        $validated = $request->validate([
            'new_period_name' => ['required', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'is_current' => ['nullable', 'boolean'],
            'close_source_period' => ['nullable', 'boolean'],
            'clone_course_ids' => ['nullable', 'array'],
            'clone_course_ids.*' => ['integer', 'exists:courses,id'],
            'promote_students' => ['nullable', 'boolean'],
        ]);

        $newPeriod = $this->rolloverService->rollover(
            $academicPeriod,
            [
                'name' => $validated['new_period_name'],
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
                'is_current' => $validated['is_current'] ?? true,
            ],
            [
                'close_source_period' => $validated['close_source_period'] ?? true,
                'clone_course_ids' => $validated['clone_course_ids'] ?? [],
                'promote_students' => $validated['promote_students'] ?? false,
            ]
        );

        return redirect()->route('courses.index', ['academic_period_id' => $newPeriod->id])
            ->with('success', "Transición completada exitosamente al nuevo período: {$newPeriod->name}.");
    }
}
