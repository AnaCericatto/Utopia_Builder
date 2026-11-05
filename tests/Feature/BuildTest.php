<?php

namespace Tests\Feature;

use App\Models\Build;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuildTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function payload(array $override = []): array
    {
        return array_replace_recursive([
            'title'      => 'My house',
            'visibility' => 'public',
            'data'       => [
                'version' => 2,
                'size'    => [8, 8, 8],
                'palette' => ['wood_block', 'stone_block', 'bench', 'lamp_post'],
                'blocks'  => [[0, 0, 0, 0, 0], [1, 0, 0, 1, 0]],
            ],
            'steps' => [['title' => 'Foundation', 'end_index' => 2]],
        ], $override);
    }

    public function test_guest_cannot_create(): void
    {
        $this->post('/builds', $this->payload())->assertRedirect('/login');
    }

    public function test_user_can_create_build(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/builds', $this->payload())->assertRedirect();

        $this->assertDatabaseHas('builds', ['user_id' => $user->id, 'title' => 'My house', 'block_count' => 2]);
        $this->assertDatabaseCount('build_steps', 1);
    }

    public function test_block_outside_grid_is_rejected(): void
    {
        $user = User::factory()->create();
        $bad = $this->payload();
        $bad['data']['blocks'][] = [99, 0, 0, 0, 0];

        $this->actingAs($user)->post('/builds', $bad)->assertSessionHasErrors('data');
        $this->assertDatabaseCount('builds', 0);
    }

    public function test_duplicate_block_position_is_rejected(): void
    {
        $user = User::factory()->create();
        $bad = $this->payload();
        $bad['data']['blocks'][] = [0, 0, 0, 1, 0];

        $this->actingAs($user)->post('/builds', $bad)->assertSessionHasErrors('data');
    }

    public function test_other_user_cannot_update(): void
    {
        $owner = User::factory()->create();
        $build = $owner->builds()->create([
            'title' => 'Mine', 'visibility' => 'public', 'block_count' => 2,
            'data' => $this->payload()['data'],
        ]);

        $this->actingAs(User::factory()->create())
            ->put("/builds/{$build->public_id}", $this->payload(['title' => 'Hacked']))
            ->assertForbidden();
    }

    public function test_private_build_is_hidden_from_guests(): void
    {
        $owner = User::factory()->create();
        $build = $owner->builds()->create([
            'title' => 'Secret', 'visibility' => 'private', 'block_count' => 2,
            'data' => $this->payload()['data'],
        ]);

        $this->get("/builds/{$build->public_id}")->assertNotFound();
        $this->actingAs($owner)->get("/builds/{$build->public_id}")->assertOk();
    }

    public function test_public_build_is_visible_to_guests(): void
    {
        $owner = User::factory()->create();
        $build = $owner->builds()->create([
            'title' => 'Open', 'visibility' => 'public', 'block_count' => 2,
            'data' => $this->payload()['data'],
        ]);

        $this->get("/builds/{$build->public_id}")->assertOk();
    }

    public function test_multi_cell_item_overlap_is_rejected(): void
    {
        $user = User::factory()->create();
        $bad = $this->payload();
        $bad['data']['blocks'][] = [0, 0, 1, 2, 0];   // bench covers x 0-1, z 1; ok
        $bad['data']['blocks'][] = [1, 0, 1, 0, 0];   // wood block inside the bench

        $this->actingAs($user)->post('/builds', $bad)->assertSessionHasErrors('data');
    }

    public function test_rotated_item_footprint_is_checked(): void
    {
        $user = User::factory()->create();
        $bad = $this->payload();
        // bench rotated a quarter turn is 1 wide and 2 deep, so z = 7 would stick out of an 8-cell grid
        $bad['data']['blocks'][] = [3, 0, 7, 2, 1];

        $this->actingAs($user)->post('/builds', $bad)->assertSessionHasErrors('data');
    }

    public function test_tall_item_and_valid_rotation_are_accepted(): void
    {
        $user = User::factory()->create();
        $ok = $this->payload();
        $ok['data']['blocks'][] = [4, 0, 4, 3, 0];   // lamp post, 2 cells high
        $ok['data']['blocks'][] = [6, 0, 0, 2, 1];   // bench rotated, 1 x 2

        $this->actingAs($user)->post('/builds', $ok)->assertRedirect();
    }

    public function test_unknown_item_is_rejected(): void
    {
        $user = User::factory()->create();
        $bad = $this->payload();
        $bad['data']['palette'][] = 'not_a_real_item';

        $this->actingAs($user)->post('/builds', $bad)->assertSessionHasErrors('data');
    }

    public function test_user_cannot_exceed_build_limit(): void
    {
        config(['builds.max_per_user' => 1]);
        $user = User::factory()->create();

        $this->actingAs($user)->post('/builds', $this->payload())->assertRedirect();
        $this->actingAs($user)->post('/builds', $this->payload())->assertSessionHasErrors('title');
    }
}