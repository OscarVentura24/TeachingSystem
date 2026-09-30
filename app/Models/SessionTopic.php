<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionTopic extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_session_id',
        'course_topic_id',
        'notes',
    ];

    public function classSession(): BelongsTo
    {
        return $this->belongsTo(ClassSession::class);
    }

    public function courseTopic(): BelongsTo
    {
        return $this->belongsTo(CourseTopic::class);
    }
}
