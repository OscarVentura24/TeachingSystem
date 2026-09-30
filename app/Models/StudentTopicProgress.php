<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentTopicProgress extends Model
{
    use HasFactory;

    protected $table = 'student_topic_progress';

    protected $fillable = [
        'class_session_id',
        'student_id',
        'course_topic_id',
        'coverage_status',
        'mastery_level',
        'evaluation_notes',
        'evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'evaluated_at' => 'datetime',
        ];
    }

    public function classSession(): BelongsTo
    {
        return $this->belongsTo(ClassSession::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function courseTopic(): BelongsTo
    {
        return $this->belongsTo(CourseTopic::class);
    }
}
