<?php

use App\Models\AcademicPeriod;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Enrollment;
use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Models\Student;
use App\Models\Topic;
use App\Models\User;

test('it can create and relate domain models accurately in PostgreSQL', function () {
    // 1. Create a Teacher User
    $teacher = User::factory()->create([
        'name' => 'Profesor Carlos',
        'email' => 'carlos@teachingsystem.test',
    ]);

    // 2. Create Institution and Membership
    $institution = Institution::create([
        'name' => 'Instituto Tecnológico Central',
        'slug' => 'instituto-tecnologico-central',
        'code' => 'ITC-01',
    ]);

    $membership = InstitutionMembership::create([
        'institution_id' => $institution->id,
        'user_id' => $teacher->id,
        'role' => 'teacher',
        'is_active' => true,
    ]);

    expect($teacher->institutions->first()->id)->toBe($institution->id);

    // 3. Create Academic Period and Course
    $period = AcademicPeriod::create([
        'institution_id' => $institution->id,
        'name' => '2026-I',
        'is_current' => true,
    ]);

    $course = Course::create([
        'institution_id' => $institution->id,
        'academic_period_id' => $period->id,
        'name' => 'Programación I',
        'section' => 'A',
        'code' => 'PROG-101',
    ]);

    $course->teachers()->attach($teacher->id, ['is_primary' => true]);
    expect($teacher->taughtCourses->first()->name)->toBe('Programación I');

    // 4. Create Students and Enrollments
    $student1 = Student::create([
        'institution_id' => $institution->id,
        'first_name' => 'Ana',
        'last_name' => 'Gómez',
        'student_id_number' => 'STU-001',
    ]);

    $student2 = Student::create([
        'institution_id' => $institution->id,
        'first_name' => 'Luis',
        'last_name' => 'Martínez',
        'student_id_number' => 'STU-002',
    ]);

    Enrollment::create([
        'course_id' => $course->id,
        'student_id' => $student1->id,
        'preferred_workstation' => 'PC-01',
    ]);

    Enrollment::create([
        'course_id' => $course->id,
        'student_id' => $student2->id,
        'preferred_workstation' => 'PC-02',
    ]);

    expect($course->students()->count())->toBe(2);

    // 5. Create Global Topics with Prerequisite
    $topic1 = Topic::create([
        'created_by_user_id' => $teacher->id,
        'title' => 'Variables y Tipos de Datos',
        'area' => 'Programación',
        'unit_title' => 'Unidad 1',
    ]);

    $topic2 = Topic::create([
        'created_by_user_id' => $teacher->id,
        'title' => 'Estructuras Condicionales If/Else',
        'area' => 'Programación',
        'unit_title' => 'Unidad 1',
    ]);

    // Topic 2 requires Topic 1
    $topic2->prerequisites()->attach($topic1->id);
    expect($topic2->prerequisites->first()->title)->toBe('Variables y Tipos de Datos');

    // 6. Create Course Topics Pensum (Snapshot)
    $courseTopic1 = CourseTopic::create([
        'course_id' => $course->id,
        'topic_id' => $topic1->id,
        'title' => $topic1->title,
        'unit_title' => $topic1->unit_title,
        'sort_order' => 1,
    ]);

    $courseTopic2 = CourseTopic::create([
        'course_id' => $course->id,
        'topic_id' => $topic2->id,
        'title' => $topic2->title,
        'unit_title' => $topic2->unit_title,
        'sort_order' => 2,
    ]);

    expect($course->courseTopics()->count())->toBe(2);

    // 7. Create a Dynamic Class Session
    $session = ClassSession::create([
        'course_id' => $course->id,
        'created_by_user_id' => $teacher->id,
        'session_date' => now()->toDateString(),
        'title' => 'Sesión 1: Práctica en Laboratorio',
        'status' => 'completed',
    ]);

    $session->topics()->attach($courseTopic1->id);

    // Register attendance for student1 in PC-01
    $session->attendances()->create([
        'student_id' => $student1->id,
        'workstation' => 'PC-01',
    ]);

    // Student 1 completed topic 1 with mastery 'mastered'
    $session->progressRecords()->create([
        'student_id' => $student1->id,
        'course_topic_id' => $courseTopic1->id,
        'coverage_status' => 'explained',
        'mastery_level' => 'mastered',
    ]);

    expect($session->attendances()->count())->toBe(1);
    expect($session->progressRecords()->first()->coverage_status)->toBe('explained');
    expect($session->progressRecords()->first()->mastery_level)->toBe('mastered');
});
