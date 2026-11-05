<?php

namespace App\Support;

class Preview
{
    public static function topDown(?array $data): array
    {
        $empty = ['w' => 0, 'd' => 0, 'colors' => [], 'cells' => [], 'heights' => [], 'maxHeight' => 0];
        if (!$data) {
            return $empty;
        }

        $legacy = ($data['version'] ?? 2) === 1; // v1 palettes used colour names like "wood"
        $items = [];
        foreach (($data['palette'] ?? []) as $i => $name) {
            $items[$i] = Catalog::get($legacy ? "{$name}_block" : (string) $name);
        }

        // highest item in each (x, z) column: "x,z" => [top y, palette index]
        $columns = [];
        $minX = $minZ = PHP_INT_MAX;
        $maxX = $maxZ = PHP_INT_MIN;

        foreach (($data['blocks'] ?? []) as $b) {
            $item = $items[$b[3] ?? -1] ?? null;
            if (!$item) {
                continue;
            }
            [$w, $h, $d] = Catalog::footprint($item, (int) ($b[4] ?? 0));
            $top = $b[1] + $h;

            for ($x = $b[0]; $x < $b[0] + $w; $x++) {
                for ($z = $b[2]; $z < $b[2] + $d; $z++) {
                    $key = "$x,$z";
                    if (!isset($columns[$key]) || $top > $columns[$key][0]) {
                        $columns[$key] = [$top, $b[3]];
                    }
                    $minX = min($minX, $x);
                    $maxX = max($maxX, $x);
                    $minZ = min($minZ, $z);
                    $maxZ = max($maxZ, $z);
                }
            }
        }

        if (!$columns) {
            return $empty;
        }

        $w = $maxX - $minX + 1;
        $d = $maxZ - $minZ + 1;
        $cells = array_fill(0, $w * $d, 0);     // 0 = empty, otherwise colour number (1-based)
        $heights = array_fill(0, $w * $d, 0);
        $colors = [];
        $colorNumber = [];
        $maxHeight = 0;

        foreach ($columns as $key => [$top, $p]) {
            [$x, $z] = array_map('intval', explode(',', $key));
            if (!isset($colorNumber[$p])) {
                $colors[] = $items[$p]['color'];
                $colorNumber[$p] = count($colors);
            }
            $i = ($z - $minZ) * $w + ($x - $minX);
            $cells[$i] = $colorNumber[$p];
            $heights[$i] = $top;
            $maxHeight = max($maxHeight, $top);
        }

        return compact('w', 'd', 'colors', 'cells', 'heights', 'maxHeight');
    }
}