<?php

namespace Tests\Feature;

use App\Models\Build;
use App\Models\User;
use App\Support\Preview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExploreTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function makeBuild(User $user, string $title, string $visibility): Build
    {
        return $user->builds()->create([
            'title'       => $title,
            'visibility'  => $visibility,
            'block_count' => 2,
            'data'        => [
                'version' => 2,
                'size'    => [8, 8, 8],
                'palette' => ['wood_block', 'bench'],
                'blocks'  => [[0, 0, 0, 0, 0], [2, 0, 0, 1, 0]],
            ],
        ]);
    }

    public function test_explore_lists_only_public_builds(): void
    {
        $user = User::factory()->create();
        $this->makeBuild($user, 'Open build', 'public');
        $this->makeBuild($user, 'Link only', 'unlisted');
        $this->makeBuild($user, 'Secret build', 'private');

        $this->get('/explore')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Explore')
                ->has('builds', 1)
                ->where('builds.0.title', 'Open build'));
    }

    public function test_home_page_loads_for_guests(): void
    {
        $this->get('/')->assertOk();
    }

    public function test_preview_uses_the_highest_item_in_each_column(): void
    {
        $p = Preview::topDown([
            'version' => 2,
            'palette' => ['wood_block', 'bench'],
            'blocks'  => [[0, 0, 0, 0, 0], [0, 1, 0, 0, 0], [2, 0, 0, 1, 0]],
        ]);

        $this->assertSame(4, $p['w']);        // x 0..3: the bench covers x 2 and 3
        $this->assertSame(1, $p['d']);
        $this->assertSame(2, $p['heights'][0]); // two blocks stacked
        $this->assertSame(0, $p['cells'][1]);   // x = 1 is empty
    }

    public function test_preview_handles_old_v1_data(): void
    {
        $p = Preview::topDown(['version' => 1, 'palette' => ['wood'], 'blocks' => [[0, 0, 0, 0]]]);

        $this->assertSame(1, $p['w']);
        $this->assertSame(1, $p['d']);
    }
}