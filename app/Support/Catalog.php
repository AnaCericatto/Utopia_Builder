<?php

namespace App\Support;

class Catalog
{
    private static ?array $items = null;

    /** The same file the editor uses: resources/catalog/items.json */
    public static function items(): array
    {
        return self::$items ??= json_decode(
            file_get_contents(resource_path('catalog/items.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }

    public static function get(string $id): ?array
    {
        return self::items()[$id] ?? null;
    }

    /** [w, h, d] after $rot quarter turns */
    public static function footprint(array $item, int $rot): array
    {
        [$w, $h, $d] = $item['size'];

        return $rot % 2 ? [$d, $h, $w] : [$w, $h, $d];
    }
}