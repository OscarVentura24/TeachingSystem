<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    /**
     * Enroll an existing student into a course.
     */
    public function store(Request $request, Course $course): RedirectResponse
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se pueden matricular estudiantes en un curso archivado o perteneciente a un período escolar cerrado.');
        }

        $validated = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'preferred_workstation' => ['nullable', 'string', 'max:50'],
        ]);

        $student = Student::findOrFail($validated['student_id']);
        if ($student->institution_id !== $course->institution_id) {
            abort(403, 'El estudiante seleccionado no pertenece a la institución de este curso.');
        }

        Enrollment::firstOrCreate(
            [
                'course_id' => $course->id,
                'student_id' => $student->id,
            ],
            [
                'status' => 'active',
                'preferred_workstation' => $validated['preferred_workstation'] ?? null,
                'enrolled_at' => now()->toDateString(),
            ]
        );

        return back()->with('success', 'Estudiante matriculado en el curso.');
    }

    /**
     * Create a new student and enroll them directly into the course.
     */
    public function createAndEnroll(Request $request, Course $course): RedirectResponse
    {
        if ($course->isReadOnly()) {
            abort(403, 'No se pueden matricular estudiantes en un curso archivado o perteneciente a un período escolar cerrado.');
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'student_id_number' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'preferred_workstation' => ['nullable', 'string', 'max:50'],
        ]);

        $student = Student::create([
            'institution_id' => $course->institution_id,
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'student_id_number' => $validated['student_id_number'] ?? null,
            'email' => $validated['email'] ?? null,
        ]);

        Enrollment::create([
            'course_id' => $course->id,
            'student_id' => $student->id,
            'preferred_workstation' => $validated['preferred_workstation'] ?? null,
            'enrolled_at' => now()->toDateString(),
            'status' => 'active',
        ]);

        return back()->with('success', 'Estudiante creado y matriculado con éxito.');
    }
}
