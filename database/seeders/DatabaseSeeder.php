<?php

namespace Database\Seeders;

use App\Models\AcademicPeriod;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\CourseTopic;
use App\Models\Enrollment;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with demo data.
     */
    public function run(): void
    {
        // 1. Teacher User
        $teacher = User::firstOrCreate(
            ['email' => 'profesor@teachingsystem.test'],
            [
                'name' => 'Profesor Carlos Mendoza',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // 2. Institution
        $institution = Institution::firstOrCreate(
            ['slug' => 'instituto-tecnologico-central'],
            [
                'name' => 'Instituto Tecnológico Central',
                'code' => 'ITC-2026',
                'is_active' => true,
            ]
        );

        $institution->users()->syncWithoutDetaching([
            $teacher->id => ['role' => 'admin', 'is_active' => true],
        ]);

        // 3. Academic Period
        $period = AcademicPeriod::firstOrCreate(
            ['institution_id' => $institution->id, 'name' => '2026-I'],
            ['start_date' => now()->startOfMonth(), 'end_date' => now()->addMonths(5), 'is_current' => true]
        );

        // 4. Course
        $course = Course::firstOrCreate(
            ['institution_id' => $institution->id, 'name' => 'Programación I'],
            [
                'academic_period_id' => $period->id,
                'section' => 'Sección A (Laboratorio)',
                'code' => 'PROG-101',
                'description' => 'Fundamentos de desarrollo web y lógica de programación en computadoras.',
            ]
        );

        $course->teachers()->syncWithoutDetaching([
            $teacher->id => ['is_primary' => true],
        ]);

        // 5. Global Topics with sequential prerequisites
        $topicsData = [
            ['title' => 'HTML5 Estructura y Etiquetas Semánticas', 'area' => 'Programación Web', 'unit' => 'Unidad 1', 'desc' => 'Fundamentos del marcado web.'],
            ['title' => 'CSS3 Selectores y Modelo de Caja', 'area' => 'Programación Web', 'unit' => 'Unidad 1', 'desc' => 'Estilos y dimensionamiento.'],
            ['title' => 'CSS Flexbox y Diseño Responsivo', 'area' => 'Programación Web', 'unit' => 'Unidad 2', 'desc' => 'Distribución flexible de elementos.'],
            ['title' => 'JavaScript: Variables y Tipos de Datos', 'area' => 'Programación Web', 'unit' => 'Unidad 3', 'desc' => 'Lógica básica en el cliente.'],
            ['title' => 'JavaScript: Estructuras Condicionales y Bucles', 'area' => 'Programación Web', 'unit' => 'Unidad 3', 'desc' => 'Control de flujo y repeticiones.'],
        ];

        $previousTopic = null;
        $globalTopics = [];

        foreach ($topicsData as $data) {
            $topic = Topic::firstOrCreate(
                ['title' => $data['title']],
                [
                    'created_by_user_id' => $teacher->id,
                    'area' => $data['area'],
                    'unit_title' => $data['unit'],
                    'description' => $data['desc'],
                    'is_active' => true,
                ]
            );

            if ($previousTopic) {
                $topic->prerequisites()->syncWithoutDetaching([$previousTopic->id]);
            }

            $previousTopic = $topic;
            $globalTopics[] = $topic;
        }

        // 6. Course Pensum (Snapshots)
        $courseTopics = [];
        foreach ($globalTopics as $index => $gt) {
            $courseTopic = CourseTopic::firstOrCreate(
                ['course_id' => $course->id, 'title' => $gt->title],
                [
                    'topic_id' => $gt->id,
                    'unit_title' => $gt->unit_title,
                    'description' => $gt->description,
                    'sort_order' => $index + 1,
                    'is_required' => true,
                ]
            );
            $courseTopics[] = $courseTopic;
        }

        // 7. Students & Enrollments (6 students for 5 lab PCs)
        $studentsData = [
            ['first' => 'Alejandro', 'last' => 'Pérez', 'id_num' => 'STU-101', 'pc' => 'PC-01'],
            ['first' => 'Camila', 'last' => 'Rodríguez', 'id_num' => 'STU-102', 'pc' => 'PC-02'],
            ['first' => 'Daniel', 'last' => 'Gómez', 'id_num' => 'STU-103', 'pc' => 'PC-03'],
            ['first' => 'Mariana', 'last' => 'Silva', 'id_num' => 'STU-104', 'pc' => 'PC-04'],
            ['first' => 'Santiago', 'last' => 'Morales', 'id_num' => 'STU-105', 'pc' => 'PC-05'],
            ['first' => 'Valeria', 'last' => 'Fernández', 'id_num' => 'STU-106', 'pc' => 'PC-01'],
        ];

        $enrolledStudents = [];
        foreach ($studentsData as $sd) {
            $student = Student::firstOrCreate(
                ['institution_id' => $institution->id, 'student_id_number' => $sd['id_num']],
                [
                    'first_name' => $sd['first'],
                    'last_name' => $sd['last'],
                ]
            );

            Enrollment::firstOrCreate(
                ['course_id' => $course->id, 'student_id' => $student->id],
                [
                    'preferred_workstation' => $sd['pc'],
                    'status' => 'active',
                    'enrolled_at' => now()->subDays(10),
                ]
            );

            $enrolledStudents[] = $student;
        }

        // 8. Sample Session: First 5 students attended Topic 1
        $firstSession = ClassSession::firstOrCreate(
            ['course_id' => $course->id, 'title' => 'Práctica 1: Introducción a HTML5'],
            [
                'created_by_user_id' => $teacher->id,
                'session_date' => now()->subDays(3)->toDateString(),
                'status' => 'completed',
            ]
        );

        $firstSession->topics()->syncWithoutDetaching([$courseTopics[0]->id]);

        // First 4 students attended and mastered Topic 1
        for ($i = 0; $i < 4; $i++) {
            $s = $enrolledStudents[$i];

            $firstSession->attendances()->firstOrCreate(
                ['student_id' => $s->id],
                ['workstation' => "PC-0" . ($i + 1)]
            );

            StudentTopicProgress::updateOrCreate(
                [
                    'class_session_id' => $firstSession->id,
                    'student_id' => $s->id,
                    'course_topic_id' => $courseTopics[0]->id,
                ],
                [
                    'coverage_status' => 'explained',
                    'mastery_level' => 'mastered',
                    'evaluated_at' => now()->subDays(3),
                ]
            );
        }

        // Student 5 (Santiago) attended but needs reinforcement
        $s5 = $enrolledStudents[4];
        $firstSession->attendances()->firstOrCreate(
            ['student_id' => $s5->id],
            ['workstation' => 'PC-05']
        );
        StudentTopicProgress::updateOrCreate(
            [
                'class_session_id' => $firstSession->id,
                'student_id' => $s5->id,
                'course_topic_id' => $courseTopics[0]->id,
            ],
            [
                'coverage_status' => 'explained',
                'mastery_level' => 'needs_reinforcement',
                'evaluation_notes' => 'Requiere repasar etiquetas semánticas.',
                'evaluated_at' => now()->subDays(3),
            ]
        );

        // Student 6 (Valeria) was absent in Session 1, so she hasn't seen Topic 1!
    }
}
