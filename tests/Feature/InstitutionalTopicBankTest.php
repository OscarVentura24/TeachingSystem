<?php

use App\Models\Course;
use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;

beforeEach(function () {
    $this->superAdmin = User::factory()->create(['email' => 'super@test.com', 'is_super_admin' => true]);

    $this->instA = Institution::create([
        'name' => 'Universidad Central',
        'code' => 'UC',
        'slug' => 'universidad-central',
        'is_active' => true,
    ]);

    $this->instB = Institution::create([
        'name' => 'Instituto Tecnológico',
        'code' => 'IT',
        'slug' => 'instituto-tecnologico',
        'is_active' => true,
    ]);

    $this->teacherA = User::factory()->create(['email' => 'teacherA@test.com']);
    InstitutionMembership::create([
        'user_id' => $this->teacherA->id,
        'institution_id' => $this->instA->id,
        'role' => 'teacher',
        'is_active' => true,
    ]);

    $this->teacherB = User::factory()->create(['email' => 'teacherB@test.com']);
    InstitutionMembership::create([
        'user_id' => $this->teacherB->id,
        'institution_id' => $this->instB->id,
        'role' => 'teacher',
        'is_active' => true,
    ]);

    $this->globalTopic = Topic::create([
        'title' => 'Introducción a Algoritmos',
        'area' => 'Computación',
        'is_global' => true,
        'status' => 'published',
        'institution_id' => null,
    ]);
});

test('institution can create an institutional topic', function () {
    $response = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->post(route('topics.store'), [
            'title' => 'Técnicas de Programación UC',
            'area' => 'Computación',
            'description' => 'Tema propio de la UC',
        ]);

    $response->assertRedirect();

    $topic = Topic::where('title', 'Técnicas de Programación UC')->first();
    expect($topic)->not->toBeNull();
    expect($topic->institution_id)->toBe($this->instA->id);
    expect($topic->is_global)->toBeFalse();
    expect($topic->status)->toBe('local');
    expect($topic->created_by_user_id)->toBe($this->teacherA->id);
});

test('institution can create a topic linked to a global suggestion', function () {
    $response = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->post(route('topics.store'), [
            'title' => 'Algoritmos y Estructuras UC',
            'source_topic_id' => $this->globalTopic->id,
            'area' => 'Computación',
            'description' => 'Basado en el tema global con ajustes para UC',
        ]);

    $response->assertRedirect();

    $topic = Topic::where('title', 'Algoritmos y Estructuras UC')->first();
    expect($topic)->not->toBeNull();
    expect($topic->institution_id)->toBe($this->instA->id);
    expect($topic->source_topic_id)->toBe($this->globalTopic->id);
    expect($topic->sourceTopic->id)->toBe($this->globalTopic->id);
});

test('institutional topics of institution A are isolated and hidden from institution B', function () {
    // Topic owned by Inst A
    $topicA = Topic::create([
        'title' => 'Privado de Sede A',
        'area' => 'Computación',
        'is_global' => false,
        'institution_id' => $this->instA->id,
        'status' => 'local',
    ]);

    // Topic owned by Inst B
    $topicB = Topic::create([
        'title' => 'Privado de Sede B',
        'area' => 'Computación',
        'is_global' => false,
        'institution_id' => $this->instB->id,
        'status' => 'local',
    ]);

    // When viewing as Teacher A in Inst A
    $responseA = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->get(route('topics.index'));

    $responseA->assertOk();
    $topicsA = $responseA->inertiaPage()['props']['topics'];
    $topicIdsA = collect($topicsA)->pluck('id');

    expect($topicIdsA)->toContain($this->globalTopic->id);
    expect($topicIdsA)->toContain($topicA->id);
    expect($topicIdsA)->not->toContain($topicB->id);

    // When viewing as Teacher B in Inst B
    $responseB = $this->actingAs($this->teacherB)
        ->withSession(['current_institution_id' => $this->instB->id])
        ->get(route('topics.index'));

    $responseB->assertOk();
    $topicsB = $responseB->inertiaPage()['props']['topics'];
    $topicIdsB = collect($topicsB)->pluck('id');

    expect($topicIdsB)->toContain($this->globalTopic->id);
    expect($topicIdsB)->toContain($topicB->id);
    expect($topicIdsB)->not->toContain($topicA->id);
});

test('institution can update its own institutional topics but not another institution topics', function () {
    $topicA = Topic::create([
        'title' => 'Tema Editable A',
        'area' => 'Computación',
        'is_global' => false,
        'institution_id' => $this->instA->id,
    ]);

    // Teacher A can update topic A
    $responseUpdate = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->put(route('topics.update', $topicA), [
            'title' => 'Tema Editable A (Modificado)',
            'area' => 'Computación',
        ]);
    $responseUpdate->assertRedirect();
    expect($topicA->fresh()->title)->toBe('Tema Editable A (Modificado)');

    // Teacher B in Inst B cannot update topic A
    $responseForbidden = $this->actingAs($this->teacherB)
        ->withSession(['current_institution_id' => $this->instB->id])
        ->put(route('topics.update', $topicA), [
            'title' => 'Hackeado por B',
        ]);
    $responseForbidden->assertForbidden();
});

test('super admin in global mode can promote an institutional topic to the global bank', function () {
    $topicA = Topic::create([
        'title' => 'Tema Innovador Sede A',
        'area' => 'Computación',
        'is_global' => false,
        'institution_id' => $this->instA->id,
        'status' => 'local',
    ]);

    // Teacher B initially cannot see topic A
    $responseBefore = $this->actingAs($this->teacherB)
        ->withSession(['current_institution_id' => $this->instB->id])
        ->get(route('topics.index'));
    $idsBefore = collect($responseBefore->inertiaPage()['props']['topics'])->pluck('id');
    expect($idsBefore)->not->toContain($topicA->id);

    // Super Admin promotes topic A to global
    $promoteResponse = $this->actingAs($this->superAdmin)
        ->withSession(['current_institution_id' => 'global'])
        ->post(route('topics.promote', $topicA));

    $promoteResponse->assertRedirect();
    expect($topicA->fresh()->is_global)->toBeTrue();
    expect($topicA->fresh()->status)->toBe('published');

    // Now Teacher B in Inst B CAN see topic A
    $responseAfter = $this->actingAs($this->teacherB)
        ->withSession(['current_institution_id' => $this->instB->id])
        ->get(route('topics.index'));
    $idsAfter = collect($responseAfter->inertiaPage()['props']['topics'])->pluck('id');
    expect($idsAfter)->toContain($topicA->id);
});

test('course in institution A can add global topics and institution A topics, but not institution B topics', function () {
    $courseA = Course::create([
        'institution_id' => $this->instA->id,
        'name' => 'Programación I',
        'code' => 'PROG-101',
        'status' => 'active',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addMonths(3)->toDateString(),
    ]);

    $topicA = Topic::create([
        'title' => 'Tema Sede A',
        'area' => 'Computación',
        'is_global' => false,
        'institution_id' => $this->instA->id,
    ]);

    $topicB = Topic::create([
        'title' => 'Tema Sede B',
        'area' => 'Computación',
        'is_global' => false,
        'institution_id' => $this->instB->id,
    ]);

    // Add Topic A to Course A -> Allowed
    $resA = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->post(route('courses.topics.add', $courseA), [
            'topic_id' => $topicA->id,
            'title' => 'Tema Sede A en Pensum',
        ]);
    $resA->assertRedirect();
    expect($courseA->courseTopics()->count())->toBe(1);

    // Add Global Topic to Course A -> Allowed
    $resGlobal = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->post(route('courses.topics.add', $courseA), [
            'topic_id' => $this->globalTopic->id,
            'title' => 'Tema Global en Pensum',
        ]);
    $resGlobal->assertRedirect();
    expect($courseA->courseTopics()->count())->toBe(2);

    // Attempt to add Topic B to Course A -> Forbidden!
    $resB = $this->actingAs($this->teacherA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->post(route('courses.topics.add', $courseA), [
            'topic_id' => $topicB->id,
            'title' => 'Intento ilegal',
        ]);
    $resB->assertForbidden();
    expect($courseA->courseTopics()->count())->toBe(2);
});
