<?php

use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Models\User;
use App\Services\PensumDuplicationService;

beforeEach(function () {
    $this->institution = Institution::create([
        'name' => 'Instituto Politécnico',
        'code' => 'IP',
        'slug' => 'instituto-politecnico',
        'is_active' => true,
    ]);

    $this->otherInstitution = Institution::create([
        'name' => 'Otra Institución',
        'code' => 'OI',
        'slug' => 'otra-institucion',
        'is_active' => true,
    ]);

    $this->teacher = User::factory()->create(['email' => 'profe@ip.edu']);
    InstitutionMembership::create([
        'user_id' => $this->teacher->id,
        'institution_id' => $this->institution->id,
        'role' => 'teacher',
        'is_active' => true,
    ]);

    $this->period2025 = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2025-2026',
        'is_current' => false,
        'is_closed' => true,
    ]);

    $this->period2026 = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-2027',
        'is_current' => true,
        'is_closed' => false,
    ]);

    // Source course with rich pensum (2 root topics, one having 2 subtopics)
    $this->sourceCourse = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period2025->id,
        'name' => 'Programación I',
        'section' => 'Sección A',
        'code' => 'PROG-101',
        'status' => 'archived',
    ]);

    $this->rootTopic1 = CourseTopic::create([
        'course_id' => $this->sourceCourse->id,
        'title' => 'Introducción a la Programación',
        'unit_title' => 'Unidad 1: Fundamentos',
        'description' => 'Conceptos básicos de algoritmos',
        'sort_order' => 1,
    ]);
    CourseTopic::create([
        'course_id' => $this->sourceCourse->id,
        'parent_id' => $this->rootTopic1->id,
        'title' => 'Variables y Tipos de Datos',
        'unit_title' => 'Unidad 1: Fundamentos',
        'sort_order' => 1,
    ]);
    CourseTopic::create([
        'course_id' => $this->sourceCourse->id,
        'parent_id' => $this->rootTopic1->id,
        'title' => 'Operadores Lógicos y Aritméticos',
        'unit_title' => 'Unidad 1: Fundamentos',
        'sort_order' => 2,
    ]);

    $this->rootTopic2 = CourseTopic::create([
        'course_id' => $this->sourceCourse->id,
        'title' => 'Estructuras Condicionales',
        'unit_title' => 'Unidad 2: Flujo de Control',
        'description' => 'Sentencias if, else, switch',
        'sort_order' => 2,
    ]);

    // Target course in active period
    $this->targetCourse = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period2026->id,
        'name' => 'Programación I',
        'section' => 'Sección B',
        'code' => 'PROG-101',
        'status' => 'active',
    ]);
    $this->targetCourse->teachers()->attach($this->teacher->id);
});

test('candidate courses are suggested intelligently matching by code and name', function () {
    $service = app(PensumDuplicationService::class);
    $candidates = $service->getCandidateSourceCourses($this->targetCourse, $this->teacher);

    expect($candidates)->toHaveCount(1);
    $first = $candidates->first();
    expect($first['id'])->toBe($this->sourceCourse->id);
    expect($first['is_recommended'])->toBeTrue();
    expect($first['match_reason'])->toContain('Mismo código de asignatura (PROG-101)');
    expect($first['topics_count'])->toBe(4); // 2 roots + 2 subtopics
    expect($first['root_topics_count'])->toBe(2);
    expect($first['units_count'])->toBe(2);
});

test('teacher can duplicate complete pensum into an empty target course', function () {
    $response = $this->actingAs($this->teacher)
        ->post(route('courses.pensum.clone', $this->targetCourse), [
            'source_course_id' => $this->sourceCourse->id,
            'mode' => 'merge',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->targetCourse->refresh();
    expect($this->targetCourse->courseTopics()->count())->toBe(4);

    $roots = $this->targetCourse->courseTopics()->whereNull('parent_id')->orderBy('sort_order')->get();
    expect($roots)->toHaveCount(2);
    expect($roots[0]->title)->toBe('Introducción a la Programación');
    expect($roots[0]->unit_title)->toBe('Unidad 1: Fundamentos');
    expect($roots[0]->subtopics()->count())->toBe(2);

    $subtopics = $roots[0]->subtopics;
    expect($subtopics[0]->title)->toBe('Variables y Tipos de Datos');
    expect($subtopics[1]->title)->toBe('Operadores Lógicos y Aritméticos');

    expect($roots[1]->title)->toBe('Estructuras Condicionales');
    expect($roots[1]->subtopics()->count())->toBe(0);
});

test('smart merge skips topics that already exist in target course to prevent duplicates', function () {
    // Pre-create rootTopic1 in target course
    CourseTopic::create([
        'course_id' => $this->targetCourse->id,
        'title' => 'Introducción a la Programación',
        'unit_title' => 'Unidad 1: Fundamentos',
        'sort_order' => 1,
    ]);

    expect($this->targetCourse->courseTopics()->count())->toBe(1);

    $response = $this->actingAs($this->teacher)
        ->post(route('courses.pensum.clone', $this->targetCourse), [
            'source_course_id' => $this->sourceCourse->id,
            'mode' => 'merge',
        ]);

    $response->assertRedirect();

    $this->targetCourse->refresh();
    // Only rootTopic2 was added; rootTopic1 was skipped because title already exists
    expect($this->targetCourse->courseTopics()->count())->toBe(2);

    $titles = $this->targetCourse->courseTopics()->pluck('title')->toArray();
    expect($titles)->toContain('Introducción a la Programación');
    expect($titles)->toContain('Estructuras Condicionales');
    // Ensure no duplicate 'Introducción a la Programación'
    expect(array_count_values($titles)['Introducción a la Programación'])->toBe(1);
});

test('replace mode wipes existing topics and copies entire source pensum', function () {
    // Pre-create an old topic in target course
    CourseTopic::create([
        'course_id' => $this->targetCourse->id,
        'title' => 'Tema Viejo Obsoleto',
        'sort_order' => 1,
    ]);

    $response = $this->actingAs($this->teacher)
        ->post(route('courses.pensum.clone', $this->targetCourse), [
            'source_course_id' => $this->sourceCourse->id,
            'mode' => 'replace',
        ]);

    $response->assertRedirect();

    $this->targetCourse->refresh();
    expect($this->targetCourse->courseTopics()->count())->toBe(4);
    expect($this->targetCourse->courseTopics()->where('title', 'Tema Viejo Obsoleto')->exists())->toBeFalse();
});

test('selected mode duplicates only the specified root topics and their subtopics', function () {
    $response = $this->actingAs($this->teacher)
        ->post(route('courses.pensum.clone', $this->targetCourse), [
            'source_course_id' => $this->sourceCourse->id,
            'mode' => 'selected',
            'selected_topic_ids' => [$this->rootTopic1->id], // only root 1 (with its 2 subtopics)
        ]);

    $response->assertRedirect();

    $this->targetCourse->refresh();
    expect($this->targetCourse->courseTopics()->count())->toBe(3); // 1 root + 2 subtopics
    expect($this->targetCourse->courseTopics()->where('title', 'Estructuras Condicionales')->exists())->toBeFalse();
});

test('cannot duplicate pensum into a read-only closed course', function () {
    $closedCourse = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period2025->id, // period is closed
        'name' => 'Curso Cerrado',
        'status' => 'archived',
    ]);
    $closedCourse->teachers()->attach($this->teacher->id);

    $response = $this->actingAs($this->teacher)
        ->post(route('courses.pensum.clone', $closedCourse), [
            'source_course_id' => $this->sourceCourse->id,
            'mode' => 'merge',
        ]);

    $response->assertForbidden();
});
