<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\Topic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TopicController extends Controller
{
    /**
     * Display a listing of global topics.
     */
    public function index(): Response
    {
        $topics = Topic::with(['prerequisites', 'subject'])
            ->orderBy('area')
            ->orderBy('title')
            ->get();

        $subjects = Subject::where('is_active', true)
            ->orderBy('name')
            ->get();

        $areas = Topic::distinct()->pluck('area')->filter()->values();

        return Inertia::render('topics/index', [
            'topics' => $topics,
            'subjects' => $subjects,
            'areas' => $areas,
        ]);
    }

    /**
     * Store a newly created global topic in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subject_id' => ['nullable', 'exists:subjects,id'],
            'area' => ['nullable', 'string', 'max:100'],
            'unit_title' => ['nullable', 'string', 'max:255'],
            'short_summary' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'resources_notes' => ['nullable', 'string'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1'],
            'prerequisite_ids' => ['nullable', 'array'],
            'prerequisite_ids.*' => ['integer', 'exists:topics,id'],
        ]);

        // If subject_id is provided, derive area name from the subject
        $area = $validated['area'] ?? null;
        if (! empty($validated['subject_id'])) {
            $subject = Subject::find($validated['subject_id']);
            if ($subject) {
                $area = $subject->name;
            }
        } elseif (empty($area)) {
            $area = 'General';
        }

        $topic = Topic::create([
            'created_by_user_id' => $request->user()->id,
            'subject_id' => $validated['subject_id'] ?? null,
            'title' => $validated['title'],
            'area' => $area,
            'unit_title' => $validated['unit_title'] ?? null,
            'short_summary' => $validated['short_summary'] ?? null,
            'description' => $validated['description'] ?? null,
            'resources_notes' => $validated['resources_notes'] ?? null,
            'estimated_minutes' => $validated['estimated_minutes'] ?? null,
            'is_active' => true,
        ]);

        if (! empty($validated['prerequisite_ids'])) {
            $topic->prerequisites()->sync($validated['prerequisite_ids']);
        }

        return back()->with('success', 'Tema agregado al Banco Global exitosamente.');
    }

    /**
     * Update the specified global topic in storage.
     */
    public function update(Request $request, Topic $topic): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subject_id' => ['nullable', 'exists:subjects,id'],
            'area' => ['nullable', 'string', 'max:100'],
            'unit_title' => ['nullable', 'string', 'max:255'],
            'short_summary' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'resources_notes' => ['nullable', 'string'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1'],
            'prerequisite_ids' => ['nullable', 'array'],
            'prerequisite_ids.*' => ['integer', 'exists:topics,id'],
        ]);

        // If subject_id is provided, derive area name from the subject
        $area = $validated['area'] ?? $topic->area;
        if (! empty($validated['subject_id'])) {
            $subject = Subject::find($validated['subject_id']);
            if ($subject) {
                $area = $subject->name;
            }
        } elseif (empty($area)) {
            $area = 'General';
        }

        $topic->update([
            'subject_id' => $validated['subject_id'] ?? null,
            'title' => $validated['title'],
            'area' => $area,
            'unit_title' => $validated['unit_title'] ?? null,
            'short_summary' => $validated['short_summary'] ?? null,
            'description' => $validated['description'] ?? null,
            'resources_notes' => $validated['resources_notes'] ?? null,
            'estimated_minutes' => $validated['estimated_minutes'] ?? null,
        ]);

        // Sync prerequisites, preventing self-referencing prerequisite
        $prereqs = collect($validated['prerequisite_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id !== $topic->id)
            ->values()
            ->all();

        $topic->prerequisites()->sync($prereqs);

        return back()->with('success', 'Tema actualizado exitosamente.');
    }

    /**
     * Remove the specified global topic from storage.
     */
    public function destroy(Topic $topic): RedirectResponse
    {
        $topic->prerequisites()->detach();
        $topic->prerequisiteFor()->detach();
        $topic->delete();

        return back()->with('success', 'Tema eliminado del Banco Global.');
    }
}
