<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class InstitutionContext
{
    /**
     * Get the active institution ID from session or user's default.
     */
    public function getActiveInstitutionId(Request $request): ?int
    {
        $user = $request->user();
        if (!$user) {
            return null;
        }

        // If session explicitly stores 'global' mode for super admin
        if ($request->session()->get('current_institution_id') === 'global') {
            return null;
        }

        if ($request->session()->has('current_institution_id')) {
            $sessId = (int) $request->session()->get('current_institution_id');
            if ($this->userHasAccess($user, $sessId)) {
                return $sessId;
            }
        }

        // If super admin and no explicit institution is chosen, default to global mode
        if ($user->isSuperAdmin()) {
            return null;
        }

        // Default for non-super-admin users: first available institution
        $available = $this->getAvailableInstitutions($user);
        if ($available->isNotEmpty()) {
            $defaultId = $available->first()->id;
            $request->session()->put('current_institution_id', $defaultId);
            return $defaultId;
        }

        return null;
    }

    /**
     * Check if current context is in global super admin mode.
     */
    public function isGlobalMode(Request $request): bool
    {
        $user = $request->user();
        return $user && $user->isSuperAdmin() && $this->getActiveInstitutionId($request) === null;
    }

    /**
     * Get the active Institution model.
     */
    public function getActiveInstitution(Request $request): ?Institution
    {
        $id = $this->getActiveInstitutionId($request);
        if (!$id) {
            return null;
        }

        return Institution::find($id);
    }

    /**
     * Set the active institution in session.
     */
    public function setActiveInstitution(Request $request, string|int|null $institutionId): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        if ($institutionId === 'global' || $institutionId === null) {
            if ($user->isSuperAdmin()) {
                $request->session()->put('current_institution_id', 'global');
                return true;
            }
            return false;
        }

        $intId = (int) $institutionId;
        if ($this->userHasAccess($user, $intId)) {
            $request->session()->put('current_institution_id', $intId);
            return true;
        }

        return false;
    }

    /**
     * Get all institutions accessible by the user.
     */
    public function getAvailableInstitutions(User $user): Collection
    {
        if ($user->isSuperAdmin()) {
            return Institution::where('is_active', true)->orderBy('name')->get();
        }

        return $user->institutions()
            ->where('institutions.is_active', true)
            ->wherePivot('is_active', true)
            ->orderBy('name')
            ->get();
    }

    /**
     * Check if a user has access to a specific institution.
     */
    public function userHasAccess(User $user, int $institutionId): bool
    {
        if ($user->isSuperAdmin()) {
            return Institution::where('id', $institutionId)->where('is_active', true)->exists();
        }

        return $user->institutions()
            ->where('institutions.id', $institutionId)
            ->where('institutions.is_active', true)
            ->wherePivot('is_active', true)
            ->exists();
    }
}
