<?php

namespace App\Http\Controllers;

use App\Models\AcademicPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AcademicPeriodController extends Controller
{
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
        ]);

        return back()->with('success', 'Período académico creado exitosamente.');
    }

    /**
     * Remove the specified academic period.
     */
    public function destroy(AcademicPeriod $academicPeriod): RedirectResponse
    {
        $academicPeriod->delete();

        return back()->with('success', 'Período académico eliminado.');
    }
}
