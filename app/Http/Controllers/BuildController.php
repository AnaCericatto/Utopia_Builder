<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveBuildRequest;
use App\Models\Build;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;

class BuildController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Builds/Index', [
            'builds' => $request->user()->builds()
                ->latest('updated_at')
                ->get(['public_id', 'title', 'visibility', 'block_count', 'updated_at']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Builds/Editor', ['build' => null]);
    }

    public function store(SaveBuildRequest $request)
    {
        $limit = config('builds.max_per_user');
        if ($request->user()->builds()->count() >= $limit) {
            throw ValidationException::withMessages([
                'title' => "You have reached the limit of {$limit} builds. Delete one first.",
            ]);
        }

        $build = DB::transaction(function () use ($request) {
            $v = $request->validated();
            $data = $this->cleanData($v['data']);

            $build = $request->user()->builds()->create([
                'title'       => $v['title'],
                'description' => $v['description'] ?? null,
                'visibility'  => $v['visibility'],
                'data'        => $data,
                'block_count' => count($data['blocks']),
            ]);

            $this->syncSteps($build, $v['steps'] ?? [], count($data['blocks']));

            return $build;
        });

        return redirect()->route('builds.edit', $build);
    }

    public function show(Build $build)
    {
        // 404 (not 403) so private builds don't reveal that they exist
        abort_unless(Gate::allows('view', $build), 404);

        $build->load(['user:id,name,username', 'steps']);

        return Inertia::render('Builds/Show', [
            'build'   => $this->payload($build) + [
                'author' => [
                    'name'     => $build->user->name,
                    'username' => $build->user->username,
                ],
            ],
            'canEdit' => Gate::allows('update', $build),
        ]);
    }

    public function edit(Build $build)
    {
        Gate::authorize('update', $build);

        return Inertia::render('Builds/Editor', [
            'build' => $this->payload($build->load('steps')),
        ]);
    }

    public function update(SaveBuildRequest $request, Build $build)
    {
        Gate::authorize('update', $build);

        DB::transaction(function () use ($request, $build) {
            $v = $request->validated();
            $data = $this->cleanData($v['data']);

            $build->update([
                'title'       => $v['title'],
                'description' => $v['description'] ?? null,
                'visibility'  => $v['visibility'],
                'data'        => $data,
                'block_count' => count($data['blocks']),
            ]);

            $this->syncSteps($build, $v['steps'] ?? [], count($data['blocks']));
        });

        return back();
    }

    public function destroy(Build $build)
    {
        Gate::authorize('delete', $build);

        $build->delete();

        return redirect()->route('builds.index');
    }

    /** Keep only the keys we know about, so clients can't store extra junk. */
    private function cleanData(array $data): array
    {
        return Arr::only($data, ['version', 'size', 'palette', 'blocks']);
    }

    private function syncSteps(Build $build, array $steps, int $blockCount): void
    {
        $build->steps()->delete();

        foreach (array_values($steps) as $i => $step) {
            $build->steps()->create([
                'position'  => $i + 1,
                'title'     => $step['title'],
                'note'      => $step['note'] ?? null,
                'end_index' => min($step['end_index'], $blockCount),
            ]);
        }
    }

    private function payload(Build $build): array
    {
        return [
            'public_id'   => $build->public_id,
            'title'       => $build->title,
            'description' => $build->description,
            'visibility'  => $build->visibility,
            'data'        => $build->data,
            'steps'       => $build->steps->map(fn ($s) => [
                'title'     => $s->title,
                'note'      => $s->note,
                'end_index' => $s->end_index,
            ])->values(),
        ];
    }
}