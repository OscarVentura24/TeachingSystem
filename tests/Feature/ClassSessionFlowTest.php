<?php

use App\Models\AcademicPeriod;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentTopicProgress;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create([
        'name' => 'Profesor Carlos',
        'email' => 'carlos@teachingsystem.test',
    ]);

    $this->institution = Institution::create([
        'name' => 'Colegio Los Angelitos',
        'slug' => 'colegio-los-angelitos',
    ]);

    $this->institution->users()->attach($this->user->id, ['role' => 'teacher']);

    $this->period = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-I',
        'is_current' => true,
    ]);

    $this->course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => '3er Curso (3-A)',
    ]);
    $this->course->teachers()->attach($this->user->id, ['is_primary' => true]);

    $this->topic = $this->course->courseTopics()->create([
        'title' => 'Anatomía del computador',
        'sort_order' => 1,
        'is_required' => true,
    ]);

    $this->student1 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Ana',
        'last_name' => 'Ramos',
        'student_id_number' => 'V-30111222',
    ]);
    $this->student2 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Luis',
        'last_name' => 'Mendoza',
        'student_id_number' => 'V-30222333',
    ]);

    $this->course->students()->attach([$this->student1->id, $this->student2->id]);
});

test('authenticated user can view sessions listing ordered chronologically', function () {
    $session1 = ClassSession::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'session_date' => '2026-10-10',
        'title' => 'Sesión Antigua',
        'status' => 'completed',
    ]);

    $session2 = ClassSession::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'session_date' => '2026-10-13',
        'title' => 'Sesión Reciente',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->user)->get(route('sessions.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('sessions/index')
        ->has('sessions', 2)
        ->where('sessions.0.id', $session2->id) // Most recent first by default
        ->where('sessions.1.id', $session1->id)
    );
});

test('user can filter sessions by status and course', function () {
    ClassSession::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'session_date' => '2026-10-10',
        'title' => 'Sesión Completada',
        'status' => 'completed',
    ]);

    ClassSession::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'session_date' => '2026-10-12',
        'title' => 'Sesión Borrador',
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->user)->get('/sessions?status=completed');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('sessions', 1)
        ->where('sessions.0.title', 'Sesión Completada')
    );
});

test('user can change session status directly', function () {
    $session = ClassSession::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'session_date' => '2026-10-13',
        'title' => 'Práctica de Laboratorio',
        'status' => 'draft',
    ]);

    $session->topics()->attach($this->topic->id);
    $session->attendances()->create([
        'student_id' => $this->student1->id,
        'workstation' => 'PC-01',
    ]);

    // Switch from draft to completed
    $response = $this->actingAs($this->user)->patch("/sessions/{$session->id}/status", [
        'status' => 'completed',
    ]);

    $response->assertRedirect();
    $session->refresh();
    expect($session->status)->toBe('completed');

    // Accreditation should be generated
    expect(StudentTopicProgress::where('class_session_id', $session->id)->count())->toBe(1);

    // Switch to cancelled
    $response2 = $this->actingAs($this->user)->patch("/sessions/{$session->id}/status", [
        'status' => 'cancelled',
    ]);

    $response2->assertRedirect();
    $session->refresh();
    expect($session->status)->toBe('cancelled');
    // Accreditation should be removed on cancel
    expect(StudentTopicProgress::where('class_session_id', $session->id)->count())->toBe(0);
});

test('user can edit an existing class session', function () {
    $session = ClassSession::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'session_date' => '2026-10-10',
        'title' => 'Título Inicial',
        'status' => 'draft',
    ]);

    $session->topics()->attach($this->topic->id);
    $session->attendances()->create([
        'student_id' => $this->student1->id,
        'workstation' => 'PC-01',
    ]);

    // View edit page
    $editPage = $this->actingAs($this->user)->get("/courses/{$this->course->id}/sessions/{$session->id}/edit");
    $editPage->assertOk();

    // Submit update
    $response = $this->actingAs($this->user)->put("/courses/{$this->course->id}/sessions/{$session->id}", [
        'session_date' => '2026-10-13',
        'title' => 'Título Actualizado',
        'notes' => 'Notas adicionales',
        'status' => 'completed',
        'topic_ids' => [$this->topic->id],
        'attendances' => [
            [
                'student_id' => $this->student1->id,
                'workstation' => 'PC-05',
            ],
            [
                'student_id' => $this->student2->id,
                'workstation' => 'PC-06',
            ],
        ],
    ]);

    $response->assertRedirect(route('courses.show', $this->course));

    $session->refresh();
    expect($session->title)->toBe('Título Actualizado')
        ->and($session->status)->toBe('completed')
        ->and($session->session_date->toDateString())->toBe('2026-10-13')
        ->and($session->attendances()->count())->toBe(2);

    expect(StudentTopicProgress::where('class_session_id', $session->id)->count())->toBe(2);
});

test('user can delete a class session and clean up progress records', function () {
    $session = ClassSession::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'session_date' => '2026-10-13',
        'title' => 'Sesión a Eliminar',
        'status' => 'completed',
    ]);

    $session->topics()->attach($this->topic->id);
    $session->attendances()->create([
        'student_id' => $this->student1->id,
        'workstation' => 'PC-01',
    ]);
    StudentTopicProgress::create([
        'class_session_id' => $session->id,
        'student_id' => $this->student1->id,
        'course_topic_id' => $this->topic->id,
        'coverage_status' => 'explained',
    ]);

    $response = $this->actingAs($this->user)->delete("/sessions/{$session->id}");

    $response->assertRedirect();

    expect(ClassSession::find($session->id))->toBeNull();
    expect(StudentTopicProgress::where('class_session_id', $session->id)->count())->toBe(0);
});
