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
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. "Programación Web", "Matemáticas Discretas"
            $table->string('code')->nullable(); // e.g. "PW-101"
            $table->text('description')->nullable();
            $table->string('color')->nullable(); // hex badge color
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['name', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subjects');
    }
};
