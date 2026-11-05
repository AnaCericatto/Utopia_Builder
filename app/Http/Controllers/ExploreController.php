<?php

namespace App\Http\Controllers;

use App\Models\Build;
use Inertia\Inertia;

class ExploreController extends Controller
{
    public function index()
    {
        $builds = Build::public()
            ->with('user:id,name,username')
            ->withCount('steps')
            ->latest('id')
            ->limit(24)
            ->get()
            ->map(fn (Build $b) => $b->toCard())
            ->values();

        return Inertia::render('Explore', ['builds' => $builds]);
    }
}