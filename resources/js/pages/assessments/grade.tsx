import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    Calendar,
    Building2,
    BookOpen,
    Users,
    Search,
    Check,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    Sparkles,
    Calculator,
    BarChart3,
    FileText,
    Percent,
    ExternalLink,
    Filter,
    HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    student_id_number?: string;
}

interface CourseTopic {
    id: number;
    title: string;
    unit_title?: string;
}

interface AssessmentScore {
    id: number;
    assessment_id: number;
    student_id: number;
    score: string | number | null;
    status: 'present' | 'absent' | 'excused';
    feedback?: string;
}

interface Assessment {
    id: number;
    course_id: number;
    title: string;
    description?: string;
    assessment_type: 'exam' | 'practical' | 'project' | 'quiz';
    assessment_date: string;
    max_score: string | number;
    passing_score: string | number;
    weight_percentage?: string | number | null;
    auto_sync_mastery: boolean;
    topics?: CourseTopic[];
    scores?: AssessmentScore[];
    createdBy?: { id: number; name: string };
}

interface Course {
    id: number;
    name: string;
    section?: string;
    institution?: { id: number; name: string };
    academic_period?: { id: number; name: string; is_closed?: boolean };
}

interface Props {
    course: Course;
    assessment: Assessment;
    students: Student[];
    readOnly?: boolean;
}

type FilterType = 'all' | 'graded' | 'pending' | 'passed' | 'reinforcement' | 'absent';

export default function AssessmentGrade({ course, assessment, students, readOnly = false }: Props) {
    const maxScore = Number(assessment.max_score);
    const passingScore = Number(assessment.passing_score);
    const passingPercentage = maxScore > 0 ? Math.round((passingScore / maxScore) * 100) : 70;

    // Build initial student score mapping
    const initialScores = useMemo(() => {
        const map = new Map<number, AssessmentScore>();
        if (assessment.scores) {
            assessment.scores.forEach((s) => map.set(s.student_id, s));
        }

        const data: Record<number, { score: string; status: 'present' | 'absent' | 'excused'; feedback: string }> = {};
        students.forEach((st) => {
            const ex = map.get(st.id);
            data[st.id] = {
                score: ex && ex.score !== null ? String(ex.score) : '',
                status: ex ? ex.status : 'present',
                feedback: ex?.feedback || '',
            };
        });
        return data;
    }, [assessment, students]);

    const [scores, setScores] = useState(initialScores);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterType>('all');
    const [isSaving, setIsSaving] = useState(false);

    // Assessment type label & color
    const typeBadge = useMemo(() => {
        switch (assessment.assessment_type) {
            case 'exam':
                return { label: 'Examen Teórico', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' };
            case 'practical':
                return { label: 'Prueba Práctica (Lab)', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' };
            case 'project':
                return { label: 'Proyecto / Tarea', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' };
            case 'quiz':
                return { label: 'Quiz / Control Corto', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' };
            default:
                return { label: assessment.assessment_type, color: 'bg-muted text-muted-foreground border-border' };
        }
    }, [assessment.assessment_type]);

    // Live Statistics
    const stats = useMemo(() => {
        let gradedCount = 0;
        let passedCount = 0;
        let needsReinforcementCount = 0;
        let absentCount = 0;
        let excusedCount = 0;
        let totalScoreSum = 0;

        students.forEach((st) => {
            const row = scores[st.id];
            if (!row) return;

            if (row.status === 'absent') {
                absentCount++;
            } else if (row.status === 'excused') {
                excusedCount++;
            } else if (row.status === 'present') {
                if (row.score !== '') {
                    gradedCount++;
                    const num = Number(row.score);
                    totalScoreSum += num;
                    if (num >= passingScore) {
                        passedCount++;
                    } else {
                        needsReinforcementCount++;
                    }
                }
            }
        });

        const averageScore = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : '0';
        const averagePercent = gradedCount > 0 && maxScore > 0 ? Math.round((Number(averageScore) / maxScore) * 100) : 0;
        const completionRate = students.length > 0 ? Math.round(((gradedCount + absentCount + excusedCount) / students.length) * 100) : 0;

        return {
            total: students.length,
            gradedCount,
            passedCount,
            needsReinforcementCount,
            absentCount,
            excusedCount,
            averageScore,
            averagePercent,
            completionRate,
        };
    }, [scores, students, maxScore, passingScore]);

    // Quick action: Set all students to present
    const handleSetAllPresent = () => {
        if (readOnly) return;
        setScores((prev) => {
            const next = { ...prev };
            students.forEach((st) => {
                next[st.id] = { ...next[st.id], status: 'present' };
            });
            return next;
        });
    };

    // Quick feedback chip insert
    const handleAddFeedbackPreset = (studentId: number, text: string) => {
        if (readOnly) return;
        setScores((prev) => {
            const current = prev[studentId]?.feedback || '';
            const newFeedback = current ? `${current}. ${text}` : text;
            return {
                ...prev,
                [studentId]: { ...prev[studentId], feedback: newFeedback },
            };
        });
    };

    // Filter students
    const filteredStudents = useMemo(() => {
        return students.filter((st) => {
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !q ||
                st.first_name.toLowerCase().includes(q) ||
                st.last_name.toLowerCase().includes(q) ||
                (st.student_id_number && st.student_id_number.toLowerCase().includes(q));

            if (!matchesQuery) return false;

            const row = scores[st.id];
            if (!row) return true;

            const numScore = row.score !== '' ? Number(row.score) : null;

            switch (statusFilter) {
                case 'graded':
                    return row.status === 'present' && numScore !== null;
                case 'pending':
                    return row.status === 'present' && numScore === null;
                case 'passed':
                    return row.status === 'present' && numScore !== null && numScore >= passingScore;
                case 'reinforcement':
                    return row.status === 'present' && numScore !== null && numScore < passingScore;
                case 'absent':
                    return row.status === 'absent' || row.status === 'excused';
                default:
                    return true;
            }
        });
    }, [students, scores, searchQuery, statusFilter, passingScore]);

    // Save grades
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;

        setIsSaving(true);
        const payload = Object.entries(scores).map(([studentIdStr, val]) => ({
            student_id: Number(studentIdStr),
            score: val.status === 'present' && val.score !== '' ? Number(val.score) : null,
            status: val.status,
            feedback: val.feedback || null,
        }));

        router.post(
            `/courses/${course.id}/assessments/${assessment.id}/scores`,
            { scores: payload },
            {
                onFinish: () => setIsSaving(false),
            }
        );
    };

    return (
        <>
            <Head title={`Calificar: ${assessment.title} - ${course.name}`} />

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-32">
                {/* Header & Breadcrumb */}
                <div className="flex flex-col gap-4 border-b pb-6">
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/courses/${course.id}?tab=grades`}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-muted"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Volver al Curso (Evaluaciones)</span>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <Award className="h-5 w-5 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {readOnly ? 'Consultar Calificaciones: ' : 'Calificar: '} {assessment.title}
                                </h1>
                                <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeBadge.color}`}>
                                    {typeBadge.label}
                                </span>
                                {readOnly && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                        Modo Solo Lectura
                                    </span>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                                Registra las calificaciones, asistencia y retroalimentación pedagógica para {course.name}.
                            </p>
                        </div>

                        {/* Context Badges */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {course.institution && (
                                <div className="bg-muted/60 border rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-semibold text-foreground">{course.institution.name}</span>
                                </div>
                            )}
                            {course.academic_period && (
                                <div className="bg-muted/60 border rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-semibold text-foreground">{course.academic_period.name}</span>
                                </div>
                            )}
                            <div className="bg-muted/60 border rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-bold text-foreground">{students.length}</span>
                                <span className="text-muted-foreground">estudiantes</span>
                            </div>
                        </div>
                    </div>

                    {/* Assessment Details Bar */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground border-t border-dashed">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            Fecha: <strong className="text-foreground">{assessment.assessment_date}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Escala: <strong className="text-foreground">0 a {maxScore} pts</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            Aprueba con: <strong className="text-foreground">&ge; {passingScore} pts ({passingPercentage}%)</strong>
                        </span>
                        {assessment.weight_percentage && (
                            <span className="flex items-center gap-1.5">
                                <Percent className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                Ponderación: <strong className="text-foreground">{Number(assessment.weight_percentage)}%</strong>
                            </span>
                        )}
                        {assessment.auto_sync_mastery && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium text-[11px] border border-emerald-500/20">
                                <Sparkles className="h-3 w-3" /> Sincronización pedagógica automática activa
                            </span>
                        )}
                    </div>

                    {/* Evaluated Topics List */}
                    {assessment.topics && assessment.topics.length > 0 && (
                        <div className="space-y-1.5 bg-muted/30 border rounded-xl p-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-primary" /> Temas del Pensum Evaluados ({assessment.topics.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {assessment.topics.map((t) => (
                                    <span
                                        key={t.id}
                                        className="text-xs bg-background border px-2.5 py-1 rounded-lg text-foreground font-medium flex items-center gap-1 shadow-2xs"
                                    >
                                        {t.unit_title && (
                                            <span className="text-[10px] text-muted-foreground font-mono">[{t.unit_title}]</span>
                                        )}
                                        {t.title}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Real-Time Metrics Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl border bg-card shadow-xs space-y-1.5">
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-primary" /> Progreso de Calificación
                        </span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-xl sm:text-2xl font-bold text-foreground">
                                {stats.gradedCount} <span className="text-xs font-normal text-muted-foreground">/ {stats.total}</span>
                            </span>
                            <span className="text-xs font-bold text-primary font-mono">{stats.completionRate}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${stats.completionRate}%` }}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl border bg-card shadow-xs space-y-1.5">
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Promedio del Grupo
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {stats.averageScore}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                                ({stats.averagePercent}%)
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">de los alumnos calificados</p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-card shadow-xs space-y-1.5">
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Aprobados (&ge; {passingScore})
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {stats.passedCount}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({stats.gradedCount > 0 ? Math.round((stats.passedCount / stats.gradedCount) * 100) : 0}%)
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">alcanzan o superan la meta</p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-card shadow-xs space-y-1.5">
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Requieren Refuerzo
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {stats.needsReinforcementCount}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({stats.gradedCount > 0 ? Math.round((stats.needsReinforcementCount / stats.gradedCount) * 100) : 0}%)
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">notas por debajo de {passingScore}</p>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border rounded-2xl p-4 shadow-xs">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre, apellido o matrícula..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs h-9 bg-background"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter Buttons */}
                        <div className="inline-flex rounded-lg border bg-muted/50 p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Todos ({students.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('pending')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    statusFilter === 'pending'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Pendientes ({students.length - stats.gradedCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('passed')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    statusFilter === 'passed'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Aprobados ({stats.passedCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('reinforcement')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    statusFilter === 'reinforcement'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Refuerzo ({stats.needsReinforcementCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('absent')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    statusFilter === 'absent'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Ausentes ({stats.absentCount + stats.excusedCount})
                            </button>
                        </div>

                        {!readOnly && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSetAllPresent}
                                className="h-8 text-xs gap-1.5 ml-auto"
                                title="Establece el estado de todos los alumnos como Presente"
                            >
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                Marcar Todos Presentes
                            </Button>
                        )}
                    </div>
                </div>

                {/* Grading Form / Table */}
                <form onSubmit={handleSave}>
                    <div className="bg-card border rounded-2xl shadow-xs overflow-hidden">
                        {filteredStudents.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground space-y-2">
                                <Users className="h-8 w-8 mx-auto opacity-40" />
                                <p className="text-sm font-semibold">No se encontraron estudiantes para este filtro.</p>
                                <p className="text-xs">Prueba ajustando los criterios de búsqueda o seleccionando "Todos".</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-muted/70 border-b text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                                        <tr>
                                            <th className="px-4 py-3.5 w-12 text-center">#</th>
                                            <th className="px-4 py-3.5 min-w-[220px]">Estudiante</th>
                                            <th className="px-4 py-3.5 w-[160px]">Asistencia</th>
                                            <th className="px-4 py-3.5 w-[160px] text-center">Calificación (0 - {maxScore})</th>
                                            <th className="px-4 py-3.5 w-[170px] text-center">Impacto Pedagógico</th>
                                            <th className="px-4 py-3.5 min-w-[280px]">Retroalimentación / Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {filteredStudents.map((st, idx) => {
                                            const row = scores[st.id] || { score: '', status: 'present', feedback: '' };
                                            const numScore = row.score !== '' ? Number(row.score) : null;
                                            const isPassing = numScore !== null && numScore >= passingScore;
                                            const isMastered = numScore !== null && maxScore > 0 && (numScore / maxScore) * 100 >= 85;

                                            return (
                                                <tr key={st.id} className="hover:bg-muted/20 transition-colors">
                                                    {/* Row Index */}
                                                    <td className="px-4 py-3 text-center text-muted-foreground font-mono text-[11px]">
                                                        {idx + 1}
                                                    </td>

                                                    {/* Student Identity */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                                                {st.first_name[0]}{st.last_name[0]}
                                                            </div>
                                                            <div>
                                                                <Link
                                                                    href={`/students/${st.id}/profile`}
                                                                    className="font-bold text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-1"
                                                                >
                                                                    <span>{st.last_name}, {st.first_name}</span>
                                                                    <ExternalLink className="h-3 w-3 opacity-40 inline" />
                                                                </Link>
                                                                {st.student_id_number && (
                                                                    <span className="text-[10px] font-mono text-muted-foreground block">
                                                                        Matrícula: {st.student_id_number}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Status Selector */}
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={row.status}
                                                            disabled={readOnly}
                                                            onChange={(e) =>
                                                                setScores({
                                                                    ...scores,
                                                                    [st.id]: { ...row, status: e.target.value as any },
                                                                })
                                                            }
                                                            className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-background transition-colors focus:ring-1 focus:ring-primary ${
                                                                row.status === 'present'
                                                                    ? 'text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/5'
                                                                    : row.status === 'absent'
                                                                    ? 'text-red-700 dark:text-red-300 border-red-500/40 bg-red-500/5'
                                                                    : 'text-blue-700 dark:text-blue-300 border-blue-500/40 bg-blue-500/5'
                                                            } disabled:opacity-70 disabled:cursor-not-allowed`}
                                                        >
                                                            <option value="present">✓ Presente</option>
                                                            <option value="absent">✕ Ausente</option>
                                                            <option value="excused">⏱ Justificado</option>
                                                        </select>
                                                    </td>

                                                    {/* Numeric Score Input */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="inline-flex items-center gap-1.5 justify-center">
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                min="0"
                                                                max={maxScore}
                                                                disabled={readOnly || row.status !== 'present'}
                                                                placeholder="0"
                                                                value={row.score}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setScores({
                                                                        ...scores,
                                                                        [st.id]: { ...row, score: val },
                                                                    });
                                                                }}
                                                                className={`w-20 text-center font-mono font-bold text-sm px-2.5 py-1.5 rounded-lg border bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                                                                    row.status !== 'present'
                                                                        ? 'bg-muted/40 text-muted-foreground cursor-not-allowed border-dashed'
                                                                        : numScore === null
                                                                        ? 'border-input'
                                                                        : isPassing
                                                                        ? 'border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                                                                        : 'border-amber-500 bg-amber-500/5 text-amber-700 dark:text-amber-300'
                                                                }`}
                                                            />
                                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                                / {maxScore}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Mastery / Pedagogical Impact Badge */}
                                                    <td className="px-4 py-3 text-center">
                                                        {row.status !== 'present' ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border">
                                                                {row.status === 'absent' ? 'No rindió prueba' : 'Justificado'}
                                                            </span>
                                                        ) : numScore === null ? (
                                                            <span className="text-muted-foreground/60 font-mono text-[11px]">- Sin nota -</span>
                                                        ) : isMastered ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                                                                <Sparkles className="h-3 w-3" /> Dominio ({Math.round((numScore / maxScore) * 100)}%)
                                                            </span>
                                                        ) : isPassing ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                                                <CheckCircle2 className="h-3 w-3" /> Aprobado ({Math.round((numScore / maxScore) * 100)}%)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                                                <AlertTriangle className="h-3 w-3" /> Refuerzo ({Math.round((numScore / maxScore) * 100)}%)
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Observations & Feedback */}
                                                    <td className="px-4 py-3">
                                                        <div className="space-y-1.5">
                                                            <Input
                                                                type="text"
                                                                placeholder="Observaciones o retroalimentación formativa..."
                                                                value={row.feedback}
                                                                disabled={readOnly}
                                                                onChange={(e) =>
                                                                    setScores({
                                                                        ...scores,
                                                                        [st.id]: { ...row, feedback: e.target.value },
                                                                    })
                                                                }
                                                                className="text-xs h-8 bg-background"
                                                            />
                                                            {!readOnly && (
                                                                <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                                                                    <span className="opacity-60">Sugerir:</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddFeedbackPreset(st.id, 'Excelente desempeño y dominio')}
                                                                        className="hover:underline hover:text-primary transition-colors"
                                                                    >
                                                                        + Excelente
                                                                    </button>
                                                                    <span>·</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddFeedbackPreset(st.id, 'Requiere repasar conceptos evaluados')}
                                                                        className="hover:underline hover:text-amber-600 transition-colors"
                                                                    >
                                                                        + Repasar temas
                                                                    </button>
                                                                    <span>·</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddFeedbackPreset(st.id, 'Práctica incompleta')}
                                                                        className="hover:underline hover:text-destructive transition-colors"
                                                                    >
                                                                        + Incompleto
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Sticky Bottom Action Bar */}
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t shadow-lg py-3 px-4 sm:px-8">
                        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5 font-medium text-foreground">
                                    <Users className="h-4 w-4 text-primary" />
                                    <span>{stats.gradedCount} de {stats.total} calificados</span>
                                </span>
                                {assessment.auto_sync_mastery && (
                                    <span className="hidden sm:inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <Sparkles className="h-3 w-3" />
                                        <span>Actualizará matriz pedagógica al guardar</span>
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Link href={`/courses/${course.id}?tab=grades`}>
                                    <Button type="button" variant="outline" size="sm" className="text-xs">
                                        {readOnly ? 'Volver al Curso' : 'Cancelar'}
                                    </Button>
                                </Link>

                                {!readOnly && (
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={isSaving}
                                        className="text-xs gap-1.5 bg-primary hover:bg-primary/90 font-semibold"
                                    >
                                        <Check className="h-4 w-4" />
                                        {isSaving ? 'Guardando Calificaciones...' : 'Guardar Calificaciones'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
