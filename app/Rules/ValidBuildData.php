<?php

namespace App\Rules;

use App\Support\Catalog;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidBuildData implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_array($value) || ($value['version'] ?? null) !== 2) {
            $fail('The build data must be an object with version 2.');
            return;
        }

        // size: [x, y, z]
        $size = $value['size'] ?? null;
        $max = config('builds.max_size');
        if (!is_array($size) || !array_is_list($size) || count($size) !== 3) {
            $fail('The build size must be [x, y, z].');
            return;
        }
        foreach ($size as $n) {
            if (!is_int($n) || $n < 1 || $n > $max) {
                $fail("Each size value must be a whole number from 1 to {$max}.");
                return;
            }
        }

        // palette: list of distinct catalog item ids
        $palette = $value['palette'] ?? null;
        if (!is_array($palette) || !array_is_list($palette)
            || count($palette) < 1 || count($palette) > config('builds.max_palette')) {
            $fail('The palette has an invalid number of items.');
            return;
        }
        $items = [];
        foreach ($palette as $id) {
            $item = is_string($id) ? Catalog::get($id) : null;
            if ($item === null) {
                $fail('The palette contains an unknown item.');
                return;
            }
            $items[] = $item;
        }
        if (count(array_unique($palette)) !== count($palette)) {
            $fail('The palette contains duplicate items.');
            return;
        }

        // blocks: [[x, y, z, paletteIndex, rotation], ...]
        $blocks = $value['blocks'] ?? null;
        if (!is_array($blocks) || !array_is_list($blocks) || count($blocks) > config('builds.max_blocks')) {
            $fail('The build has too many items.');
            return;
        }

        $paletteCount = count($palette);
        $seen = [];
        foreach ($blocks as $i => $b) {
            if (!is_array($b) || !array_is_list($b) || count($b) !== 5
                || !is_int($b[0]) || !is_int($b[1]) || !is_int($b[2]) || !is_int($b[3]) || !is_int($b[4])) {
                $fail("Item #{$i} must be five whole numbers [x, y, z, item, rotation].");
                return;
            }
            [$x, $y, $z, $p, $rot] = $b;

            if ($p < 0 || $p >= $paletteCount) {
                $fail("Item #{$i} uses an unknown palette entry.");
                return;
            }
            if ($rot < 0 || $rot > 3) {
                $fail("Item #{$i} has an invalid rotation.");
                return;
            }

            [$w, $h, $d] = Catalog::footprint($items[$p], $rot);
            if ($x < 0 || $y < 0 || $z < 0
                || $x + $w > $size[0] || $y + $h > $size[1] || $z + $d > $size[2]) {
                $fail("Item #{$i} is outside the build area.");
                return;
            }

            // every cell the item covers must be free
            for ($cx = $x; $cx < $x + $w; $cx++) {
                for ($cy = $y; $cy < $y + $h; $cy++) {
                    for ($cz = $z; $cz < $z + $d; $cz++) {
                        $key = "$cx,$cy,$cz";
                        if (isset($seen[$key])) {
                            $fail("Item #{$i} overlaps another item.");
                            return;
                        }
                        $seen[$key] = true;
                    }
                }
            }
        }
    }
}