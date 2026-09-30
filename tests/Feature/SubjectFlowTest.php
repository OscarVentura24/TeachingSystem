<?php

use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create([
        'name' => 'Profesor Roberto',
        'email' => 'roberto@teachingsystem.test',
    ]);
});

test('user can view subjects list', function () {
    Subject::create([
        'name' => 'Inteligencia Artificial',
        'code' => 'IA-101',
    ]);

    $response = $this->actingAs($this->user)->get(route('subjects.index'));

    $response->assertOk();
});

test('user can create a new subject', function () {
    $response = $this->actingAs($this->user)->post(route('subjects.store'), [
        'name' => 'Desarrollo Móvil',
        'code' => 'DM-201',
        'description' => 'Desarrollo de aplicaciones para iOS y Android.',
    ]);

    $response->assertRedirect();

    $subject = Subject::where('name', 'Desarrollo Móvil')->first();
    expect($subject)->not->toBeNull()
        ->and($subject->code)->toBe('DM-201');
});

test('user can create a topic linked to a subject', function () {
    $subject = Subject::create([
        'name' => 'Sistemas Distribuidos',
        'code' => 'SD-301',
    ]);

    $response = $this->actingAs($this->user)->post(route('topics.store'), [
        'subject_id' => $subject->id,
        'title' => 'Consenso en Sistemas Distribuidos (Raft y Paxos)',
        'unit_title' => 'Unidad 2',
    ]);

    $response->assertRedirect();

    $topic = Topic::where('title', 'Consenso en Sistemas Distribuidos (Raft y Paxos)')->first();
    expect($topic)->not->toBeNull()
        ->and($topic->subject_id)->toBe($subject->id)
        ->and($topic->area)->toBe('Sistemas Distribuidos');
});
