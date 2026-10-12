<?php

use App\Models\Institution;
use App\Models\InstitutionMembership;
use App\Models\Student;
use App\Models\User;
use App\Services\MatriculaGeneratorService;

beforeEach(function () {
    $this->instA = Institution::create([
        'name' => 'Colegio Los Angelitos',
        'code' => 'CLA',
        'slug' => 'colegio-los-angelitos',
        'matricula_format' => 'year_seq_short',
        'matricula_prefix' => 'CLA',
        'is_active' => true,
    ]);

    $this->instB = Institution::create([
        'name' => 'Colegio San Pedro',
        'code' => 'CSP',
        'slug' => 'colegio-san-pedro',
        'matricula_format' => 'year_seq_short',
        'matricula_prefix' => 'CSP',
        'is_active' => true,
    ]);

    $this->userA = User::factory()->create(['email' => 'admin_cla@test.com']);
    InstitutionMembership::create([
        'user_id' => $this->userA->id,
        'institution_id' => $this->instA->id,
        'role' => 'admin',
        'is_active' => true,
    ]);

    $this->generator = app(MatriculaGeneratorService::class);
});

test('service returns correct formats for year_seq_short, standard, inst_year, period, and numeric', function () {
    $yearShort = date('y');
    $yearFull = date('Y');

    // 1. year_seq_short: YY-01
    $gen1 = $this->generator->generateNext($this->instA, 'year_seq_short');
    expect($gen1['matricula'])->toBe("{$yearShort}-01");

    // 2. year_seq_standard: YYYY-0001
    $gen2 = $this->generator->generateNext($this->instA, 'year_seq_standard');
    expect($gen2['matricula'])->toBe("{$yearFull}-0001");

    // 3. inst_year_seq: CLA-YY-001
    $gen3 = $this->generator->generateNext($this->instA, 'inst_year_seq');
    expect($gen3['matricula'])->toBe("CLA-{$yearShort}-001");

    // 4. period_seq: {year}-I-001 (default fallback)
    $gen4 = $this->generator->generateNext($this->instA, 'period_seq');
    expect($gen4['matricula'])->toBe("{$yearFull}-I-001");

    // 5. numeric_seq: 000001
    $gen5 = $this->generator->generateNext($this->instA, 'numeric_seq');
    expect($gen5['matricula'])->toBe('000001');
});

test('service increments sequence sequentially based on existing students', function () {
    $yearShort = date('y');

    Student::create([
        'institution_id' => $this->instA->id,
        'first_name' => 'Estudiante',
        'last_name' => 'Uno',
        'student_id_number' => "{$yearShort}-01",
        'status' => 'active',
    ]);

    $next = $this->generator->generateNext($this->instA, 'year_seq_short');
    expect($next['matricula'])->toBe("{$yearShort}-02");

    Student::create([
        'institution_id' => $this->instA->id,
        'first_name' => 'Estudiante',
        'last_name' => 'Dos',
        'student_id_number' => "{$yearShort}-02",
        'status' => 'active',
    ]);

    $nextAgain = $this->generator->generateNext($this->instA, 'year_seq_short');
    expect($nextAgain['matricula'])->toBe("{$yearShort}-03");
});

test('correlative counting is isolated per institution', function () {
    $yearShort = date('y');

    // Inst A has 26-01 and 26-02
    Student::create([
        'institution_id' => $this->instA->id,
        'first_name' => 'A1',
        'last_name' => 'Test',
        'student_id_number' => "{$yearShort}-01",
        'status' => 'active',
    ]);
    Student::create([
        'institution_id' => $this->instA->id,
        'first_name' => 'A2',
        'last_name' => 'Test',
        'student_id_number' => "{$yearShort}-02",
        'status' => 'active',
    ]);

    // Inst B has no students yet -> should start at 26-01
    $instBNext = $this->generator->generateNext($this->instB, 'year_seq_short');
    expect($instBNext['matricula'])->toBe("{$yearShort}-01");
});

test('students.generate-matricula route returns json preview', function () {
    $response = $this->actingAs($this->userA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->getJson(route('students.generate-matricula', [
            'format' => 'year_seq_short',
        ]));

    $yearShort = date('y');
    $response->assertOk()
        ->assertJson([
            'matricula' => "{$yearShort}-01",
            'format' => 'year_seq_short',
        ]);
});

test('creating student with auto matricula calculates code automatically', function () {
    $yearShort = date('y');

    $response = $this->actingAs($this->userA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->from(route('students.index'))
        ->post(route('students.store'), [
            'first_name' => 'Camila',
            'last_name' => 'Reyes',
            'email' => 'camila.reyes@test.com',
            'is_auto_matricula' => true,
            'matricula_format' => 'year_seq_short',
        ]);

    $response->assertRedirect(route('students.index'));

    $created = Student::where('email', 'camila.reyes@test.com')->first();
    expect($created)->not->toBeNull();
    expect($created->student_id_number)->toBe("{$yearShort}-01");
    expect($created->institution_id)->toBe($this->instA->id);
});

test('creating student with manual matricula preserves custom input', function () {
    $response = $this->actingAs($this->userA)
        ->withSession(['current_institution_id' => $this->instA->id])
        ->from(route('students.index'))
        ->post(route('students.store'), [
            'first_name' => 'Lucas',
            'last_name' => 'Duarte',
            'email' => 'lucas.duarte@test.com',
            'student_id_number' => 'MANUAL-2026-X99',
            'is_auto_matricula' => false,
        ]);

    $response->assertRedirect(route('students.index'));

    $created = Student::where('email', 'lucas.duarte@test.com')->first();
    expect($created)->not->toBeNull();
    expect($created->student_id_number)->toBe('MANUAL-2026-X99');
});
