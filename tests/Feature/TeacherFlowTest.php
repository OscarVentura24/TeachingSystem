<?php

use App\Models\AcademicPeriod;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Institution;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'name' => 'Admin Principal',
        'email' => 'admin@teachingsystem.test',
    ]);

    $this->institution = Institution::create([
        'name' => 'Instituto Tecnológico Central',
        'slug' => 'instituto-tecnologico-central',
    ]);

    $this->institution->users()->attach($this->admin->id, ['role' => 'admin', 'is_active' => true]);

    $this->period = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-I',
        'is_current' => true,
    ]);

    $this->courseA = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => 'Estructura de Datos',
        'section' => 'A',
    ]);

    $this->courseB = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => 'Sistemas Distribuidos',
        'section' => 'B',
    ]);
});

test('admin can view teachers list', function () {
    $response = $this->actingAs($this->admin)->get(route('teachers.index'));

    $response->assertOk();
});

test('admin can create a new teacher with assigned courses', function () {
    $response = $this->actingAs($this->admin)->post(route('teachers.store'), [
        'name' => 'Profesora Elena Vega',
        'email' => 'elena.vega@teachingsystem.test',
        'password' => 'Secreto123*',
        'institution_id' => $this->institution->id,
        'role' => 'teacher',
        'course_ids' => [$this->courseA->id],
    ]);

    $response->assertRedirect(route('teachers.index'));

    $teacher = User::where('email', 'elena.vega@teachingsystem.test')->first();
    expect($teacher)->not->toBeNull();
    expect($teacher->name)->toBe('Profesora Elena Vega');

    // Check membership
    $membership = $teacher->institutionMemberships()->first();
    expect($membership->role)->toBe('teacher')
        ->and($membership->is_active)->toBeTrue();

    // Check course assignment
    expect($teacher->taughtCourses()->count())->toBe(1)
        ->and($teacher->taughtCourses()->first()->id)->toBe($this->courseA->id);
});

test('regular teacher only sees assigned courses in index', function () {
    $teacher = User::factory()->create([
        'name' => 'Profesor Scoped',
        'email' => 'scoped@teachingsystem.test',
    ]);
    $this->institution->users()->attach($teacher->id, ['role' => 'teacher', 'is_active' => true]);

    // Assign ONLY course A to this teacher
    $this->courseA->teachers()->attach($teacher->id, ['is_primary' => true]);
    // Assign admin to course B
    $this->courseB->teachers()->attach($this->admin->id, ['is_primary' => true]);

    $response = $this->actingAs($teacher)->get(route('courses.index'));

    $response->assertOk();
    $visibleCourses = $response->viewData('page')['props']['courses'];

    // Should only see course A, not course B
    $visibleIds = collect($visibleCourses)->pluck('id')->toArray();
    expect($visibleIds)->toContain($this->courseA->id)
        ->and($visibleIds)->not->toContain($this->courseB->id);
});

test('regular teacher cannot access courses they are not assigned to', function () {
    $teacher = User::factory()->create([
        'name' => 'Profesor Ajeno',
        'email' => 'ajeno@teachingsystem.test',
    ]);
    $this->institution->users()->attach($teacher->id, ['role' => 'teacher', 'is_active' => true]);

    // Assign teacher only to course A
    $this->courseA->teachers()->attach($teacher->id, ['is_primary' => true]);

    // Course B is taught by admin
    $this->courseB->teachers()->attach($this->admin->id, ['is_primary' => true]);

    // Teacher tries to access Course B
    $response = $this->actingAs($teacher)->get(route('courses.show', $this->courseB));
    $response->assertForbidden();

    // Teacher tries to access Course A -> OK
    $responseA = $this->actingAs($teacher)->get(route('courses.show', $this->courseA));
    $responseA->assertOk();
});

test('admin can assign and remove a teacher from a course', function () {
    $teacher = User::factory()->create([
        'name' => 'Profesor Auxiliar',
        'email' => 'auxiliar@teachingsystem.test',
    ]);
    $this->institution->users()->attach($teacher->id, ['role' => 'teacher', 'is_active' => true]);

    // Assign teacher to course B
    $response = $this->actingAs($this->admin)->post(route('courses.teachers.add', $this->courseB), [
        'user_id' => $teacher->id,
        'is_primary' => false,
    ]);
    $response->assertRedirect();
    expect($this->courseB->teachers()->where('users.id', $teacher->id)->exists())->toBeTrue();

    // Remove teacher from course B
    $removeResponse = $this->actingAs($this->admin)->delete(route('courses.teachers.remove', [$this->courseB, $teacher]));
    $removeResponse->assertRedirect();
    expect($this->courseB->teachers()->where('users.id', $teacher->id)->exists())->toBeFalse();
});

test('admin can update a teacher and change role or active status', function () {
    $teacher = User::factory()->create([
        'name' => 'Profesor Modificable',
        'email' => 'modificable@teachingsystem.test',
    ]);
    $this->institution->users()->attach($teacher->id, ['role' => 'teacher', 'is_active' => true]);

    $response = $this->actingAs($this->admin)->put(route('teachers.update', $teacher), [
        'name' => 'Profesor Actualizado',
        'email' => 'modificable@teachingsystem.test',
        'institution_id' => $this->institution->id,
        'role' => 'admin',
        'is_active' => false,
        'course_ids' => [$this->courseB->id],
    ]);

    $response->assertRedirect(route('teachers.index'));

    $teacher->refresh();
    expect($teacher->name)->toBe('Profesor Actualizado');

    $membership = $teacher->institutionMemberships()->first();
    expect($membership->role)->toBe('admin')
        ->and($membership->is_active)->toBeFalse();
});

test('deleting a teacher with existing class sessions preserves session history', function () {
    $teacher = User::factory()->create([
        'name' => 'Profesor Historico',
        'email' => 'historico@teachingsystem.test',
    ]);
    $this->institution->users()->attach($teacher->id, ['role' => 'teacher', 'is_active' => true]);
    $this->courseA->teachers()->attach($teacher->id, ['is_primary' => true]);

    // Create a class session created by this teacher
    ClassSession::create([
        'course_id' => $this->courseA->id,
        'created_by_user_id' => $teacher->id,
        'session_date' => now()->toDateString(),
        'title' => 'Clase de Recursividad',
        'status' => 'completed',
    ]);

    $response = $this->actingAs($this->admin)->delete(route('teachers.destroy', $teacher));
    $response->assertRedirect(route('teachers.index'));

    // Teacher record must still exist to avoid cascading delete of class session
    expect(User::find($teacher->id))->not->toBeNull();

    // But membership is inactive and unlinked from courses
    $membership = $teacher->institutionMemberships()->first();
    expect($membership->is_active)->toBeFalse();
    expect($teacher->taughtCourses()->count())->toBe(0);
});

test('user cannot delete their own account via teacher management', function () {
    $response = $this->actingAs($this->admin)->delete(route('teachers.destroy', $this->admin));
    $response->assertSessionHasErrors(['error']);
    expect(User::find($this->admin->id))->not->toBeNull();
});
