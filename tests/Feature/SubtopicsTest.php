<?php

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Institution;
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
        'name' => 'Instituto Tecnológico',
        'slug' => 'instituto-tecnologico',
    ]);

    $this->institution->users()->attach($this->user->id, ['role' => 'admin']);

    $this->subject = Subject::create([
        'name' => 'Programación Web',
        'code' => 'PW-101',
    ]);
});

test('user can create a subtopic under a root topic in the topic bank', function () {
    $parentTopic = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'title' => 'Menú Contextual',
        'area' => 'Frontend',
        'unit_title' => 'Unidad 2',
        'is_global' => true,
    ]);

    $response = $this->actingAs($this->user)->post(route('topics.store'), [
        'title' => 'Actualizar',
        'parent_id' => $parentTopic->id,
        'description' => 'Acción de refrescar el contexto',
    ]);

    $response->assertRedirect();

    $subtopic = Topic::where('title', 'Actualizar')->first();
    expect($subtopic)->not->toBeNull()
        ->and($subtopic->parent_id)->toBe($parentTopic->id)
        ->and($subtopic->subject_id)->toBe($parentTopic->subject_id)
        ->and($subtopic->area)->toBe('Programación Web')
        ->and($subtopic->unit_title)->toBe($parentTopic->unit_title);

    expect($subtopic->isSubtopic())->toBeTrue();
    expect($parentTopic->subtopics)->toHaveCount(1);
});

test('subtopics are strictly 1-level and cannot be nested under another subtopic', function () {
    $parentTopic = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'title' => 'Menú Contextual',
        'area' => 'Frontend',
        'is_global' => true,
    ]);

    $subtopic = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'parent_id' => $parentTopic->id,
        'title' => 'Actualizar',
        'area' => 'Frontend',
        'is_global' => true,
    ]);

    // Attempting to create a sub-subtopic under 'Actualizar'
    $response = $this->actingAs($this->user)->post(route('topics.store'), [
        'title' => 'Sub-Actualizar Profundo',
        'parent_id' => $subtopic->id,
    ]);

    $response->assertSessionHasErrors('parent_id');
    expect(Topic::where('title', 'Sub-Actualizar Profundo')->exists())->toBeFalse();
});

test('adding a bank topic with subtopics into course pensum clones root and child subtopics', function () {
    $period = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-I',
        'start_date' => '2026-01-01',
        'end_date' => '2026-06-30',
        'is_active' => true,
    ]);

    $course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $period->id,
        'subject_id' => $this->subject->id,
        'teacher_id' => $this->user->id,
        'name' => 'Programación Web - Grupo A',
        'status' => 'active',
    ]);

    $parentTopic = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'title' => 'Menú Contextual',
        'area' => 'Frontend',
        'is_global' => true,
    ]);

    $subtopic1 = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'parent_id' => $parentTopic->id,
        'title' => 'Actualizar',
        'area' => 'Frontend',
        'is_global' => true,
    ]);

    $subtopic2 = Topic::create([
        'created_by_user_id' => $this->user->id,
        'subject_id' => $this->subject->id,
        'parent_id' => $parentTopic->id,
        'title' => 'Nuevo',
        'area' => 'Frontend',
        'is_global' => true,
    ]);

    // Add root topic from bank to course
    $response = $this->actingAs($this->user)->post(route('courses.topics.add', $course), [
        'topic_id' => $parentTopic->id,
        'title' => $parentTopic->title,
    ]);

    $response->assertRedirect();

    $courseRootTopic = CourseTopic::where('course_id', $course->id)
        ->where('topic_id', $parentTopic->id)
        ->whereNull('parent_id')
        ->first();

    expect($courseRootTopic)->not->toBeNull();

    $courseSubtopics = CourseTopic::where('course_id', $course->id)
        ->where('parent_id', $courseRootTopic->id)
        ->get();

    expect($courseSubtopics)->toHaveCount(2);
    expect($courseSubtopics->pluck('title')->all())->toContain('Actualizar', 'Nuevo');
});

test('teacher can add custom subtopic directly to course pensum', function () {
    $period = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-I',
        'start_date' => '2026-01-01',
        'end_date' => '2026-06-30',
        'is_active' => true,
    ]);

    $course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $period->id,
        'subject_id' => $this->subject->id,
        'teacher_id' => $this->user->id,
        'name' => 'Programación Web - Grupo B',
        'status' => 'active',
    ]);

    $courseParent = CourseTopic::create([
        'course_id' => $course->id,
        'title' => 'Componentes React',
        'sort_order' => 1,
    ]);

    $response = $this->actingAs($this->user)->post(route('courses.topics.add', $course), [
        'title' => 'Hooks Personalizados',
        'parent_id' => $courseParent->id,
        'description' => 'Creación de useFetch y useDebounce',
    ]);

    $response->assertRedirect();

    $customSubtopic = CourseTopic::where('course_id', $course->id)
        ->where('title', 'Hooks Personalizados')
        ->first();

    expect($customSubtopic)->not->toBeNull()
        ->and($customSubtopic->parent_id)->toBe($courseParent->id)
        ->and($customSubtopic->isSubtopic())->toBeTrue();
});
