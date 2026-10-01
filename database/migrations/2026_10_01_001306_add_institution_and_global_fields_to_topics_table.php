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
            $table->foreignId('institution_id')->nullable()->after('subject_id')->constrained('institutions')->nullOnDelete();
            $table->foreignId('source_topic_id')->nullable()->after('institution_id')->constrained('topics')->nullOnDelete();
            $table->boolean('is_global')->default(false)->after('source_topic_id');
            $table->string('status', 50)->default('published')->after('is_global');

            $table->index(['institution_id', 'is_global']);
        });

        // Set all pre-existing topics as global
        \Illuminate\Support\Facades\DB::table('topics')->whereNull('institution_id')->update([
            'is_global' => true,
            'status' => 'published',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->dropForeign(['institution_id']);
            $table->dropForeign(['source_topic_id']);
            $table->dropIndex(['institution_id', 'is_global']);
            $table->dropColumn(['institution_id', 'source_topic_id', 'is_global', 'status']);
        });
    }
};
