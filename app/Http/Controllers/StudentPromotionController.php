<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Services\StudentPromotionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class StudentPromotionController extends Controller
{
    public function __construct(
        protected StudentPromotionService $promotionService
    ) {}

    /**
     * Process student promotion/retention/withdrawal for a course.
     */
    public function promote(Request $request, Course $course): RedirectResponse
    {
        if (!$request->user()->canManageCourse($course)) {
            abort(403, 'No tienes permiso para gestionar este curso.');
        }

        $validated = $request->validate([
            'promotions' => ['required', 'array', 'min:1'],
            'promotions.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'promotions.*.action' => ['required', 'string', 'in:promote,repeat,withdraw,none'],
            'promotions.*.target_course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'promotions.*.mark_institution_inactive' => ['nullable', 'boolean'],
        ]);

        try {
            $summary = $this->promotionService->processPromotions($course, $validated['promotions']);

            $parts = [];
            if ($summary['promoted'] > 0) {
                $parts[] = "{$summary['promoted']} promovido(s)";
            }
            if ($summary['repeated'] > 0) {
                $parts[] = "{$summary['repeated']} repitente(s)";
            }
            if ($summary['withdrawn'] > 0) {
                $parts[] = "{$summary['withdrawn']} retirado(s)";
            }

            $detail = !empty($parts) ? implode(', ', $parts) : 'sin cambios aplicados';

            return back()->with('success', "Proceso de promoción completado exitosamente: {$detail}.");
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['promotions' => $e->getMessage()]);
        }
    }
}
