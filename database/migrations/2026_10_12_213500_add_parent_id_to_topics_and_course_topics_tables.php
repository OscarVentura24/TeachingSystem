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
        Schema::table('topics', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('subject_id')->constrained('topics')->cascadeOnDelete();
        });

        Schema::table('course_topics', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('topic_id')->constrained('course_topics')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('course_topics', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
        });

        Schema::table('topics', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
        });
    }
};
