<?php

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Institution;
use App\Models\Student;
use App\Models\Topic;
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
        'name' => 'Instituto Politécnico',
        'slug' => 'instituto-politecnico',
    ]);

    // Attach roles
    $this->institution->users()->attach($this->admin->id, ['role' => 'admin']);
    $this->institution->users()->attach($this->teacher->id, ['role' => 'teacher']);

    // Set active institution in session
    session(['active_institution_id' => $this->institution->id]);

    $this->period2025 = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2025-II',
        'start_date' => '2025-08-01',
        'end_date' => '2025-12-15',
        'is_current' => true,
        'is_closed' => false,
    ]);
});

test('admin can close an academic period and archive its courses', function () {
    $course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period2025->id,
        'name' => 'Bases de Datos I',
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->admin)
        ->post(route('academic-periods.close', $this->period2025));

    $response->assertRedirect();

    $this->period2025->refresh();
    $course->refresh();

    expect($this->period2025->is_closed)->toBeTrue()
        ->and($this->period2025->is_current)->toBeFalse()
        ->and($this->period2025->closed_at)->not->toBeNull()
        ->and($course->status)->toBe('archived');
});

test('admin can reopen a closed academic period and restore courses to active', function () {
    $this->period2025->update([
        'is_closed' => true,
        'is_current' => false,
        'closed_at' => now(),
    ]);

    $course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period2025->id,
        'name' => 'Bases de Datos I',
        'status' => 'archived',
    ]);

    $response = $this->actingAs($this->admin)
        ->post(route('academic-periods.reopen', $this->period2025));

    $response->assertRedirect();

    $this->period2025->refresh();
    $course->refresh();

    expect($this->period2025->is_closed)->toBeFalse()
        ->and($this->period2025->is_current)->toBeTrue()
        ->and($this->period2025->closed_at)->toBeNull()
        ->and($course->status)->toBe('active');
});

test('admin can rollover an academic period with course, pensum hierarchy and student promotion', function () {
    // 1. Create a course in the departing period
    $oldCourse = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period2025->id,
        'name' => 'Programación Orientada a Objetos',
        'section' => 'Sección A',
        'code' => 'PROG-201',
        'status' => 'active',
    ]);

    $oldCourse->teachers()->attach($this->teacher->id);

    // 2. Add root topic and child subtopic
    $rootTopic = CourseTopic::create([
        'course_id' => $oldCourse->id,
        'title' => 'Unidad 1: Clases y Objetos',
        'sort_order' => 1,
    ]);

    $subtopic = CourseTopic::create([
        'course_id' => $oldCourse->id,
        'parent_id' => $rootTopic->id,
        'title' => '1.1 Encapsulamiento y Modificadores de Acceso',
        'sort_order' => 1,
    ]);

    // 3. Enroll students in old course
    $student = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Ana',
        'last_name' => 'Gómez',
        'student_id_number' => '2025-001',
    ]);

    $oldCourse->students()->attach($student->id, [
        'enrolled_at' => now()->subMonths(3),
        'status' => 'active',
    ]);

    // 4. Perform rollover to 2026-I
    $response = $this->actingAs($this->admin)
        ->post(route('academic-periods.rollover', $this->period2025), [
            'new_period_name' => '2026-I',
            'start_date' => '2026-01-15',
            'end_date' => '2026-06-30',
            'is_current' => true,
            'close_source_period' => true,
            'clone_course_ids' => [$oldCourse->id],
            'promote_students' => true,
        ]);

    // Check new period
    $newPeriod = AcademicPeriod::where('name', '2026-I')->first();
    expect($newPeriod)->not->toBeNull()
        ->and($newPeriod->is_current)->toBeTrue()
        ->and($newPeriod->is_closed)->toBeFalse();

    $response->assertRedirect(route('courses.index', ['academic_period_id' => $newPeriod->id]));

    // Check old period is closed
    $this->period2025->refresh();
    expect($this->period2025->is_closed)->toBeTrue()
        ->and($this->period2025->is_current)->toBeFalse();

    // Check old course is archived
    $oldCourse->refresh();
    expect($oldCourse->status)->toBe('archived');

    // Check new course
    $newCourse = Course::where('academic_period_id', $newPeriod->id)->first();
    expect($newCourse)->not->toBeNull()
        ->and($newCourse->name)->toBe($oldCourse->name)
        ->and($newCourse->section)->toBe($oldCourse->section)
        ->and($newCourse->code)->toBe($oldCourse->code)
        ->and($newCourse->status)->toBe('active');

    // Check cloned teachers
    expect($newCourse->teachers)->toHaveCount(1)
        ->and($newCourse->teachers->first()->id)->toBe($this->teacher->id);

    // Check cloned topics and subtopics hierarchy
    $clonedRootTopic = CourseTopic::where('course_id', $newCourse->id)
        ->whereNull('parent_id')
        ->first();

    expect($clonedRootTopic)->not->toBeNull()
        ->and($clonedRootTopic->title)->toBe('Unidad 1: Clases y Objetos')
        ->and($clonedRootTopic->sort_order)->toBe(1);

    $clonedSubtopic = CourseTopic::where('course_id', $newCourse->id)
        ->where('parent_id', $clonedRootTopic->id)
        ->first();

    expect($clonedSubtopic)->not->toBeNull()
        ->and($clonedSubtopic->title)->toBe('1.1 Encapsulamiento y Modificadores de Acceso')
        ->and($clonedSubtopic->sort_order)->toBe(1);

    // Check promoted student
    expect($newCourse->students)->toHaveCount(1)
        ->and($newCourse->students->first()->id)->toBe($student->id);
});

test('non-admin teacher cannot close, reopen or rollover academic periods', function () {
    $closeResponse = $this->actingAs($this->teacher)
        ->post(route('academic-periods.close', $this->period2025));
    $closeResponse->assertForbidden();

    $reopenResponse = $this->actingAs($this->teacher)
        ->post(route('academic-periods.reopen', $this->period2025));
    $reopenResponse->assertForbidden();

    $rolloverResponse = $this->actingAs($this->teacher)
        ->post(route('academic-periods.rollover', $this->period2025), [
            'new_period_name' => '2026-I',
        ]);
    $rolloverResponse->assertForbidden();
});
