<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ClassSessionController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TopicController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Courses
    Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');
    Route::post('/courses', [CourseController::class, 'store'])->name('courses.store');
    Route::get('/courses/{course}', [CourseController::class, 'show'])->name('courses.show');
    Route::post('/courses/{course}/topics', [CourseController::class, 'addTopic'])->name('courses.topics.add');
    Route::post('/courses/{course}/topics/reorder', [CourseController::class, 'reorderTopics'])->name('courses.topics.reorder');

    // Enrollments
    Route::post('/courses/{course}/enrollments', [EnrollmentController::class, 'store'])->name('courses.enrollments.store');
    Route::post('/courses/{course}/enrollments/create-and-enroll', [EnrollmentController::class, 'createAndEnroll'])->name('courses.enrollments.create');

    // Subjects (Asignaturas)
    Route::get('/subjects', [SubjectController::class, 'index'])->name('subjects.index');
    Route::post('/subjects', [SubjectController::class, 'store'])->name('subjects.store');

    // Global Topics Bank
    Route::get('/topics', [TopicController::class, 'index'])->name('topics.index');
    Route::post('/topics', [TopicController::class, 'store'])->name('topics.store');

    // Dynamic Class Sessions & Topic Suggestion
    Route::get('/courses/{course}/sessions/create', [ClassSessionController::class, 'create'])->name('courses.sessions.create');
    Route::post('/courses/{course}/sessions/suggest', [ClassSessionController::class, 'suggestTopic'])->name('courses.sessions.suggest');
    Route::post('/courses/{course}/sessions', [ClassSessionController::class, 'store'])->name('courses.sessions.store');
});


require __DIR__.'/settings.php';
