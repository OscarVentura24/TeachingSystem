<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'institution_id',
        'academic_period_id',
        'name',
        'section',
        'code',
        'description',
        'color',
        'status',
    ];

    protected $appends = ['is_read_only'];

    public function getIsReadOnlyAttribute(): bool
    {
        return $this->isReadOnly();
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function academicPeriod(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class);
    }

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_teachers')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'enrollments')
            ->withPivot('status', 'preferred_workstation', 'enrolled_at')
            ->withTimestamps();
    }

    public function courseTopics(): HasMany
    {
        return $this->hasMany(CourseTopic::class)->orderBy('sort_order');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ClassSession::class)->orderByDesc('session_date');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class)->orderBy('assessment_date');
    }

    /**
     * Determine if this course is in read-only / archived mode.
     */
    public function isReadOnly(): bool
    {
        return $this->status === 'archived' || (bool) $this->academicPeriod?->is_closed;
    }
}
