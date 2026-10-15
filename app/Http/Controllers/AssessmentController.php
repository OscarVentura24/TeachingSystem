<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\AssessmentScore;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Services\AssessmentMasterySyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AssessmentController extends Controller
{
    public function __construct(
        protected AssessmentMasterySyncService $syncService
    ) {}

    /**
     * Show form to create a new assessment.
     */
    public function create(Request $request, Course $course): Response
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se pueden crear evaluaciones en un curso archivado o perteneciente a un período escolar cerrado.');
        }

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar evaluaciones en este curso.');
        }

        $course->load([
            'institution:id,name',
            'academicPeriod:id,name,is_current,is_closed',
            'students' => function ($q) {
                $q->wherePivotIn('status', ['active', 'repeated']);
            },
            'courseTopics' => function ($query) {
                $query->whereNull('parent_id')
                    ->orderBy('sort_order')
                    ->with(['subtopics' => function ($sq) {
                        $sq->orderBy('sort_order');
                    }]);
            },
        ]);

        return Inertia::render('assessments/create', [
            'course' => $course,
            'courseTopics' => $course->courseTopics,
        ]);
    }

    /**
     * Show form to edit an existing assessment.
     */
    public function edit(Request $request, Course $course, Assessment $assessment): Response
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se pueden modificar evaluaciones en un curso archivado o perteneciente a un período escolar cerrado.');
        }

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar evaluaciones en este curso.');
        }

        if ($assessment->course_id !== $course->id) {
            abort(404);
        }

        $course->load([
            'institution:id,name',
            'academicPeriod:id,name,is_current,is_closed',
            'students' => function ($q) {
                $q->wherePivotIn('status', ['active', 'repeated']);
            },
            'courseTopics' => function ($query) {
                $query->whereNull('parent_id')
                    ->orderBy('sort_order')
                    ->with(['subtopics' => function ($sq) {
                        $sq->orderBy('sort_order');
                    }]);
            },
        ]);

        $assessment->load('topics:id,title');

        return Inertia::render('assessments/edit', [
            'course' => $course,
            'assessment' => $assessment,
            'courseTopics' => $course->courseTopics,
            'selectedTopicIds' => $assessment->topics->pluck('id')->toArray(),
        ]);
    }

    /**
     * Store a new assessment for a course.
     */
    public function store(Request $request, Course $course): RedirectResponse
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se pueden crear evaluaciones en un curso archivado o perteneciente a un período escolar cerrado.');
        }

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar evaluaciones en este curso.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assessment_type' => ['required', 'in:exam,practical,project,quiz'],
            'assessment_date' => ['required', 'date'],
            'max_score' => ['required', 'numeric', 'min:1', 'max:999.99'],
            'passing_score' => ['required', 'numeric', 'min:0', 'lte:max_score'],
            'weight_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'auto_sync_mastery' => ['boolean'],
            'topic_ids' => ['nullable', 'array'],
            'topic_ids.*' => ['integer', 'exists:course_topics,id'],
        ]);

        DB::transaction(function () use ($validated, $course, $request) {
            $assessment = $course->assessments()->create([
                'created_by_user_id' => $request->user()->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'assessment_type' => $validated['assessment_type'],
                'assessment_date' => $validated['assessment_date'],
                'max_score' => $validated['max_score'],
                'passing_score' => $validated['passing_score'],
                'weight_percentage' => $validated['weight_percentage'] ?? null,
                'auto_sync_mastery' => $validated['auto_sync_mastery'] ?? true,
            ]);

            if (!empty($validated['topic_ids'])) {
                // Ensure topics belong to this course
                $validTopicIds = CourseTopic::where('course_id', $course->id)
                    ->whereIn('id', $validated['topic_ids'])
                    ->pluck('id');

                $assessment->topics()->sync($validTopicIds);
            }
        });

        return redirect()->route('courses.show', ['course' => $course->id, 'tab' => 'grades'])
            ->with('success', 'Evaluación creada exitosamente.');
    }

    /**
     * Update an assessment.
     */
    public function update(Request $request, Course $course, Assessment $assessment): RedirectResponse
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se pueden modificar evaluaciones en un curso archivado o perteneciente a un período escolar cerrado.');
        }

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar evaluaciones en este curso.');
        }

        if ($assessment->course_id !== $course->id) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assessment_type' => ['required', 'in:exam,practical,project,quiz'],
            'assessment_date' => ['required', 'date'],
            'max_score' => ['required', 'numeric', 'min:1', 'max:999.99'],
            'passing_score' => ['required', 'numeric', 'min:0', 'lte:max_score'],
            'weight_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'auto_sync_mastery' => ['boolean'],
            'topic_ids' => ['nullable', 'array'],
            'topic_ids.*' => ['integer', 'exists:course_topics,id'],
        ]);

        DB::transaction(function () use ($validated, $course, $assessment) {
            $assessment->update([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'assessment_type' => $validated['assessment_type'],
                'assessment_date' => $validated['assessment_date'],
                'max_score' => $validated['max_score'],
                'passing_score' => $validated['passing_score'],
                'weight_percentage' => $validated['weight_percentage'] ?? null,
                'auto_sync_mastery' => $validated['auto_sync_mastery'] ?? true,
            ]);

            if (isset($validated['topic_ids'])) {
                $validTopicIds = CourseTopic::where('course_id', $course->id)
                    ->whereIn('id', $validated['topic_ids'])
                    ->pluck('id');

                $assessment->topics()->sync($validTopicIds);
            }

            if ($assessment->auto_sync_mastery) {
                $this->syncService->syncForAssessment($assessment);
            }
        });

        return redirect()->route('courses.show', ['course' => $course->id, 'tab' => 'grades'])
            ->with('success', 'Evaluación actualizada exitosamente.');
    }

    /**
     * Delete an assessment.
     */
    public function destroy(Request $request, Course $course, Assessment $assessment): RedirectResponse
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se pueden eliminar evaluaciones en un curso archivado o perteneciente a un período escolar cerrado.');
        }

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar evaluaciones en este curso.');
        }

        if ($assessment->course_id !== $course->id) {
            abort(404);
        }

        $assessment->delete();

        return back()->with('success', 'Evaluación eliminada correctamente.');
    }

    /**
     * Show dedicated page to grade an assessment.
     */
    public function grade(Request $request, Course $course, Assessment $assessment): Response
    {
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar evaluaciones en este curso.');
        }

        if ($assessment->course_id !== $course->id) {
            abort(404);
        }

        $course->load([
            'institution:id,name',
            'academicPeriod:id,name,is_current,is_closed',
        ]);

        $assessment->load([
            'topics:id,title,unit_title',
            'scores',
            'createdBy:id,name',
        ]);

        $studentsQuery = $course->students();
        if (!$course->isReadOnly()) {
            $studentsQuery->wherePivotIn('status', ['active', 'repeated']);
        }
        $students = $studentsQuery->orderBy('last_name')->orderBy('first_name')->get();

        return Inertia::render('assessments/grade', [
            'course' => $course,
            'assessment' => $assessment,
            'students' => $students,
            'readOnly' => $course->isReadOnly(),
        ]);
    }

    /**
     * Save student scores for an assessment.
     */
    public function saveScores(Request $request, Course $course, Assessment $assessment): RedirectResponse
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se pueden calificar evaluaciones en un curso archivado o perteneciente a un período escolar cerrado.');
        }

        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para calificar evaluaciones en este curso.');
        }

        if ($assessment->course_id !== $course->id) {
            abort(404);
        }

        $validated = $request->validate([
            'scores' => ['required', 'array'],
            'scores.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'scores.*.score' => ['nullable', 'numeric', 'min:0', 'lte:' . $assessment->max_score],
            'scores.*.status' => ['required', 'in:present,absent,excused'],
            'scores.*.feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($validated, $assessment) {
            foreach ($validated['scores'] as $item) {
                $scoreValue = ($item['status'] === 'present' && isset($item['score']) && $item['score'] !== '')
                    ? $item['score']
                    : null;

                AssessmentScore::updateOrCreate(
                    [
                        'assessment_id' => $assessment->id,
                        'student_id' => $item['student_id'],
                    ],
                    [
                        'score' => $scoreValue,
                        'status' => $item['status'],
                        'feedback' => $item['feedback'] ?? null,
                        'graded_at' => ($scoreValue !== null || $item['status'] !== 'present') ? now() : null,
                    ]
                );
            }

            // Automate mastery level synchronization
            $this->syncService->syncForAssessment($assessment);
        });

        return redirect()->route('courses.show', ['course' => $course->id, 'tab' => 'grades'])
            ->with('success', 'Calificaciones registradas y sincronizadas exitosamente.');
    }
}
