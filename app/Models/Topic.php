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
        'institution_id',
        'source_topic_id',
        'subject_id',
        'parent_id',
        'sort_order',
        'title',
        'area',
        'unit_title',
        'short_summary',
        'description',
        'resources_notes',
        'estimated_minutes',
        'is_global',
        'status',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'estimated_minutes' => 'integer',
            'is_global' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function sourceTopic(): BelongsTo
    {
        return $this->belongsTo(Topic::class, 'source_topic_id');
    }

    public function derivedTopics(): HasMany
    {
        return $this->hasMany(Topic::class, 'source_topic_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Topic::class, 'parent_id');
    }

    public function subtopics(): HasMany
    {
        return $this->hasMany(Topic::class, 'parent_id')->orderBy('sort_order')->orderBy('id');
    }

    public function isSubtopic(): bool
    {
        return $this->parent_id !== null;
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

    /**
     * Scope topics visible in a given context.
     * In Institutional Mode: Global topics OR topics created by that institution.
     * In Global Mode: If Super Admin, can view all (or global).
     */
    public function scopeVisibleInContext($query, ?int $institutionId, bool $isSuperAdmin = false)
    {
        if ($institutionId !== null) {
            return $query->where(function ($q) use ($institutionId) {
                $q->where('is_global', true)
                  ->orWhere('institution_id', $institutionId);
            });
        }

        if ($isSuperAdmin) {
            return $query; // Super admin in global mode can see all
        }

        return $query->where('is_global', true);
    }
}

