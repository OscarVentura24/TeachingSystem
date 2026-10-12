<?php

use App\Models\Course;
use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Models\Student;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->inst = Institution::create([
        'name' => 'Colegio Los Angelitos',
        'code' => 'CLA',
        'slug' => 'colegio-los-angelitos',
        'matricula_format' => 'year_seq_short',
        'is_active' => true,
    ]);

    $this->admin = User::factory()->create(['email' => 'admin_cla_sort@test.com']);
    InstitutionMembership::create([
        'user_id' => $this->admin->id,
        'institution_id' => $this->inst->id,
        'role' => 'admin',
        'is_active' => true,
    ]);

    $this->studentA = Student::create([
        'institution_id' => $this->inst->id,
        'first_name' => 'Ana',
        'last_name' => 'Zapata',
        'student_id_number' => '26-03',
        'is_active' => true,
        'created_at' => now()->subDays(2),
    ]);

    $this->studentB = Student::create([
        'institution_id' => $this->inst->id,
        'first_name' => 'Carlos',
        'last_name' => 'Alvarez',
        'student_id_number' => '26-01',
        'is_active' => false,
        'created_at' => now()->subDays(5),
    ]);

    $this->studentC = Student::create([
        'institution_id' => $this->inst->id,
        'first_name' => 'Beatriz',
        'last_name' => 'Gomez',
        'student_id_number' => '26-02',
        'is_active' => true,
        'created_at' => now(),
    ]);

    $this->course = Course::create([
        'institution_id' => $this->inst->id,
        'name' => 'Matemáticas 5to',
        'code' => 'MAT-5',
        'status' => 'active',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addMonths(3)->toDateString(),
    ]);

    // Enroll student A in a course
    $this->studentA->courses()->attach($this->course->id, ['status' => 'enrolled', 'enrolled_at' => now()]);
});

test('students index defaults to sorting by last name alphabetically', function () {
    $response = $this->actingAs($this->admin)
        ->withSession(['current_institution_id' => $this->inst->id])
        ->get(route('students.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('students/index')
            ->has('students', 3)
            ->where('students.0.last_name', 'Alvarez')
            ->where('students.1.last_name', 'Gomez')
            ->where('students.2.last_name', 'Zapata')
            ->where('currentSort', 'name')
            ->where('currentDirection', 'asc')
        );
});

test('students index can be sorted by matricula ascending and descending', function () {
    // Ascending: 26-01, 26-02, 26-03
    $responseAsc = $this->actingAs($this->admin)
        ->withSession(['current_institution_id' => $this->inst->id])
        ->get(route('students.index', ['sort_by' => 'matricula', 'sort_direction' => 'asc']));

    $responseAsc->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('students.0.student_id_number', '26-01')
            ->where('students.1.student_id_number', '26-02')
            ->where('students.2.student_id_number', '26-03')
        );

    // Descending: 26-03, 26-02, 26-01
    $responseDesc = $this->actingAs($this->admin)
        ->withSession(['current_institution_id' => $this->inst->id])
        ->get(route('students.index', ['sort_by' => 'matricula', 'sort_direction' => 'desc']));

    $responseDesc->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('students.0.student_id_number', '26-03')
            ->where('students.1.student_id_number', '26-02')
            ->where('students.2.student_id_number', '26-01')
        );
});

test('students index can be sorted by courses_count', function () {
    // Descending: studentA has 1 course, others have 0
    $response = $this->actingAs($this->admin)
        ->withSession(['current_institution_id' => $this->inst->id])
        ->get(route('students.index', ['sort_by' => 'courses_count', 'sort_direction' => 'desc']));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('students.0.id', $this->studentA->id)
            ->where('students.0.courses_count', 1)
        );
});

test('students index eager loads enrolled courses details', function () {
    $response = $this->actingAs($this->admin)
        ->withSession(['current_institution_id' => $this->inst->id])
        ->get(route('students.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('students.2.courses', 1)
            ->where('students.2.courses.0.name', 'Matemáticas 5to')
        );
});
