<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuildStep extends Model
{
    protected $fillable = ['position', 'title', 'note', 'end_index'];

    public function build(): BelongsTo
    {
        return $this->belongsTo(Build::class);
    }
}