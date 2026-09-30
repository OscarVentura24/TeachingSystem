<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'created_by_user_id',
        'session_date',
        'start_time',
        'end_time',
        'title',
        'notes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
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

    public function sessionTopics(): HasMany
    {
        return $this->hasMany(SessionTopic::class);
    }

    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(CourseTopic::class, 'session_topics')
            ->withPivot('notes')
            ->withTimestamps();
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(SessionAttendance::class);
    }

    public function attendingStudents(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'session_attendances')
            ->withPivot('workstation', 'notes')
            ->withTimestamps();
    }

    public function progressRecords(): HasMany
    {
        return $this->hasMany(StudentTopicProgress::class);
    }
}
