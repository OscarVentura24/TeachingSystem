<?php

namespace App\Http\Controllers;

use App\Models\Institution;
use App\Models\Subject;
use App\Models\Topic;
use App\Services\InstitutionContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TopicController extends Controller
{
    public function __construct(
        protected InstitutionContext $contextService
    ) {}

    /**
     * Display a listing of topics (global or institutional).
     */
    public function index(Request $request): Response
    {
        $isGlobalMode = $this->contextService->isGlobalMode($request);
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);
        $user = $request->user();

        if ($isGlobalMode) {
            // Super Admin in Global Platform can see all topics (global + institutional proposals)
            $topics = Topic::with(['prerequisites', 'subject', 'institution', 'sourceTopic'])
                ->orderBy('area')
                ->orderBy('title')
                ->get();
        } else {
            // Institutional Mode: show global topics + this specific institution's topics
            $topics = Topic::where(function ($q) use ($activeInstitutionId) {
                    $q->where('is_global', true)
                      ->orWhere('institution_id', $activeInstitutionId);
                })
                ->with(['prerequisites', 'subject', 'institution', 'sourceTopic'])
                ->orderBy('area')
                ->orderBy('title')
                ->get();
        }

        // Global suggestions available for institutions to clone/link into their bank
        $globalSuggestions = Topic::where('is_global', true)
            ->where('is_active', true)
            ->with(['subject', 'prerequisites'])
            ->orderBy('area')
            ->orderBy('title')
            ->get();

        $subjects = Subject::where('is_active', true)
            ->orderBy('name')
            ->get();

        $areas = $topics->pluck('area')->filter()->unique()->values();

        $activeInstitution = $activeInstitutionId ? Institution::find($activeInstitutionId) : null;

        return Inertia::render('topics/index', [
            'topics' => $topics,
            'globalSuggestions' => $globalSuggestions,
            'subjects' => $subjects,
            'areas' => $areas,
            'isGlobalMode' => $isGlobalMode,
            'activeInstitution' => $activeInstitution ? [
                'id' => $activeInstitution->id,
                'name' => $activeInstitution->name,
            ] : null,
        ]);
    }

    /**
     * Store a newly created topic in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $isGlobalMode = $this->contextService->isGlobalMode($request);
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);
        $user = $request->user();

        if ($isGlobalMode) {
            if (!$user->isSuperAdmin()) {
                abort(403, 'Solo el Super Administrador de la plataforma puede agregar temas al Banco Global.');
            }
        } else {
            if (!$activeInstitutionId) {
                abort(403, 'Debes seleccionar una institución para crear temas institucionales.');
            }

            $canCreate = $user->isSuperAdmin() ||
                $user->institutionMemberships()
                    ->where('institution_id', $activeInstitutionId)
                    ->where('is_active', true)
                    ->exists();

            if (!$canCreate) {
                abort(403, 'No tienes permisos para agregar temas en esta institución.');
            }
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'source_topic_id' => ['nullable', 'exists:topics,id'],
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

        if ($isGlobalMode) {
            $topic = Topic::create([
                'created_by_user_id' => $user->id,
                'institution_id' => null,
                'source_topic_id' => null,
                'is_global' => true,
                'status' => 'published',
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

            $message = 'Tema agregado al Banco Global exitosamente.';
        } else {
            $sourceTopicId = $validated['source_topic_id'] ?? null;
            if ($sourceTopicId) {
                $source = Topic::find($sourceTopicId);
                // Ensure the source topic is global or belongs to the current institution
                if (!$source || (!$source->is_global && $source->institution_id !== $activeInstitutionId)) {
                    $sourceTopicId = null;
                }
            }

            $topic = Topic::create([
                'created_by_user_id' => $user->id,
                'institution_id' => $activeInstitutionId,
                'source_topic_id' => $sourceTopicId,
                'is_global' => false,
                'status' => 'local',
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

            $message = 'Tema agregado al Banco Institucional exitosamente.';
        }

        if (! empty($validated['prerequisite_ids'])) {
            $topic->prerequisites()->sync($validated['prerequisite_ids']);
        }

        return back()->with('success', $message);
    }

    /**
     * Update the specified topic in storage.
     */
    public function update(Request $request, Topic $topic): RedirectResponse
    {
        $isGlobalMode = $this->contextService->isGlobalMode($request);
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);
        $user = $request->user();

        if ($topic->is_global && $topic->institution_id === null) {
            // Global master topic
            if (!$isGlobalMode || !$user->isSuperAdmin()) {
                abort(403, 'Solo el Super Administrador en la Plataforma Global puede modificar temas del Banco Global.');
            }
        } else {
            // Institutional topic
            $canEdit = $user->isSuperAdmin() ||
                ($topic->institution_id === $activeInstitutionId &&
                 $user->institutionMemberships()
                     ->where('institution_id', $topic->institution_id)
                     ->where('is_active', true)
                     ->exists());

            if (!$canEdit) {
                abort(403, 'No tienes permisos para modificar este tema institucional.');
            }
        }

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

        $prereqs = collect($validated['prerequisite_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id !== $topic->id)
            ->values()
            ->all();

        $topic->prerequisites()->sync($prereqs);

        return back()->with('success', 'Tema actualizado exitosamente.');
    }

    /**
     * Remove the specified topic from storage.
     */
    public function destroy(Request $request, Topic $topic): RedirectResponse
    {
        $isGlobalMode = $this->contextService->isGlobalMode($request);
        $activeInstitutionId = $this->contextService->getActiveInstitutionId($request);
        $user = $request->user();

        if ($topic->is_global && $topic->institution_id === null) {
            // Global master topic
            if (!$isGlobalMode || !$user->isSuperAdmin()) {
                abort(403, 'Solo el Super Administrador en la Plataforma Global puede eliminar temas del Banco Global.');
            }
        } else {
            // Institutional topic
            $canDelete = $user->isSuperAdmin() ||
                ($topic->institution_id === $activeInstitutionId &&
                 $user->isInstitutionAdmin($topic->institution_id));

            if (!$canDelete) {
                abort(403, 'No tienes permisos para eliminar este tema institucional.');
            }
        }

        $topic->prerequisites()->detach();
        $topic->prerequisiteFor()->detach();
        $topic->delete();

        return back()->with('success', 'Tema eliminado exitosamente.');
    }

    /**
     * Promote an institutional topic to the Global Bank so all institutions can see and use it.
     */
    public function promoteToGlobal(Request $request, Topic $topic): RedirectResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            abort(403, 'Solo el Super Administrador puede habilitar temas para el Banco Global.');
        }

        $topic->update([
            'is_global' => true,
            'status' => 'published',
        ]);

        return back()->with('success', "El tema '{$topic->title}' ahora está habilitado en el Banco Global para todas las instituciones.");
    }
}

