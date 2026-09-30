<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('class_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->date('session_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('title')->nullable(); // e.g. "Práctica de Laboratorio 1"
            $table->text('notes')->nullable();
            $table->string('status')->default('draft'); // 'draft', 'completed', 'cancelled'
            $table->timestamps();

            $table->index(['course_id', 'session_date']);
            $table->index(['course_id', 'status']);
        });

        Schema::create('session_topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_session_id')->constrained('class_sessions')->cascadeOnDelete();
            $table->foreignId('course_topic_id')->constrained('course_topics')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['class_session_id', 'course_topic_id']);
        });

        Schema::create('session_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_session_id')->constrained('class_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('workstation')->nullable(); // e.g. "PC-01", "Puesto 4"
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['class_session_id', 'student_id']);
        });

        Schema::create('student_topic_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_session_id')->nullable()->constrained('class_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('course_topic_id')->constrained('course_topics')->cascadeOnDelete();
            
            // Dimensión 1: Cobertura
            $table->string('coverage_status')->default('explained'); // 'explained', 'pending'

            // Dimensión 2: Aprendizaje / Dominio
            $table->string('mastery_level')->default('not_evaluated'); // 'not_evaluated', 'needs_reinforcement', 'mastered'
            
            $table->text('evaluation_notes')->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();

            $table->index(['class_session_id', 'student_id', 'course_topic_id']);
            $table->index(['student_id', 'course_topic_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_topic_progress');
        Schema::dropIfExists('session_attendances');
        Schema::dropIfExists('session_topics');
        Schema::dropIfExists('class_sessions');
    }
};
