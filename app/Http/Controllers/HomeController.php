<?php

namespace App\Http\Controllers;

use App\Models\Build;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function __invoke()
    {
        $featured = Build::public()
            ->with('user:id,name,username')
            ->withCount('steps')
            ->latest('id')
            ->limit(3)
            ->get()
            ->map(fn (Build $b) => $b->toCard())
            ->values();

        return Inertia::render('Welcome', ['featured' => $featured]);
    }
}