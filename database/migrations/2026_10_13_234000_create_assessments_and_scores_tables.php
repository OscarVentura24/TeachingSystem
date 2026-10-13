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
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('assessment_type')->default('exam'); // 'exam', 'practical', 'project', 'quiz'
            $table->date('assessment_date');
            $table->decimal('max_score', 5, 2)->default(100.00);
            $table->decimal('passing_score', 5, 2)->default(70.00);
            $table->decimal('weight_percentage', 5, 2)->nullable();
            $table->boolean('auto_sync_mastery')->default(true);
            $table->timestamps();

            $table->index(['course_id', 'assessment_date']);
        });

        Schema::create('assessment_topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->foreignId('course_topic_id')->constrained('course_topics')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['assessment_id', 'course_topic_id']);
        });

        Schema::create('assessment_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->decimal('score', 5, 2)->nullable();
            $table->string('status')->default('present'); // 'present', 'absent', 'excused'
            $table->text('feedback')->nullable();
            $table->timestamp('graded_at')->nullable();
            $table->timestamps();

            $table->unique(['assessment_id', 'student_id']);
            $table->index(['student_id', 'assessment_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_scores');
        Schema::dropIfExists('assessment_topics');
        Schema::dropIfExists('assessments');
    }
};
