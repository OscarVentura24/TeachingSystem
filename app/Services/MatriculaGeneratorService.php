<?php

namespace App\Services;

use App\Models\AcademicPeriod;
use App\Models\Institution;
use App\Models\Student;

class MatriculaGeneratorService
{
    public const FORMAT_YEAR_SEQ_SHORT = 'year_seq_short';
    public const FORMAT_YEAR_SEQ_STANDARD = 'year_seq_standard';
    public const FORMAT_INST_YEAR_SEQ = 'inst_year_seq';
    public const FORMAT_PERIOD_SEQ = 'period_seq';
    public const FORMAT_NUMERIC_SEQ = 'numeric_seq';

    /**
     * Get the catalogue of supported matrícula generation formats.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableFormats(): array
    {
        $currentYearShort = date('y');
        $currentYearFull = date('Y');

        return [
            [
                'id' => self::FORMAT_YEAR_SEQ_SHORT,
                'name' => 'Año y Correlativo Corto',
                'description' => 'Año en 2 dígitos + correlativo de 2 cifras (ej: 26-01).',
                'example' => "{$currentYearShort}-01",
                'requires_period' => false,
            ],
            [
                'id' => self::FORMAT_YEAR_SEQ_STANDARD,
                'name' => 'Año Completo y Correlativo Estándar',
                'description' => 'Año en 4 dígitos + correlativo de 4 cifras (ej: 2026-0001).',
                'example' => "{$currentYearFull}-0001",
                'requires_period' => false,
            ],
            [
                'id' => self::FORMAT_INST_YEAR_SEQ,
                'name' => 'Siglas Institución + Año + Correlativo',
                'description' => 'Código de la sede + año + correlativo de 3 cifras (ej: CLA-26-001).',
                'example' => "CLA-{$currentYearShort}-001",
                'requires_period' => false,
            ],
            [
                'id' => self::FORMAT_PERIOD_SEQ,
                'name' => 'Período Académico + Correlativo',
                'description' => 'Nombre del período lectivo + correlativo (ej: 2026-I-001).',
                'example' => "{$currentYearFull}-I-001",
                'requires_period' => true,
            ],
            [
                'id' => self::FORMAT_NUMERIC_SEQ,
                'name' => 'Secuencial Numérico Continuo',
                'description' => 'Número secuencial directo de 6 dígitos sin prefijo (ej: 000001).',
                'example' => '000001',
                'requires_period' => false,
            ],
        ];
    }

    /**
     * Generate the next matrícula string for an institution based on format and period.
     */
    public function generateNext(
        Institution $institution,
        ?string $format = null,
        ?int $periodId = null,
        ?int $targetYear = null
    ): array {
        $format = $format ?: ($institution->matricula_format ?: self::FORMAT_YEAR_SEQ_SHORT);
        $year = $targetYear ?: (int) date('Y');
        $yearShort = substr((string) $year, -2);

        // Resolve academic period if needed or provided
        $period = null;
        if ($periodId) {
            $period = AcademicPeriod::where('institution_id', $institution->id)->find($periodId);
        }
        if (!$period) {
            $period = AcademicPeriod::where('institution_id', $institution->id)
                ->where('is_current', true)
                ->first();
        }

        $instCode = strtoupper(trim($institution->matricula_prefix ?: ($institution->code ?: 'INS')));
        // Remove spaces or special characters from instCode
        $instCode = preg_replace('/[^A-Z0-9]/', '', $instCode) ?: 'INS';

        $prefix = '';
        $padding = 2;

        switch ($format) {
            case self::FORMAT_YEAR_SEQ_STANDARD:
                $prefix = "{$year}-";
                $padding = 4;
                break;

            case self::FORMAT_INST_YEAR_SEQ:
                $prefix = "{$instCode}-{$yearShort}-";
                $padding = 3;
                break;

            case self::FORMAT_PERIOD_SEQ:
                $periodName = $period ? trim($period->name) : "{$year}-I";
                // Replace slashes or invalid characters
                $periodClean = str_replace('/', '-', $periodName);
                $prefix = "{$periodClean}-";
                $padding = 3;
                break;

            case self::FORMAT_NUMERIC_SEQ:
                $prefix = '';
                $padding = 6;
                break;

            case self::FORMAT_YEAR_SEQ_SHORT:
            default:
                $format = self::FORMAT_YEAR_SEQ_SHORT;
                $prefix = "{$yearShort}-";
                $padding = 2;
                break;
        }

        $nextSequence = $this->calculateNextSequence($institution->id, $prefix, $format === self::FORMAT_NUMERIC_SEQ);
        $paddedNumber = str_pad((string) $nextSequence, $padding, '0', STR_PAD_LEFT);
        $matricula = "{$prefix}{$paddedNumber}";

        return [
            'matricula' => $matricula,
            'format' => $format,
            'prefix' => $prefix,
            'sequence' => $nextSequence,
            'period_id' => $period?->id,
            'period_name' => $period?->name,
        ];
    }

    /**
     * Calculate the next correlative sequence by scanning existing student numbers.
     */
    protected function calculateNextSequence(int $institutionId, string $prefix, bool $isPureNumeric): int
    {
        $existingCodes = Student::where('institution_id', $institutionId)
            ->whereNotNull('student_id_number')
            ->pluck('student_id_number');

        $max = 0;

        foreach ($existingCodes as $code) {
            $code = trim($code);

            if ($isPureNumeric) {
                if (ctype_digit($code)) {
                    $val = (int) $code;
                    if ($val > $max) {
                        $max = $val;
                    }
                }
            } else {
                if ($prefix !== '' && str_starts_with($code, $prefix)) {
                    $suffix = substr($code, strlen($prefix));
                    if (ctype_digit($suffix)) {
                        $val = (int) $suffix;
                        if ($val > $max) {
                            $max = $val;
                        }
                    }
                }
            }
        }

        return $max + 1;
    }
}
