<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assessment extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'created_by_user_id',
        'title',
        'description',
        'assessment_type',
        'assessment_date',
        'max_score',
        'passing_score',
        'weight_percentage',
        'auto_sync_mastery',
    ];

    protected function casts(): array
    {
        return [
            'assessment_date' => 'date',
            'max_score' => 'decimal:2',
            'passing_score' => 'decimal:2',
            'weight_percentage' => 'decimal:2',
            'auto_sync_mastery' => 'boolean',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(CourseTopic::class, 'assessment_topics')
            ->withTimestamps();
    }

    public function scores(): HasMany
    {
        return $this->hasMany(AssessmentScore::class);
    }
}
