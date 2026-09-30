<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\Topic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubjectController extends Controller
{
    /**
     * Display a listing of subjects.
     */
    public function index(): Response
    {
        $subjects = Subject::withCount('topics')
            ->orderBy('name')
            ->get();

        return Inertia::render('subjects/index', [
            'subjects' => $subjects,
        ]);
    }

    /**
     * Store a newly created subject in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:subjects,name'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
        ]);

        Subject::create($validated);

        return back()->with('success', 'Asignatura creada exitosamente.');
    }

    /**
     * Update an existing subject.
     */
    public function update(Request $request, Subject $subject): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:subjects,name,' . $subject->id],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
        ]);

        $subject->update($validated);

        // Keep area name synchronized on linked topics
        Topic::where('subject_id', $subject->id)->update(['area' => $validated['name']]);

        return back()->with('success', 'Asignatura actualizada exitosamente.');
    }

    /**
     * Remove the specified subject from storage.
     */
    public function destroy(Subject $subject): RedirectResponse
    {
        // Unlink topics before deleting to preserve topics intact
        Topic::where('subject_id', $subject->id)->update(['subject_id' => null]);

        $subject->delete();

        return back()->with('success', 'Asignatura eliminada.');
    }
}
