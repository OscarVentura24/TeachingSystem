<?php

use App\Models\AcademicPeriod;
use App\Models\Assessment;
use App\Models\AssessmentScore;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Enrollment;
use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Models\SessionAttendance;
use App\Models\Student;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use App\Models\User;
use App\Services\StudentProfileService;

beforeEach(function () {
    $this->institution = Institution::create([
        'name' => 'Instituto Politécnico Santiago',
        'code' => 'IPS',
        'slug' => 'instituto-politecnico-santiago',
        'is_active' => true,
    ]);

    $this->otherInstitution = Institution::create([
        'name' => 'Colegio San Juan',
        'code' => 'CSJ',
        'slug' => 'colegio-san-juan',
        'is_active' => true,
    ]);

    $this->admin = User::factory()->create(['email' => 'admin@ips.edu']);
    InstitutionMembership::create([
        'user_id' => $this->admin->id,
        'institution_id' => $this->institution->id,
        'role' => 'admin',
        'is_active' => true,
    ]);

    $this->otherUser = User::factory()->create(['email' => 'other@csj.edu']);
    InstitutionMembership::create([
        'user_id' => $this->otherUser->id,
        'institution_id' => $this->otherInstitution->id,
        'role' => 'teacher',
        'is_active' => true,
    ]);

    // Create periods
    $this->period2025 = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2025-2026',
        'start_date' => '2025-09-01',
        'end_date' => '2026-06-30',
        'is_current' => false,
        'is_closed' => true,
    ]);

    $this->period2026 = AcademicPeriod::create([
        'institution_id' => $this->institution->id,
        'name' => '2026-2027',
        'start_date' => '2026-09-01',
        'end_date' => '2027-06-30',
        'is_current' => true,
        'is_closed' => false,
    ]);

    // Create student
    $this->student = Student::create([
        'institution_id' => $this->institution->id,
        'first_name' => 'Carlos',
        'last_name' => 'Ramírez',
        'student_id_number' => 'IPS-2026-001',
        'email' => 'carlos.ramirez@ips.edu',
        'phone' => '+1 809 555 1234',
        'notes' => 'Estudiante destacado en ciencias y computación.',
        'is_active' => true,
    ]);

    // Period 2025: 3er Curso (Student was promoted)
    $this->course3rd = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period2025->id,
        'name' => '3er Curso',
        'section' => '3-A',
        'code' => '3ER-A',
        'status' => 'archived',
    ]);
    Enrollment::create([
        'course_id' => $this->course3rd->id,
        'student_id' => $this->student->id,
        'status' => 'promoted',
        'preferred_workstation' => 'PC-05',
        'enrolled_at' => '2025-09-01',
    ]);

    // Period 2026: 4to Curso (Student is currently active)
    $this->course4th = Course::create([
        'institution_id' => $this->institution->id,
        'academic_period_id' => $this->period2026->id,
        'name' => '4to Curso',
        'section' => '4-A',
        'code' => '4TO-A',
        'status' => 'active',
    ]);
    Enrollment::create([
        'course_id' => $this->course4th->id,
        'student_id' => $this->student->id,
        'status' => 'active',
        'preferred_workstation' => 'PC-12',
        'enrolled_at' => '2026-09-01',
    ]);

    // Create an assessment and score in 4to Curso
    $this->assessment = Assessment::create([
        'course_id' => $this->course4th->id,
        'created_by_user_id' => $this->admin->id,
        'title' => 'Examen Parcial de Algoritmos',
        'assessment_type' => 'exam',
        'max_score' => 100,
        'weight_percentage' => 30,
        'assessment_date' => '2026-10-10',
    ]);
    AssessmentScore::create([
        'assessment_id' => $this->assessment->id,
        'student_id' => $this->student->id,
        'score' => 92,
        'status' => 'graded',
        'feedback' => 'Excelente resolución de problemas lógicos.',
        'graded_at' => now(),
    ]);

    // Create a class session and attendance
    $this->session = ClassSession::create([
        'course_id' => $this->course4th->id,
        'created_by_user_id' => $this->admin->id,
        'session_date' => '2026-10-05',
        'start_time' => '08:00',
        'end_time' => '10:00',
        'title' => 'Estructuras de Control Avanzadas',
        'status' => 'completed',
    ]);
    SessionAttendance::create([
        'class_session_id' => $this->session->id,
        'student_id' => $this->student->id,
        'workstation' => 'PC-12',
        'notes' => 'Participación activa en el laboratorio.',
    ]);

    // Create topic progress
    $topic = Topic::create([
        'title' => 'Bucles y Recursividad',
        'area' => 'Informática',
        'institution_id' => $this->institution->id,
    ]);
    $courseTopic = CourseTopic::create([
        'course_id' => $this->course4th->id,
        'topic_id' => $topic->id,
        'title' => 'Bucles y Recursividad',
        'sort_order' => 1,
    ]);
    StudentTopicProgress::create([
        'class_session_id' => $this->session->id,
        'student_id' => $this->student->id,
        'course_topic_id' => $courseTopic->id,
        'coverage_status' => 'covered',
        'mastery_level' => 'mastered',
        'evaluation_notes' => 'Demostró dominio completo en la práctica.',
        'evaluated_at' => now(),
    ]);
});

test('authorized staff can view student profile and trajectory page', function () {
    $response = $this->actingAs($this->admin)
        ->withSession(['current_institution_id' => $this->institution->id])
        ->get(route('students.show', $this->student));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('students/show')
            ->has('student', fn ($s) => $s
                ->where('id', $this->student->id)
                ->where('first_name', 'Carlos')
                ->where('last_name', 'Ramírez')
                ->where('student_id_number', 'IPS-2026-001')
                ->where('is_active', true)
                ->etc()
            )
            ->has('metrics', fn ($m) => $m
                ->where('total_periods', 2)
                ->where('total_courses', 2)
                ->where('promoted_courses', 1)
                ->where('active_courses', 1)
                ->where('average_score', 92)
                ->where('assessments_taken', 1)
                ->where('topics_mastered', 1)
                ->etc()
            )
            ->has('trajectory', 2) // 2 academic periods in trajectory
            ->has('assessments', 1)
            ->has('attendances', 1)
            ->has('topicProgress', 1)
            ->where('canEdit', true)
            ->where('canDelete', true)
        );
});

test('StudentProfileService calculates structured trajectory and metrics accurately', function () {
    $service = app(StudentProfileService::class);
    $data = $service->getStudentProfile($this->student);

    expect($data['student']['full_name'])->toBe('Carlos Ramírez');
    expect($data['metrics']['total_courses'])->toBe(2);
    expect($data['metrics']['promoted_courses'])->toBe(1);
    expect($data['metrics']['active_courses'])->toBe(1);
    expect($data['metrics']['average_score'])->toBe(92.0);
    expect($data['metrics']['topics_mastered'])->toBe(1);

    // Verify trajectory periods order: current period (2026-2027) first, then closed period (2025-2026)
    expect($data['trajectory'])->toHaveCount(2);
    expect($data['trajectory'][0]['period']['name'])->toBe('2026-2027');
    expect($data['trajectory'][0]['period']['is_current'])->toBeTrue();
    expect($data['trajectory'][0]['courses'][0]['name'])->toBe('4to Curso');
    expect($data['trajectory'][0]['courses'][0]['enrollment_status'])->toBe('active');

    expect($data['trajectory'][1]['period']['name'])->toBe('2025-2026');
    expect($data['trajectory'][1]['period']['is_closed'])->toBeTrue();
    expect($data['trajectory'][1]['courses'][0]['name'])->toBe('3er Curso');
    expect($data['trajectory'][1]['courses'][0]['enrollment_status'])->toBe('promoted');
});

test('user from another institution cannot view student ficha', function () {
    $response = $this->actingAs($this->otherUser)
        ->withSession(['current_institution_id' => $this->otherInstitution->id])
        ->get(route('students.show', $this->student));

    $response->assertForbidden();
});
