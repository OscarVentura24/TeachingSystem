<?php

use App\Models\AcademicPeriod;
use App\Models\Assessment;
use App\Models\Course;
use App\Models\Institution;
use App\Models\Student;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'name' => 'Directora María',
        'email' => 'maria@institucion.edu',
    ]);

    $this->teacher = User::factory()->create([
        'name' => 'Profesor Carlos',
        'email' => 'carlos@institucion.edu',
    ]);

    $this->institution = Institution::create([
        'name' => 'Colegio San Agustín',
        'slug' => 'colegio-san-agustin',
    ]);

    $this->institution->users()->attach($this->admin->id, ['role' => 'admin']);
    $this->institution->users()->attach($this->teacher->id, ['role' => 'teacher']);

    session(['active_institution_id' => $this->institution->id]);

    $this->periodClosed = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2025-2026',
        'start_date' => '2025-09-01',
        'end_date' => '2026-06-30',
        'is_current' => false,
        'is_closed' => true,
    ]);

    $this->periodActive = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-2027',
        'start_date' => '2026-09-01',
        'end_date' => '2027-06-30',
        'is_current' => true,
        'is_closed' => false,
    ]);

    $this->courseClosed = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->periodClosed->id,
        'name' => '3er Curso A',
        'status' => 'archived',
    ]);

    $this->courseNext = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->periodActive->id,
        'name' => '4to Curso A',
        'status' => 'active',
    ]);

    $this->courseSameLevel = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->periodActive->id,
        'name' => '3er Curso A (Repitente)',
        'status' => 'active',
    ]);
});

test('course detects read-only state when closed or archived', function () {
    expect($this->courseClosed->isReadOnly())->toBeTrue();
    expect($this->courseNext->isReadOnly())->toBeFalse();
});

test('modifications to read-only course are blocked on backend', function () {
    // 1. Updating course info
    $response = $this->actingAs($this->admin)
        ->put(route('courses.update', $this->courseClosed), [
            'name' => 'Nombre Modificado',
        ]);
    $response->assertForbidden();

    // 2. Adding topic to course pensum
    $response = $this->actingAs($this->admin)
        ->post(route('courses.topics.add', $this->courseClosed), [
            'title' => 'Nuevo Tema Bloqueado',
        ]);
    $response->assertForbidden();

    // 3. Creating session in closed course
    $response = $this->actingAs($this->admin)
        ->post(route('courses.sessions.store', $this->courseClosed), [
            'session_date' => '2026-05-10',
            'title' => 'Clase Bloqueada',
        ]);
    $response->assertForbidden();

    // 4. Creating assessment in closed course
    $response = $this->actingAs($this->admin)
        ->post(route('courses.assessments.store', $this->courseClosed), [
            'title' => 'Examen Bloqueado',
            'type' => 'exam',
            'max_score' => 20,
            'weight' => 1,
            'assessment_date' => '2026-05-15',
        ]);
    $response->assertForbidden();
});

test('admin can promote, repeat, and withdraw students from a closed course to the new period', function () {
    $student1 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Juan',
        'last_name' => 'Pérez',
        'matricula' => 'MAT-001',
        'is_active' => true,
    ]);

    $student2 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Pedro',
        'last_name' => 'Gómez',
        'matricula' => 'MAT-002',
        'is_active' => true,
    ]);

    $student3 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Ana',
        'last_name' => 'Martínez',
        'matricula' => 'MAT-003',
        'is_active' => true,
    ]);

    // Enroll students in closed course
    $this->courseClosed->students()->attach($student1->id, ['status' => 'active']);
    $this->courseClosed->students()->attach($student2->id, ['status' => 'active']);
    $this->courseClosed->students()->attach($student3->id, ['status' => 'active']);

    $response = $this->actingAs($this->admin)
        ->post(route('courses.students.promote', $this->courseClosed), [
            'promotions' => [
                // Juan is promoted to 4to Curso A
                [
                    'student_id' => $student1->id,
                    'action' => 'promote',
                    'target_course_id' => $this->courseNext->id,
                ],
                // Pedro repeats 3er Curso
                [
                    'student_id' => $student2->id,
                    'action' => 'repeat',
                    'target_course_id' => $this->courseSameLevel->id,
                ],
                // Ana withdraws from institution
                [
                    'student_id' => $student3->id,
                    'action' => 'withdraw',
                    'mark_institution_inactive' => true,
                ],
            ],
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Check statuses in source course
    $enrollment1 = $this->courseClosed->students()->where('student_id', $student1->id)->first()->pivot;
    $enrollment2 = $this->courseClosed->students()->where('student_id', $student2->id)->first()->pivot;
    $enrollment3 = $this->courseClosed->students()->where('student_id', $student3->id)->first()->pivot;

    expect($enrollment1->status)->toBe('promoted');
    expect($enrollment2->status)->toBe('repeated');
    expect($enrollment3->status)->toBe('withdrawn');

    // Check enrollments in target courses
    expect($this->courseNext->students()->where('student_id', $student1->id)->exists())->toBeTrue();
    expect($this->courseSameLevel->students()->where('student_id', $student2->id)->exists())->toBeTrue();

    // Check student3 was marked inactive
    $student3->refresh();
    expect($student3->is_active)->toBeFalse();
});

test('promotion is rejected if target course is in a closed period', function () {
    $student = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Luis',
        'last_name' => 'Ramírez',
        'matricula' => 'MAT-004',
        'is_active' => true,
    ]);

    $this->courseClosed->students()->attach($student->id, ['status' => 'active']);

    $anotherClosedCourse = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->periodClosed->id,
        'name' => 'Otro Curso Cerrado',
        'status' => 'archived',
    ]);

    $response = $this->actingAs($this->admin)
        ->post(route('courses.students.promote', $this->courseClosed), [
            'promotions' => [
                [
                    'student_id' => $student->id,
                    'action' => 'promote',
                    'target_course_id' => $anotherClosedCourse->id,
                ],
            ],
        ]);

    $response->assertSessionHasErrors(['promotions']);
});
