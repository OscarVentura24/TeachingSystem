<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function institutionMemberships(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(InstitutionMembership::class);
    }

    public function institutions(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Institution::class, 'institution_memberships')
            ->withPivot('role', 'is_active')
            ->withTimestamps();
    }

    public function taughtCourses(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_teachers')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    public function createdSessions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ClassSession::class, 'created_by_user_id');
    }

    public function createdTopics(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Topic::class, 'created_by_user_id');
    }

    public function isInstitutionAdmin(?int $institutionId = null): bool
    {
        $query = $this->institutionMemberships()
            ->where('role', 'admin')
            ->where('is_active', true);

        if ($institutionId !== null) {
            $query->where('institution_id', $institutionId);
        }

        return $query->exists();
    }

    public function canManageCourse(Course $course): bool
    {
        // Admin of this course's institution
        if ($this->isInstitutionAdmin($course->institution_id)) {
            return true;
        }

        // Explicitly assigned teacher
        if ($course->teachers()->where('users.id', $this->id)->exists()) {
            return true;
        }

        // If the course has no assigned teachers and the user belongs to the institution
        if ($course->teachers()->count() === 0 && $this->institutions()->where('institutions.id', $course->institution_id)->exists()) {
            return true;
        }

        return false;
    }
}

