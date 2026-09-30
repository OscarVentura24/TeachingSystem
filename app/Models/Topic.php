<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Topic extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by_user_id',
        'subject_id',
        'title',
        'area',
        'unit_title',
        'short_summary',
        'description',
        'resources_notes',
        'estimated_minutes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'estimated_minutes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Prerequisites required BEFORE this topic.
     */
    public function prerequisites(): BelongsToMany
    {
        return $this->belongsToMany(Topic::class, 'topic_prerequisites', 'topic_id', 'prerequisite_topic_id')
            ->withTimestamps();
    }

    /**
     * Topics that require this topic as a prerequisite.
     */
    public function prerequisiteFor(): BelongsToMany
    {
        return $this->belongsToMany(Topic::class, 'topic_prerequisites', 'prerequisite_topic_id', 'topic_id')
            ->withTimestamps();
    }

    public function courseTopics(): HasMany
    {
        return $this->hasMany(CourseTopic::class);
    }
}
