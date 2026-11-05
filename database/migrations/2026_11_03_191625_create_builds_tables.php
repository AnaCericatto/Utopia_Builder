<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('builds', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();      // used in shareable URLs
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('data');                            // the block list
            $table->string('visibility', 10)->default('private'); // private | unlisted | public
            $table->string('thumbnail_path')->nullable();
            $table->unsignedInteger('block_count')->default(0);
            $table->timestamps();

            $table->index(['visibility', 'created_at']);
        });

        Schema::create('build_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('build_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');        // order of the step
            $table->string('title');
            $table->text('note')->nullable();
            $table->unsignedInteger('end_index');            // step shows blocks[0 .. end_index)
            $table->timestamps();

            $table->index(['build_id', 'position']);
        });

        Schema::create('build_likes', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('build_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['user_id', 'build_id']);
        });

        Schema::create('build_favorites', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('build_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['user_id', 'build_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('build_favorites');
        Schema::dropIfExists('build_likes');
        Schema::dropIfExists('build_steps');
        Schema::dropIfExists('builds');
    }
};
