<?php

use App\Models\Course;
use App\Models\Institution;
use App\Models\User;

beforeEach(function () {
    $this->superAdmin = User::factory()->create([
        'name' => 'Super Admin Platform',
        'email' => 'superadmin@teachingsystem.test',
        'is_super_admin' => true,
    ]);

    $this->regularTeacher = User::factory()->create([
        'name' => 'Profesor Normal',
        'email' => 'normal@teachingsystem.test',
        'is_super_admin' => false,
    ]);

    $this->instA = Institution::create([
        'name' => 'Universidad Metropolitana',
        'slug' => 'universidad-metropolitana',
        'code' => 'UNIMET',
    ]);

    $this->instB = Institution::create([
        'name' => 'Academia Tech',
        'slug' => 'academia-tech',
        'code' => 'ATECH',
    ]);
});

test('super admin can view institutions list with total metrics', function () {
    $response = $this->actingAs($this->superAdmin)->get(route('institutions.index'));

    $response->assertOk();
    $page = $response->viewData('page')['props'];
    expect($page['totalStats']['totalInstitutions'])->toBe(2);
});

test('non-super admin cannot access global institutions management', function () {
    $response = $this->actingAs($this->regularTeacher)->get(route('institutions.index'));

    $response->assertForbidden();
});

test('super admin can create a new institution with initial academic period', function () {
    $response = $this->actingAs($this->superAdmin)->post(route('institutions.store'), [
        'name' => 'Colegio San Pedro',
        'code' => 'CSP-01',
        'description' => 'Sede Norte',
    ]);

    $newInst = Institution::where('name', 'Colegio San Pedro')->first();
    expect($newInst)->not->toBeNull();
    expect($newInst->slug)->toBe('colegio-san-pedro');
    expect($newInst->academicPeriods()->count())->toBe(1);

    // Membership created
    expect($newInst->users()->where('users.id', $this->superAdmin->id)->exists())->toBeTrue();

    // Auto-switched in session and redirected to courses
    $response->assertRedirect(route('courses.index'));
    $response->assertSessionHas('current_institution_id', $newInst->id);
});

test('super admin can switch active institution context and global mode', function () {
    // Switch to Institution B
    $response = $this->actingAs($this->superAdmin)->post(route('institutions.switch'), [
        'institution_id' => $this->instB->id,
    ]);
    $response->assertRedirect(route('courses.index'));
    $response->assertSessionHas('current_institution_id', $this->instB->id);

    // Switch to Global Mode
    $globalResponse = $this->actingAs($this->superAdmin)->post(route('institutions.switch'), [
        'institution_id' => 'global',
    ]);
    $globalResponse->assertRedirect(route('institutions.index'));
    $globalResponse->assertSessionHas('current_institution_id', 'global');
});

test('course creation automatically uses active institution context when omitted in request', function () {
    // Set active institution to inst A in session
    $session = ['current_institution_id' => $this->instA->id];

    $response = $this->actingAs($this->superAdmin)
        ->withSession($session)
        ->post(route('courses.store'), [
            'name' => 'Arquitectura de Software',
            'section' => 'M-1',
        ]);

    $course = Course::where('name', 'Arquitectura de Software')->first();
    expect($course)->not->toBeNull()
        ->and($course->institution_id)->toBe($this->instA->id);

    $response->assertRedirect(route('courses.show', $course));
});

test('super admin can update institution details and status', function () {
    $response = $this->actingAs($this->superAdmin)->put(route('institutions.update', $this->instA), [
        'name' => 'Universidad Metropolitana (Actualizada)',
        'code' => 'UNIMET-MOD',
        'description' => 'Sede remodelada',
        'is_active' => true,
    ]);

    $response->assertRedirect();
    $this->instA->refresh();
    expect($this->instA->name)->toBe('Universidad Metropolitana (Actualizada)')
        ->and($this->instA->code)->toBe('UNIMET-MOD');
});
