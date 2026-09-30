<?php

namespace App\Http\Controllers;

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
        $topics = Topic::with('prerequisites')
            ->orderBy('area')
            ->orderBy('title')
            ->get();

        $areas = Topic::distinct()->pluck('area')->filter()->values();

        return Inertia::render('topics/index', [
            'topics' => $topics,
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
            'area' => ['required', 'string', 'max:100'],
            'unit_title' => ['nullable', 'string', 'max:255'],
            'short_summary' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'resources_notes' => ['nullable', 'string'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1'],
            'prerequisite_ids' => ['nullable', 'array'],
            'prerequisite_ids.*' => ['integer', 'exists:topics,id'],
        ]);

        $topic = Topic::create([
            'created_by_user_id' => $request->user()->id,
            'title' => $validated['title'],
            'area' => $validated['area'],
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
}
