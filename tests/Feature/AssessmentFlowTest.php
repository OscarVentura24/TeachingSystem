<?php

use App\Models\AcademicPeriod;
use App\Models\Assessment;
use App\Models\Course;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentTopicProgress;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create([
        'name' => 'Profesor Miguel',
        'email' => 'miguel@teachingsystem.test',
    ]);

    $this->institution = Institution::create([
        'name' => 'Colegio San Agustín',
        'slug' => 'colegio-san-agustin',
    ]);

    $this->institution->users()->attach($this->user->id, ['role' => 'teacher']);

    $this->period = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-II',
        'is_current' => true,
    ]);

    $this->course = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period->id,
        'name' => 'Robótica y Automatización',
    ]);
    $this->course->teachers()->attach($this->user->id, ['is_primary' => true]);

    $this->topic = $this->course->courseTopics()->create([
        'title' => 'Sensores y Actuadores',
        'sort_order' => 1,
        'is_required' => true,
    ]);

    $this->student1 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Sofía',
        'last_name' => 'Gómez',
    ]);
    $this->student2 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Diego',
        'last_name' => 'Rivas',
    ]);
    $this->student3 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Camila',
        'last_name' => 'Díaz',
    ]);

    $this->course->students()->attach([
        $this->student1->id,
        $this->student2->id,
        $this->student3->id,
    ]);
});

test('teacher can create an assessment with linked course topics', function () {
    $response = $this->actingAs($this->user)->post("/courses/{$this->course->id}/assessments", [
        'title' => 'Examen Parcial de Sensores',
        'description' => 'Evaluación de conocimientos teóricos y conexionado',
        'assessment_type' => 'exam',
        'assessment_date' => '2026-10-20',
        'max_score' => 100,
        'passing_score' => 70,
        'weight_percentage' => 30,
        'auto_sync_mastery' => true,
        'topic_ids' => [$this->topic->id],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $assessment = Assessment::where('title', 'Examen Parcial de Sensores')->first();
    expect($assessment)->not->toBeNull();
    expect($assessment->course_id)->toBe($this->course->id);
    expect($assessment->max_score)->toBe('100.00');
    expect($assessment->topics()->count())->toBe(1);
    expect($assessment->topics()->first()->id)->toBe($this->topic->id);
});

test('teacher can update an assessment', function () {
    $assessment = Assessment::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'title' => 'Prueba Inicial',
        'assessment_type' => 'quiz',
        'assessment_date' => '2026-10-15',
        'max_score' => 20,
        'passing_score' => 14,
    ]);

    $response = $this->actingAs($this->user)->put("/courses/{$this->course->id}/assessments/{$assessment->id}", [
        'title' => 'Prueba Actualizada',
        'assessment_type' => 'practical',
        'assessment_date' => '2026-10-18',
        'max_score' => 20,
        'passing_score' => 14,
        'weight_percentage' => 15,
        'auto_sync_mastery' => true,
        'topic_ids' => [$this->topic->id],
    ]);

    $response->assertRedirect();
    $assessment->refresh();
    expect($assessment->title)->toBe('Prueba Actualizada');
    expect($assessment->assessment_type)->toBe('practical');
    expect($assessment->topics()->count())->toBe(1);
});

test('teacher can delete an assessment', function () {
    $assessment = Assessment::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'title' => 'Prueba a Borrar',
        'assessment_type' => 'quiz',
        'assessment_date' => '2026-10-15',
        'max_score' => 20,
        'passing_score' => 14,
    ]);

    $response = $this->actingAs($this->user)->delete("/courses/{$this->course->id}/assessments/{$assessment->id}");

    $response->assertRedirect();
    expect(Assessment::find($assessment->id))->toBeNull();
});

test('teacher can save scores and automatically synchronize topic mastery levels', function () {
    $assessment = Assessment::create([
        'course_id' => $this->course->id,
        'created_by_user_id' => $this->user->id,
        'title' => 'Examen Práctico de Laboratorio',
        'assessment_type' => 'practical',
        'assessment_date' => '2026-10-22',
        'max_score' => 100,
        'passing_score' => 70,
        'auto_sync_mastery' => true,
    ]);
    $assessment->topics()->attach($this->topic->id);

    // Student 1 gets 90/100 (>= 85% -> mastered)
    // Student 2 gets 75/100 (>= 70% passing -> not_evaluated/explained)
    // Student 3 gets 50/100 (< 70% failing -> needs_reinforcement)
    $response = $this->actingAs($this->user)->post("/courses/{$this->course->id}/assessments/{$assessment->id}/scores", [
        'scores' => [
            [
                'student_id' => $this->student1->id,
                'score' => 90,
                'status' => 'present',
                'feedback' => 'Excelente conexionado',
            ],
            [
                'student_id' => $this->student2->id,
                'score' => 75,
                'status' => 'present',
                'feedback' => 'Aprobó con buen ritmo',
            ],
            [
                'student_id' => $this->student3->id,
                'score' => 50,
                'status' => 'present',
                'feedback' => 'Dificultad con la polaridad de los sensores',
            ],
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Verify scores table
    expect($assessment->scores()->count())->toBe(3);

    // Verify automated StudentTopicProgress synchronization!
    $p1 = StudentTopicProgress::where('student_id', $this->student1->id)
        ->where('course_topic_id', $this->topic->id)
        ->first();
    expect($p1)->not->toBeNull();
    expect($p1->mastery_level)->toBe('mastered');

    $p2 = StudentTopicProgress::where('student_id', $this->student2->id)
        ->where('course_topic_id', $this->topic->id)
        ->first();
    expect($p2)->not->toBeNull();
    expect($p2->mastery_level)->toBe('not_evaluated');

    $p3 = StudentTopicProgress::where('student_id', $this->student3->id)
        ->where('course_topic_id', $this->topic->id)
        ->first();
    expect($p3)->not->toBeNull();
    expect($p3->mastery_level)->toBe('needs_reinforcement');
    expect($p3->evaluation_notes)->toContain('Examen Práctico de Laboratorio');
});

test('unauthorized user cannot create assessments in course', function () {
    $otherUser = User::factory()->create();

    $response = $this->actingAs($otherUser)->post("/courses/{$this->course->id}/assessments", [
        'title' => 'Examen No Permitido',
        'assessment_type' => 'exam',
        'assessment_date' => '2026-10-20',
        'max_score' => 100,
        'passing_score' => 70,
    ]);

    $response->assertForbidden();
});
