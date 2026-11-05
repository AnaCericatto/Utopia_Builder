<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\BuildController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ExploreController;
use App\Http\Controllers\HomeController;

Route::get('/', HomeController::class)->name('home');
Route::get('/explore', [ExploreController::class, 'index'])->name('explore');

Route::get('/dashboard', fn () => redirect()->route('builds.index'))
    ->middleware(['auth', 'verified'])
    ->name('dashboard');
    
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/builds', [BuildController::class, 'store'])->middleware('throttle:build-save')->name('builds.store');
    Route::put('/builds/{build}', [BuildController::class, 'update'])->middleware('throttle:build-save')->name('builds.update');
});

Route::middleware('auth')->group(function () {
    Route::get('/builds', [BuildController::class, 'index'])->name('builds.index');
    Route::get('/builds/create', [BuildController::class, 'create'])->name('builds.create');
    Route::post('/builds', [BuildController::class, 'store'])->name('builds.store');
    Route::get('/builds/{build}/edit', [BuildController::class, 'edit'])->name('builds.edit');
    Route::put('/builds/{build}', [BuildController::class, 'update'])->name('builds.update');
    Route::delete('/builds/{build}', [BuildController::class, 'destroy'])->name('builds.destroy');
    Route::post('/builds', [BuildController::class, 'store'])->middleware('throttle:build-save')->name('builds.store');
    Route::put('/builds/{build}', [BuildController::class, 'update'])->middleware('throttle:build-save')->name('builds.update');
});

// Public: anyone with the link can open public/unlisted builds
Route::get('/builds/{build}', [BuildController::class, 'show'])->name('builds.show');

require __DIR__.'/auth.php';
