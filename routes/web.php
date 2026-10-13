<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ClassSessionController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TopicController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', \App\Http\Controllers\DashboardController::class)->name('dashboard');

    // Courses
    Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');
    Route::post('/courses', [CourseController::class, 'store'])->name('courses.store');
    Route::get('/courses/{course}', [CourseController::class, 'show'])->name('courses.show');
    Route::put('/courses/{course}', [CourseController::class, 'update'])->name('courses.update');
    Route::delete('/courses/{course}', [CourseController::class, 'destroy'])->name('courses.destroy');
    Route::post('/courses/{course}/topics', [CourseController::class, 'addTopic'])->name('courses.topics.add');
    Route::post('/courses/{course}/topics/bulk-import', [CourseController::class, 'bulkAddTopics'])->name('courses.topics.bulk-import');
    Route::delete('/courses/{course}/topics/{courseTopic}', [CourseController::class, 'removeTopic'])->name('courses.topics.remove');
    Route::post('/courses/{course}/topics/reorder', [CourseController::class, 'reorderTopics'])->name('courses.topics.reorder');
    Route::delete('/courses/{course}/students/{student}', [CourseController::class, 'removeStudent'])->name('courses.students.remove');

    // Enrollments
    Route::post('/courses/{course}/enrollments', [EnrollmentController::class, 'store'])->name('courses.enrollments.store');
    Route::post('/courses/{course}/enrollments/create-and-enroll', [EnrollmentController::class, 'createAndEnroll'])->name('courses.enrollments.create');

    // Subjects (Asignaturas)
    Route::get('/subjects', [SubjectController::class, 'index'])->name('subjects.index');
    Route::post('/subjects', [SubjectController::class, 'store'])->name('subjects.store');
    Route::put('/subjects/{subject}', [SubjectController::class, 'update'])->name('subjects.update');
    Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy'])->name('subjects.destroy');

    // Academic Periods (Períodos Académicos)
    Route::post('/academic-periods', [\App\Http\Controllers\AcademicPeriodController::class, 'store'])->name('academic-periods.store');
    Route::put('/academic-periods/{academicPeriod}', [\App\Http\Controllers\AcademicPeriodController::class, 'update'])->name('academic-periods.update');
    Route::delete('/academic-periods/{academicPeriod}', [\App\Http\Controllers\AcademicPeriodController::class, 'destroy'])->name('academic-periods.destroy');

    // Topics Bank (Global & Institutional)
    Route::get('/topics', [TopicController::class, 'index'])->name('topics.index');
    Route::post('/topics', [TopicController::class, 'store'])->name('topics.store');
    Route::put('/topics/{topic}', [TopicController::class, 'update'])->name('topics.update');
    Route::delete('/topics/{topic}', [TopicController::class, 'destroy'])->name('topics.destroy');
    Route::post('/topics/{topic}/promote', [TopicController::class, 'promoteToGlobal'])->name('topics.promote');
    Route::post('/topics/{topic}/reorder-subtopics', [TopicController::class, 'reorderSubtopics'])->name('topics.reorder-subtopics');

    // Students (Padrón Institucional de Estudiantes)
    Route::get('/students', [\App\Http\Controllers\StudentController::class, 'index'])->name('students.index');
    Route::get('/students/generate-matricula', [\App\Http\Controllers\StudentController::class, 'generateMatricula'])->name('students.generate-matricula');
    Route::post('/students', [\App\Http\Controllers\StudentController::class, 'store'])->name('students.store');
    Route::put('/students/{student}', [\App\Http\Controllers\StudentController::class, 'update'])->name('students.update');
    Route::delete('/students/{student}', [\App\Http\Controllers\StudentController::class, 'destroy'])->name('students.destroy');

    // Dynamic Class Sessions & Topic Suggestion
    Route::get('/courses/{course}/sessions/create', [ClassSessionController::class, 'create'])->name('courses.sessions.create');
    Route::post('/courses/{course}/sessions/suggest', [ClassSessionController::class, 'suggestTopic'])->name('courses.sessions.suggest');
    Route::post('/courses/{course}/sessions', [ClassSessionController::class, 'store'])->name('courses.sessions.store');

    // Course Teachers Assignment
    Route::post('/courses/{course}/teachers', [CourseController::class, 'addTeacher'])->name('courses.teachers.add');
    Route::delete('/courses/{course}/teachers/{user}', [CourseController::class, 'removeTeacher'])->name('courses.teachers.remove');

    // Teachers & Staff Management
    Route::get('/teachers', [\App\Http\Controllers\TeacherController::class, 'index'])->name('teachers.index');
    Route::post('/teachers', [\App\Http\Controllers\TeacherController::class, 'store'])->name('teachers.store');
    Route::put('/teachers/{teacher}', [\App\Http\Controllers\TeacherController::class, 'update'])->name('teachers.update');
    Route::delete('/teachers/{teacher}', [\App\Http\Controllers\TeacherController::class, 'destroy'])->name('teachers.destroy');

    // Institutions Management & Tenant Switcher
    Route::get('/institutions', [\App\Http\Controllers\InstitutionController::class, 'index'])->name('institutions.index');
    Route::post('/institutions', [\App\Http\Controllers\InstitutionController::class, 'store'])->name('institutions.store');
    Route::put('/institutions/{institution}', [\App\Http\Controllers\InstitutionController::class, 'update'])->name('institutions.update');
    Route::delete('/institutions/{institution}', [\App\Http\Controllers\InstitutionController::class, 'destroy'])->name('institutions.destroy');
    Route::post('/institutions/switch', [\App\Http\Controllers\InstitutionController::class, 'switch'])->name('institutions.switch');
});


require __DIR__.'/settings.php';
