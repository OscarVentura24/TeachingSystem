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
        if (!Schema::hasColumn('class_sessions', 'duration_minutes')) {
            Schema::table('class_sessions', function (Blueprint $table) {
                $table->unsignedSmallInteger('duration_minutes')->nullable()->after('end_time');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('class_sessions', 'duration_minutes')) {
            Schema::table('class_sessions', function (Blueprint $table) {
                $table->dropColumn('duration_minutes');
            });
        }
    }
};
