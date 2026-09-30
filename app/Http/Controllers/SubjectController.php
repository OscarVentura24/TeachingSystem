<?php

namespace App\Http\Controllers;

use App\Models\Subject;
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
}
