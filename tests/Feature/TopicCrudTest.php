<?php

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Enrollment;
use App\Models\Institution;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create([
        'name' => 'Profesor Carlos',
        'email' => 'carlos@teachingsystem.test',
        'is_super_admin' => true,
    ]);

    $this->institution = Institution::create([
        'name' => 'Universidad Central',
        'slug' => 'universidad-central',
    ]);

    $this->institution->users()->attach($this->user->id, ['role' => 'admin']);

    $this->subject = Subject::create([
        'name' => 'Bases de Datos',
        'code' => 'BD-101',
    ]);
});

test('user can create a topic in the global bank', function () {
    $response = $this->actingAs($this->user)->post(route('topics.store'), [
        'title' => 'Normalización de Bases de Datos',
        'subject_id' => $this->subject->id,
        'unit_title' => 'Unidad 3',
        'short_summary' => 'Formas normales 1FN, 2FN y 3FN.',
        'description' => 'Explicación de normalización relacional.',
    ]);

    $response->assertRedirect();

    $topic = Topic::where('title', 'Normalización de Bases de Datos')->first();
    expect($topic)->not->toBeNull()
        ->and($topic->area)->toBe('Bases de Datos')
        ->and($topic->unit_title)->toBe('Unidad 3');
});

test('user can update a topic in the global bank', function () {
    $topic = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'title' => 'Consultas SQL Básicas',
        'area' => 'Bases de Datos',
        'unit_title' => 'Unidad 1',
    ]);

    $prereq = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'title' => 'Modelo Entidad-Relación',
        'area' => 'Bases de Datos',
    ]);

    $newSubject = Subject::create([
        'name' => 'Bases de Datos Avanzadas',
        'code' => 'BDA-201',
    ]);

    $response = $this->actingAs($this->user)->put(route('topics.update', $topic), [
        'title' => 'Consultas SQL Avanzadas y Joins',
        'subject_id' => $newSubject->id,
        'unit_title' => 'Unidad 2',
        'short_summary' => 'Inner, Left, Right Joins y Subqueries.',
        'description' => 'Contenido actualizado.',
        'prerequisite_ids' => [$prereq->id],
    ]);

    $response->assertRedirect();

    $topic->refresh();
    expect($topic->title)->toBe('Consultas SQL Avanzadas y Joins')
        ->and($topic->subject_id)->toBe($newSubject->id)
        ->and($topic->area)->toBe('Bases de Datos Avanzadas')
        ->and($topic->unit_title)->toBe('Unidad 2')
        ->and($topic->prerequisites)->toHaveCount(1)
        ->and($topic->prerequisites->first()->id)->toBe($prereq->id);
});

test('user can delete a topic from the global bank', function () {
    $topic = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'title' => 'Tema a Eliminar',
        'area' => 'Bases de Datos',
    ]);

    $response = $this->actingAs($this->user)->delete(route('topics.destroy', $topic));

    $response->assertRedirect();
    expect(Topic::find($topic->id))->toBeNull();
});

test('user can update a course', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'name' => 'Bases de Datos I',
        'section' => 'A',
        'code' => 'BD-100',
    ]);
    $course->teachers()->attach($this->user->id, ['is_primary' => true]);

    $response = $this->actingAs($this->user)->put(route('courses.update', $course), [
        'name' => 'Bases de Datos Relacionales',
        'section' => 'B',
        'code' => 'BD-200',
        'description' => 'Curso actualizado.',
    ]);

    $response->assertRedirect();

    $course->refresh();
    expect($course->name)->toBe('Bases de Datos Relacionales')
        ->and($course->section)->toBe('B')
        ->and($course->code)->toBe('BD-200');
});

test('user can delete a course', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'name' => 'Curso a Eliminar',
    ]);
    $course->teachers()->attach($this->user->id, ['is_primary' => true]);

    $response = $this->actingAs($this->user)->delete(route('courses.destroy', $course));

    $response->assertRedirect(route('courses.index'));
    expect(Course::find($course->id))->toBeNull();
});

test('user can remove a topic from course pensum', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'name' => 'Estructura de Datos',
    ]);
    $course->teachers()->attach($this->user->id, ['is_primary' => true]);

    $courseTopic = CourseTopic::create([
        'course_id' => $course->id,
        'title' => 'Árboles Binarios',
        'sort_order' => 1,
    ]);

    $response = $this->actingAs($this->user)->delete(
        route('courses.topics.remove', ['course' => $course->id, 'courseTopic' => $courseTopic->id])
    );

    $response->assertRedirect();
    expect(CourseTopic::find($courseTopic->id))->toBeNull();
});

test('user can remove a student enrollment from a course', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'name' => 'Física I',
    ]);
    $course->teachers()->attach($this->user->id, ['is_primary' => true]);

    $student = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Juan',
        'last_name' => 'Pérez',
    ]);

    Enrollment::create([
        'course_id' => $course->id,
        'student_id' => $student->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->user)->delete(
        route('courses.students.remove', ['course' => $course->id, 'student' => $student->id])
    );

    $response->assertRedirect();
    expect(Enrollment::where('course_id', $course->id)->where('student_id', $student->id)->exists())->toBeFalse();
});

test('user can update an academic period', function () {
    $period = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-I',
        'is_current' => true,
    ]);

    $response = $this->actingAs($this->user)->put(route('academic-periods.update', $period), [
        'name' => '2026-II',
        'start_date' => '2026-08-01',
        'end_date' => '2026-12-15',
        'is_current' => true,
    ]);

    $response->assertRedirect();

    $period->refresh();
    expect($period->name)->toBe('2026-II')
        ->and($period->start_date->toDateString())->toBe('2026-08-01')
        ->and($period->end_date->toDateString())->toBe('2026-12-15');
});
