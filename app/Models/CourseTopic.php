<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseTopic extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'topic_id',
        'title',
        'unit_title',
        'description',
        'sort_order',
        'is_required',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_required' => 'boolean',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function globalTopic(): BelongsTo
    {
        return $this->belongsTo(Topic::class, 'topic_id');
    }

    public function sessionTopics(): HasMany
    {
        return $this->hasMany(SessionTopic::class);
    }

    public function studentProgress(): HasMany
    {
        return $this->hasMany(StudentTopicProgress::class);
    }
}
