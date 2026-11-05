<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\Catalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    private array $blocks = [];  // [itemId, x, y, z, rotation] in placement order
    private array $steps = [];
    private array $taken = [];

    public function run(): void
    {
        $user = User::firstOrNew(['email' => 'demo@example.com']);
        $user->forceFill([
            'name'              => 'Demo Builder',
            'username'          => 'demo',
            'password'          => Hash::make(env('DEMO_PASSWORD', 'password')),
            'email_verified_at' => now(),
        ])->save();

        $user->builds()->delete(); // running the seeder again just rebuilds the demos

        $this->cottage($user);
        $this->pavilion($user);
        $this->pond($user);
    }

    // ---------------------------------------------------------------- builds

    private function cottage(User $user): void
    {
        $this->reset();

        $this->box('stone_block', 8, 0, 8, 16, 0, 16);
        $this->box('sand_block', 11, 0, 17, 13, 0, 19);      // front path
        $this->box('grass_block', 5, 0, 5, 19, 0, 19);       // lawn fills whatever is still free
        $this->cut('Foundation', 'Lay a 9x9 stone floor, a sand path at the front, and a grass lawn around it.');

        for ($y = 1; $y <= 3; $y++) {
            for ($x = 8; $x <= 16; $x++) {
                for ($z = 8; $z <= 16; $z++) {
                    if ($x !== 8 && $x !== 16 && $z !== 8 && $z !== 16) {
                        continue; // outline only
                    }
                    if ($x === 12 && $z === 16 && $y <= 2) {
                        continue; // door, two blocks high
                    }
                    $window = $y === 2 && (
                        (($x === 8 || $x === 16) && in_array($z, [11, 13], true))
                        || (($z === 8 || $z === 16) && in_array($x, [10, 14], true))
                    );
                    $this->put($window ? 'glass_block' : 'brick_block', $x, $y, $z);
                }
            }
        }
        $this->cut('Walls', 'Brick walls three blocks high. Leave a two-block door at the front and put glass windows on the second level.');

        $this->box('roof_block', 8, 4, 8, 16, 4, 16);
        $this->box('roof_block', 9, 5, 9, 15, 5, 15);
        $this->box('roof_block', 10, 6, 10, 14, 6, 14);
        $this->box('roof_block', 11, 7, 11, 13, 7, 13);
        $this->box('roof_block', 12, 8, 12, 12, 8, 12);
        $this->cut('Roof', 'Stack the roof as a stepped pyramid, each layer one block smaller than the one below.');

        $this->put('stone_stairs', 12, 1, 17);
        $this->put('lamp_post', 10, 1, 17);
        $this->put('lamp_post', 14, 1, 17);
        $this->put('bench', 9, 1, 18);
        $this->put('bench', 14, 1, 18);
        $this->cut('Entrance and lighting', 'Stairs in front of the door, a lamp on each side, and two benches on the lawn.');

        foreach ([[6, 6], [18, 7]] as [$tx, $tz]) {
            $this->box('wood_block', $tx, 1, $tz, $tx, 3, $tz);
            $this->box('grass_block', $tx - 1, 4, $tz - 1, $tx + 1, 4, $tz + 1);
            $this->put('grass_block', $tx, 5, $tz);
        }
        $this->cut('Trees', 'Two trees: a three-block trunk with a leafy top.');

        $this->save($user, 'Cozy Cottage', 'A small brick cottage with a stepped roof, a garden and two trees. Four steps, about 20 minutes.');
    }

    private function pavilion(User $user): void
    {
        $this->reset();

        $this->box('stone_block', 8, 0, 8, 16, 0, 16);
        $this->box('grass_block', 5, 0, 5, 19, 0, 19);
        $this->cut('Platform', 'A 9x9 stone platform on a grass lawn.');

        foreach ([[9, 9], [15, 9], [9, 15], [15, 15]] as [$x, $z]) {
            $this->box('wood_block', $x, 1, $z, $x, 4, $z);
        }
        $this->cut('Pillars', 'Four wooden pillars, four blocks high, set one block in from the corners.');

        $this->box('roof_block', 7, 5, 7, 17, 5, 17);
        $this->box('roof_block', 8, 6, 8, 16, 6, 16);
        $this->box('roof_block', 9, 7, 9, 15, 7, 15);
        $this->box('roof_block', 10, 8, 10, 14, 8, 14);
        $this->box('roof_block', 11, 9, 11, 13, 9, 13);
        $this->put('roof_block', 12, 10, 12);
        $this->cut('Roof', 'A wide roof that overhangs the platform, narrowing layer by layer.');

        $this->put('lamp_post', 12, 1, 12);
        $this->put('bench', 10, 1, 10);
        $this->put('bench', 13, 1, 10);
        $this->put('bench', 10, 1, 14);
        $this->put('bench', 13, 1, 14);
        $this->put('stone_stairs', 12, 1, 17, 0);
        $this->put('stone_stairs', 12, 1, 7, 2);
        $this->cut('Furnishing', 'A lamp in the middle, four benches, and a set of stairs on the front and back.');

        $this->save($user, 'Garden Pavilion', 'An open pavilion with a pyramid roof, benches and a central lamp.');
    }

    private function pond(User $user): void
    {
        $this->reset();

        $this->box('water_block', 8, 0, 10, 18, 0, 16);
        $this->box('sand_block', 7, 0, 9, 19, 0, 17);
        $this->box('grass_block', 4, 0, 6, 22, 0, 20);
        $this->cut('Pond and shore', 'An 11x7 pond with a sand shore and a grass lawn around it.');

        $this->box('wood_block', 7, 1, 12, 19, 1, 14);
        $this->box('wood_block', 8, 2, 12, 18, 2, 12);
        $this->box('wood_block', 8, 2, 14, 18, 2, 14);
        $this->cut('Bridge', 'A three-wide wooden bridge across the pond with a low rail on each side.');

        $this->put('lamp_post', 7, 2, 12);
        $this->put('lamp_post', 19, 2, 12);
        $this->put('bench', 11, 1, 8);
        $this->put('bench', 14, 1, 18);
        $this->cut('Lamps and benches', 'A lamp at each end of the bridge and a bench on each shore.');

        foreach ([[5, 16], [21, 8]] as [$tx, $tz]) {
            $this->box('wood_block', $tx, 1, $tz, $tx, 3, $tz);
            $this->box('grass_block', $tx - 1, 4, $tz - 1, $tx + 1, 4, $tz + 1);
            $this->put('grass_block', $tx, 5, $tz);
        }
        $this->cut('Trees', 'Two trees to finish the scene.');

        $this->save($user, 'Pond with a Bridge', 'A small pond crossed by a wooden bridge, with lamps, benches and trees.');
    }

    // --------------------------------------------------------------- helpers

    private function reset(): void
    {
        $this->blocks = [];
        $this->steps = [];
        $this->taken = [];
    }

    /** Place one item. Anything that would overlap an earlier item is skipped, so the build is always valid. */
    private function put(string $id, int $x, int $y, int $z, int $rot = 0): void
    {
        [$w, $h, $d] = Catalog::footprint(Catalog::get($id), $rot);

        $cells = [];
        for ($i = 0; $i < $w; $i++) {
            for ($j = 0; $j < $h; $j++) {
                for ($k = 0; $k < $d; $k++) {
                    $key = ($x + $i) . ',' . ($y + $j) . ',' . ($z + $k);
                    if (isset($this->taken[$key])) {
                        return;
                    }
                    $cells[] = $key;
                }
            }
        }

        foreach ($cells as $key) {
            $this->taken[$key] = true;
        }
        $this->blocks[] = [$id, $x, $y, $z, $rot];
    }

    /** A solid box of one item, bottom layer first. */
    private function box(string $id, int $x0, int $y0, int $z0, int $x1, int $y1, int $z1): void
    {
        for ($y = $y0; $y <= $y1; $y++) {
            for ($x = $x0; $x <= $x1; $x++) {
                for ($z = $z0; $z <= $z1; $z++) {
                    $this->put($id, $x, $y, $z);
                }
            }
        }
    }

    /** End a step here: it contains everything placed since the previous cut. */
    private function cut(string $title, string $note = ''): void
    {
        $end = count($this->blocks);
        $previous = $this->steps ? end($this->steps)['end_index'] : 0;
        if ($end > $previous) {
            $this->steps[] = ['title' => $title, 'note' => $note, 'end_index' => $end];
        }
    }

    private function save(User $user, string $title, string $description): void
    {
        $palette = array_values(array_unique(array_column($this->blocks, 0)));
        $index = array_flip($palette);
        $blocks = array_map(fn ($b) => [$b[1], $b[2], $b[3], $index[$b[0]], $b[4]], $this->blocks);

        $build = $user->builds()->create([
            'title'       => $title,
            'description' => $description,
            'visibility'  => 'public',
            'data'        => ['version' => 2, 'size' => [32, 16, 32], 'palette' => $palette, 'blocks' => $blocks],
            'block_count' => count($blocks),
        ]);

        foreach ($this->steps as $i => $step) {
            $build->steps()->create(array_merge(['position' => $i + 1], $step));
        }
    }
}