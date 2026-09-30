<?php

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create([
        'name' => 'Profesor Roberto',
        'email' => 'roberto@teachingsystem.test',
    ]);

    $this->institution = Institution::create([
        'name' => 'Colegio San Ignacio',
        'slug' => 'colegio-san-ignacio',
    ]);

    $this->institution->users()->attach($this->user->id, ['role' => 'teacher']);

    $this->period = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-I',
        'is_current' => true,
    ]);
});

test('authenticated user can view courses list', function () {
    $response = $this->actingAs($this->user)->get(route('courses.index'));

    $response->assertOk();
});

test('authenticated user can create a course', function () {
    $response = $this->actingAs($this->user)->post(route('courses.store'), [
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => 'Introducción a la Programación',
        'section' => 'A',
        'code' => 'CS-101',
    ]);

    $course = Course::where('name', 'Introducción a la Programación')->first();

    expect($course)->not->toBeNull()
        ->and($course->teachers->first()->id)->toBe($this->user->id);

    $response->assertRedirect(route('courses.show', $course));
});

test('user can add topic to course pensum', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => 'Redes I',
    ]);

    $response = $this->actingAs($this->user)->post(route('courses.topics.add', $course), [
        'title' => 'Modelo OSI y TCP/IP',
        'unit_title' => 'Unidad 1',
    ]);

    $response->assertRedirect();

    expect($course->courseTopics()->count())->toBe(1)
        ->and($course->courseTopics()->first()->title)->toBe('Modelo OSI y TCP/IP');
});

test('user can create and enroll a student into course', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => 'Bases de Datos',
    ]);

    $response = $this->actingAs($this->user)->post(route('courses.enrollments.create', $course), [
        'first_name' => 'Valeria',
        'last_name' => 'Morales',
        'student_id_number' => 'V-29000111',
        'preferred_workstation' => 'PC-04',
    ]);

    $response->assertRedirect();

    expect($course->students()->count())->toBe(1);
    $student = $course->students()->first();
    expect($student->first_name)->toBe('Valeria')
        ->and($student->pivot->preferred_workstation)->toBe('PC-04');
});

test('user can fetch live topic suggestion for course session', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => 'Python Básico',
    ]);

    $topic1 = CourseTopic::create([
        'course_id' => $course->id,
        'title' => 'Variables y Operadores',
        'sort_order' => 1,
    ]);

    $student = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Pedro',
        'last_name' => 'Álvarez',
    ]);

    $course->students()->attach($student->id);

    $response = $this->actingAs($this->user)->postJson(route('courses.sessions.suggest', $course), [
        'student_ids' => [$student->id],
    ]);

    $response->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('primary_recommendation.course_topic_id', $topic1->id);
});

test('user can complete a class session and accredit topics', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => 'Sistemas Operativos',
    ]);

    $topic1 = CourseTopic::create([
        'course_id' => $course->id,
        'title' => 'Gestión de Memoria',
        'sort_order' => 1,
    ]);

    $student = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Gabriel',
        'last_name' => 'Navarro',
    ]);

    $course->students()->attach($student->id);

    $response = $this->actingAs($this->user)->post(route('courses.sessions.store', $course), [
        'session_date' => now()->toDateString(),
        'title' => 'Laboratorio 1',
        'status' => 'completed',
        'topic_ids' => [$topic1->id],
        'attendances' => [
            [
                'student_id' => $student->id,
                'workstation' => 'PC-02',
            ],
        ],
    ]);

    $response->assertRedirect(route('courses.show', $course));

    expect($course->sessions()->count())->toBe(1);
    $session = $course->sessions()->first();
    expect($session->attendances()->count())->toBe(1);

    // Check accreditation
    $progress = StudentTopicProgress::where('student_id', $student->id)
        ->where('course_topic_id', $topic1->id)
        ->first();

    expect($progress)->not->toBeNull()
        ->and($progress->coverage_status)->toBe('explained');
});
