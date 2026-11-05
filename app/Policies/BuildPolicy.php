<?php

namespace App\Policies;

use App\Models\Build;
use App\Models\User;

class BuildPolicy
{
    // ?User = guests (not logged in) are allowed to be checked
    public function view(?User $user, Build $build): bool
    {
        return $build->visibility !== 'private' || $user?->id === $build->user_id;
    }

    public function update(User $user, Build $build): bool
    {
        return $user->id === $build->user_id;
    }

    public function delete(User $user, Build $build): bool
    {
        return $user->id === $build->user_id;
    }
}