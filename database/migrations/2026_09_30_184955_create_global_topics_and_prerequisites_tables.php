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
        Schema::create('topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('area'); // e.g. "Programación", "Matemáticas", "Bases de Datos"
            $table->string('unit_title')->nullable(); // e.g. "Unidad 1: Estructuras de Control"
            $table->text('short_summary')->nullable();
            $table->text('description')->nullable();
            $table->text('resources_notes')->nullable(); // links, bibliografía, guías didácticas
            $table->integer('estimated_minutes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['area', 'is_active']);
        });

        Schema::create('topic_prerequisites', function (Blueprint $table) {
            $table->foreignId('topic_id')->constrained('topics')->cascadeOnDelete();
            $table->foreignId('prerequisite_topic_id')->constrained('topics')->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['topic_id', 'prerequisite_topic_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('topic_prerequisites');
        Schema::dropIfExists('topics');
    }
};
