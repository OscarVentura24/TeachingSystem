<?php

use App\Models\Course;
use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Models\Student;
use App\Models\User;

beforeEach(function () {
    $this->superAdmin = User::factory()->create([
        'email' => 'super_students@test.com',
        'is_super_admin' => true,
    ]);

    $this->instA = Institution::create([
        'name' => 'Colegio Los Angelitos',
        'code' => 'CLA',
        'slug' => 'colegio-los-angelitos',
        'is_active' => true,
    ]);

    $this->instB = Institution::create([
        'name' => 'Colegio San Pedro',
        'code' => 'CSP',
        'slug' => 'colegio-san-pedro',
        'is_active' => true,
    ]);

    $this->teacherA = User::factory()->create(['email' => 'teacher_cla@test.com']);
    InstitutionMembership::create([
        'user_id' => $this->teacherA->id,
        'institution_id' => $this->instA->id,
        'role' => 'teacher',
        'is_active' => true,
    ]);

    $this->teacherB = User::factory()->create(['email' => 'teacher_csp@test.com']);
    InstitutionMembership::create([
        'user_id' => $this->teacherB->id,
        'institution_id' => $this->instB->id,
        'role' => 'teacher',
        'is_active' => true,
    ]);

    $this->courseA = Course::create([
        'institution_id' => $this->instA->id,
        'name' => '5to Curso',
        'section' => '5-A',
        'code' => '5TO-A',
        'status' => 'active',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addMonths(3)->toDateString(),
    ]);
});

test('institution can enroll a new student into its institutional roster', function () {
    $response = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->post(route('students.store'), [
            'first_name' => 'Mateo',
            'last_name' => 'Hernandez',
            'student_id_number' => 'V-31222333',
            'email' => 'mateo@correo.com',
            'phone' => '+58 412 1112233',
        ]);

    $response->assertRedirect();

    $student = Student::where('email', 'mateo@correo.com')->first();
    expect($student)->not->toBeNull();
    expect($student->institution_id)->toBe($this->instA->id);
    expect($student->first_name)->toBe('Mateo');
    expect($student->last_name)->toBe('Hernandez');
    expect($student->is_active)->toBeTrue();
});

test('students of institution A are isolated from institution B', function () {
    $studentA = Student::create([
        'institution_id' => $this->instA->id,
        'first_name' => 'Estudiante',
        'last_name' => 'Sede A',
        'student_id_number' => 'V-11111111',
    ]);

    $studentB = Student::create([
        'institution_id' => $this->instB->id,
        'first_name' => 'Estudiante',
        'last_name' => 'Sede B',
        'student_id_number' => 'V-22222222',
    ]);

    // View as Teacher A in Inst A
    $responseA = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->get(route('students.index'));

    $responseA->assertOk();
    $studentsA = $responseA->inertiaPage()['props']['students'];
    $studentIdsA = collect($studentsA)->pluck('id');

    expect($studentIdsA)->toContain($studentA->id);
    expect($studentIdsA)->not->toContain($studentB->id);

    // View as Teacher B in Inst B
    $responseB = $this->actingAs($this->teacherB)
        ->withSession(['current_institution_id' => $this->instB->id])
        ->get(route('students.index'));

    $responseB->assertOk();
    $studentsB = $responseB->inertiaPage()['props']['students'];
    $studentIdsB = collect($studentsB)->pluck('id');

    expect($studentIdsB)->toContain($studentB->id);
    expect($studentIdsB)->not->toContain($studentA->id);
});

test('teacher can enroll an institutional student into a course', function () {
    $studentA = Student::create([
        'institution_id' => $this->instA->id,
        'first_name' => 'Sofia',
        'last_name' => 'Perez',
        'student_id_number' => 'V-32444555',
    ]);

    $response = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->post(route('courses.enrollments.store', $this->courseA), [
            'student_id' => $studentA->id,
            'preferred_workstation' => 'PC-07',
        ]);

    $response->assertRedirect();

    expect($this->courseA->students()->count())->toBe(1);
    $enrolled = $this->courseA->students()->first();
    expect($enrolled->id)->toBe($studentA->id);
    expect($enrolled->pivot->preferred_workstation)->toBe('PC-07');
});

test('cannot enroll a student from a different institution into the course', function () {
    $studentB = Student::create([
        'institution_id' => $this->instB->id,
        'first_name' => 'Foraneo',
        'last_name' => 'Sede B',
        'student_id_number' => 'V-99999999',
    ]);

    $response = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->post(route('courses.enrollments.store', $this->courseA), [
            'student_id' => $studentB->id,
            'preferred_workstation' => 'PC-01',
        ]);

    $response->assertForbidden();
    expect($this->courseA->students()->count())->toBe(0);
});

test('course show view provides the list of institution enrolled students', function () {
    $student1 = Student::create([
        'institution_id' => $this->instA->id,
        'first_name' => 'Ana',
        'last_name' => 'Ruiz',
    ]);

    $student2 = Student::create([
        'institution_id' => $this->instA->id,
        'first_name' => 'Carlos',
        'last_name' => 'Torres',
    ]);

    $response = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->get(route('courses.show', $this->courseA));

    $response->assertOk();
    $providedStudents = $response->inertiaPage()['props']['institutionStudents'];
    $providedIds = collect($providedStudents)->pluck('id');

    expect($providedIds)->toContain($student1->id);
    expect($providedIds)->toContain($student2->id);
});
