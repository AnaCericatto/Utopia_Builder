<?php

namespace App\Http\Requests;

use App\Rules\ValidBuildData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveBuildRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // ownership is checked by the policy in the controller
    }

    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'visibility'  => ['required', Rule::in(['private', 'unlisted', 'public'])],
            'data'        => ['required', 'array', new ValidBuildData],

            'steps'             => ['nullable', 'array', 'max:' . config('builds.max_steps')],
            'steps.*.title'     => ['required', 'string', 'max:100'],
            'steps.*.note'      => ['nullable', 'string', 'max:1000'],
            'steps.*.end_index' => ['required', 'integer', 'min:0'],
        ];
    }
}