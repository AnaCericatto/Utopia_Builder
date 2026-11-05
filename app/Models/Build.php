<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use App\Support\Preview;

class Build extends Model
{
    protected $fillable = [
        'title', 'description', 'data', 'visibility', 'thumbnail_path', 'block_count',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (Build $build) {
            $build->public_id ??= (string) Str::ulid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(BuildStep::class)->orderBy('position');
    }

    public function likedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'build_likes')->withTimestamps();
    }

    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'build_favorites')->withTimestamps();
    }

    public function scopePublic(Builder $query): Builder
    {
        return $query->where('visibility', 'public');
    }

    public function toCard(): array
    {
        return [
            'public_id'   => $this->public_id,
            'title'       => $this->title,
            'block_count' => $this->block_count,
            'steps_count' => $this->steps_count ?? $this->steps()->count(),
            'updated'     => $this->updated_at->diffForHumans(),
            'author'      => ['name' => $this->user->name, 'username' => $this->user->username],
            'preview'     => Preview::topDown($this->data),
        ];
    }
}