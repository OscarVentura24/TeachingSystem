<?php

use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use App\Services\TopicSuggestionEngine;

beforeEach(function () {
    $this->engine = new TopicSuggestionEngine();

    $this->institution = Institution::create([
        'name' => 'Academia Digital',
        'slug' => 'academia-digital',
    ]);

    $this->course = Course::create([
        'institution_id' => $this->institution->id,
        'name' => 'Desarrollo Web',
    ]);

    // Create 3 Global Topics with sequential prerequisites: Topic 1 -> Topic 2 -> Topic 3
    $this->topic1 = Topic::create([
        'title' => 'HTML Básico',
        'area' => 'Web',
    ]);

    $this->topic2 = Topic::create([
        'title' => 'CSS Flexbox',
        'area' => 'Web',
    ]);
    $this->topic2->prerequisites()->attach($this->topic1->id);

    $this->topic3 = Topic::create([
        'title' => 'JavaScript DOM',
        'area' => 'Web',
    ]);
    $this->topic3->prerequisites()->attach($this->topic2->id);

    // Create Course Topics (Pensum)
    $this->courseTopic1 = CourseTopic::create([
        'course_id' => $this->course->id,
        'topic_id' => $this->topic1->id,
        'title' => 'HTML Básico',
        'sort_order' => 1,
    ]);

    $this->courseTopic2 = CourseTopic::create([
        'course_id' => $this->course->id,
        'topic_id' => $this->topic2->id,
        'title' => 'CSS Flexbox',
        'sort_order' => 2,
    ]);

    $this->courseTopic3 = CourseTopic::create([
        'course_id' => $this->course->id,
        'topic_id' => $this->topic3->id,
        'title' => 'JavaScript DOM',
        'sort_order' => 3,
    ]);

    // Create 4 Students
    $this->student1 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Carlos',
        'last_name' => 'Rivas',
    ]);

    $this->student2 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Elena',
        'last_name' => 'Pérez',
    ]);

    $this->student3 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Mateo',
        'last_name' => 'García',
    ]);

    $this->student4 = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Sofía',
        'last_name' => 'López',
    ]);
});

test('it handles empty student selection safely', function () {
    $result = $this->engine->suggest($this->course, []);

    expect($result['status'])->toBe('empty_selection')
        ->and($result['primary_recommendation'])->toBeNull();
});

test('it suggests the first topic when students have zero previous progress', function () {
    $presentIds = [$this->student1->id, $this->student2->id];

    $result = $this->engine->suggest($this->course, $presentIds);

    expect($result['status'])->toBe('success')
        ->and($result['present_students_count'])->toBe(2)
        ->and($result['primary_recommendation']['action_type'])->toBe('start')
        ->and($result['primary_recommendation']['course_topic_id'])->toBe($this->courseTopic1->id)
        ->and($result['primary_recommendation']['ready_and_pending_count'])->toBe(2);
});

test('it suggests advancing to topic 2 when all present students completed topic 1', function () {
    $presentIds = [$this->student1->id, $this->student2->id];

    // Both students completed Topic 1
    StudentTopicProgress::create([
        'student_id' => $this->student1->id,
        'course_topic_id' => $this->courseTopic1->id,
        'coverage_status' => 'explained',
    ]);

    StudentTopicProgress::create([
        'student_id' => $this->student2->id,
        'course_topic_id' => $this->courseTopic1->id,
        'coverage_status' => 'explained',
    ]);

    $result = $this->engine->suggest($this->course, $presentIds);

    expect($result['primary_recommendation']['action_type'])->toBe('advance')
        ->and($result['primary_recommendation']['course_topic_id'])->toBe($this->courseTopic2->id)
        ->and($result['primary_recommendation']['ready_and_pending_count'])->toBe(2);
});

test('it detects divergent progress and recommends leveling for lagging students', function () {
    // Carlos (student1) and Elena (student2) completed Topic 1
    StudentTopicProgress::create([
        'student_id' => $this->student1->id,
        'course_topic_id' => $this->courseTopic1->id,
        'coverage_status' => 'explained',
    ]);

    StudentTopicProgress::create([
        'student_id' => $this->student2->id,
        'course_topic_id' => $this->courseTopic1->id,
        'coverage_status' => 'explained',
    ]);

    // Mateo (student3) missed Topic 1, so he hasn't seen anything yet!
    $presentIds = [$this->student1->id, $this->student2->id, $this->student3->id];

    $result = $this->engine->suggest($this->course, $presentIds);

    // Topic 1 should be recommended as leveling because Mateo needs it before advancing to Topic 2!
    expect($result['primary_recommendation']['action_type'])->toBe('review_leveling')
        ->and($result['primary_recommendation']['course_topic_id'])->toBe($this->courseTopic1->id)
        ->and($result['primary_recommendation']['ready_and_pending_count'])->toBe(1)
        ->and($result['primary_recommendation']['already_covered_count'])->toBe(2);

    // Analysis for Topic 2 should show 2 ready students and 1 missing prerequisite (Mateo)
    $topic2Analysis = collect($result['analysis'])->firstWhere('course_topic_id', $this->courseTopic2->id);
    expect($topic2Analysis['ready_and_pending_count'])->toBe(2)
        ->and($topic2Analysis['missing_prerequisites_count'])->toBe(1)
        ->and($topic2Analysis['missing_prerequisite_students'][0]['id'])->toBe($this->student3->id);
});

test('it reports all completed when all present students completed the entire syllabus', function () {
    $presentIds = [$this->student1->id];

    // Student 1 completed all 3 topics
    foreach ([$this->courseTopic1, $this->courseTopic2, $this->courseTopic3] as $ct) {
        StudentTopicProgress::create([
            'student_id' => $this->student1->id,
            'course_topic_id' => $ct->id,
            'coverage_status' => 'explained',
        ]);
    }

    $result = $this->engine->suggest($this->course, $presentIds);

    expect($result['primary_recommendation']['action_type'])->toBe('all_completed')
        ->and($result['primary_recommendation']['course_topic_id'])->toBeNull();
});
