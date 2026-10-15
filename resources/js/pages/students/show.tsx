import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Mail,
    Phone,
    Calendar,
    GraduationCap,
    CheckCircle2,
    RotateCcw,
    Sparkles,
    BookOpen,
    Users,
    Award,
    FileText,
    Computer,
    Building2,
    Pencil,
    Trash2,
    Copy,
    Check,
    UserCheck,
    Clock,
    UserMinus,
    Layers,
    ChevronRight,
    TrendingUp,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatNaturalDate } from '@/lib/formatters';

interface InstitutionInfo {
    id: number;
    name: string;
    code?: string;
}

interface StudentInfo {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    student_id_number?: string;
    email?: string;
    phone?: string;
    notes?: string;
    is_active: boolean;
    created_at?: string;
    institution?: InstitutionInfo | null;
}

interface StudentMetrics {
    total_periods: number;
    total_courses: number;
    promoted_courses: number;
    repeated_courses: number;
    active_courses: number;
    withdrawn_courses: number;
    average_score: number | null;
    assessments_taken: number;
    attendance_rate: number | null;
    sessions_attended: number;
    total_course_sessions: number;
    topics_mastered: number;
    total_topics_evaluated: number;
}

interface TrajectoryCourse {
    course_id: number;
    name: string;
    code?: string;
    section?: string;
    course_status: string;
    enrollment_status: string;
    enrolled_at?: string;
    preferred_workstation?: string;
    teachers: string[];
    metrics: {
        average_score: number | null;
        scores_count: number;
        attended_sessions: number;
        total_sessions: number;
        attendance_rate: number | null;
        topics_total: number;
        topics_mastered: number;
    };
}

interface TrajectoryPeriod {
    period: {
        id: number;
        name: string;
        is_current: boolean;
        is_closed: boolean;
        start_date?: string;
        end_date?: string;
    };
    courses: TrajectoryCourse[];
}

interface AssessmentItem {
    id: number;
    title: string;
    type: string;
    score: number | null;
    max_score: number;
    percentage: number | null;
    status: string;
    feedback?: string;
    graded_at?: string;
    course_id?: number;
    course_name?: string;
    course_section?: string;
    period_name?: string;
}

interface AttendanceItem {
    id: number;
    session_id?: number;
    session_title: string;
    session_date?: string;
    start_time?: string;
    end_time?: string;
    course_id?: number;
    course_name?: string;
    course_section?: string;
    period_name?: string;
    workstation?: string;
    notes?: string;
    topics: string[];
}

interface TopicProgressItem {
    id: number;
    topic_id?: number;
    topic_title: string;
    unit_title?: string;
    course_id?: number;
    course_name?: string;
    period_name?: string;
    coverage_status: string;
    mastery_level: string;
    evaluation_notes?: string;
    evaluated_at?: string;
}

interface Props {
    student: StudentInfo;
    metrics: StudentMetrics;
    trajectory: TrajectoryPeriod[];
    assessments: AssessmentItem[];
    attendances: AttendanceItem[];
    topicProgress: TopicProgressItem[];
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function StudentShow({
    student,
    metrics,
    trajectory = [],
    assessments = [],
    attendances = [],
    topicProgress = [],
    canEdit = false,
    canDelete = false,
}: Props) {
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const [copiedMatricula, setCopiedMatricula] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [activeTab, setActiveTab] = useState<'trajectory' | 'grades' | 'attendance' | 'competencies'>('trajectory');

    // Edit form
    const editForm = useForm({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        student_id_number: student.student_id_number || '',
        email: student.email || '',
        phone: student.phone || '',
        notes: student.notes || '',
        is_active: student.is_active,
    });

    const handleCopyMatricula = () => {
        if (!student.student_id_number) return;
        navigator.clipboard.writeText(student.student_id_number);
        setCopiedMatricula(true);
        setTimeout(() => setCopiedMatricula(false), 2000);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(`/students/${student.id}`, {
            onSuccess: () => setOpenEditDialog(false),
        });
    };

    const handleDelete = () => {
        confirm({
            title: `¿Eliminar a "${student.full_name}" del padrón?`,
            description: 'Se eliminarán sus matrículas y registros asociados en esta institución de manera definitiva.',
            confirmText: 'Eliminar Estudiante',
            variant: 'destructive',
            onConfirm: () => router.delete(`/students/${student.id}`),
        });
    };

    // Helper for initials
    const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase() || 'ST';

    // Helper badge for enrollment status
    const renderEnrollmentBadge = (status: string) => {
        switch (status) {
            case 'promoted':
                return (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold text-xs py-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado / Promovido
                    </Badge>
                );
            case 'repeated':
                return (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold text-xs py-0.5">
                        <RotateCcw className="h-3.5 w-3.5" /> Repitente en este curso
                    </Badge>
                );
            case 'withdrawn':
                return (
                    <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 font-semibold text-xs py-0.5">
                        <UserMinus className="h-3.5 w-3.5" /> Retirado / Baja
                    </Badge>
                );
            case 'active':
            default:
                return (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 font-semibold text-xs py-0.5">
                        <Sparkles className="h-3.5 w-3.5" /> Activo (Cursando)
                    </Badge>
                );
        }
    };

    // Helper for mastery badge
    const renderMasteryBadge = (level: string) => {
        switch (level) {
            case 'mastered':
                return (
                    <Badge className="bg-emerald-600 text-white font-semibold text-[10px]">
                        Dominado
                    </Badge>
                );
            case 'competent':
                return (
                    <Badge className="bg-blue-600 text-white font-semibold text-[10px]">
                        Competente
                    </Badge>
                );
            case 'in_progress':
                return (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold text-[10px]">
                        En Proceso
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                        Introducido
                    </Badge>
                );
        }
    };

    return (
        <>
            <Head title={`Ficha de Estudiante - ${student.full_name}`} />

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
                {/* Top Breadcrumb & Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link
                        href="/students"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-muted w-fit"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Volver al Padrón de Estudiantes</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 h-8 text-xs"
                                onClick={() => setOpenEditDialog(true)}
                            >
                                <Pencil className="h-3.5 w-3.5" /> Editar Datos
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={handleDelete}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Student Header / Dossier Card */}
                <div className="bg-card border rounded-2xl p-6 shadow-xs space-y-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        {/* Avatar & Personal Identity */}
                        <div className="flex items-start gap-4">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-sm shrink-0">
                                {initials}
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                        {student.full_name}
                                    </h1>
                                    {student.is_active ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold">
                                            Activo
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs">
                                            Inactivo
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    {student.student_id_number && (
                                        <button
                                            type="button"
                                            onClick={handleCopyMatricula}
                                            className="inline-flex items-center gap-1 font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground hover:bg-muted/80 transition-colors border text-xs"
                                            title="Copiar matrícula"
                                        >
                                            <span>Matrícula: {student.student_id_number}</span>
                                            {copiedMatricula ? (
                                                <Check className="h-3 w-3 text-emerald-600" />
                                            ) : (
                                                <Copy className="h-3 w-3 text-muted-foreground" />
                                            )}
                                        </button>
                                    )}

                                    {student.institution && (
                                        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-md font-medium text-xs">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {student.institution.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Data */}
                        <div className="flex flex-col gap-2 text-xs text-muted-foreground bg-muted/20 p-3.5 rounded-xl border sm:min-w-[240px]">
                            <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {student.email ? (
                                    <a
                                        href={`mailto:${student.email}`}
                                        className="text-foreground hover:underline truncate"
                                    >
                                        {student.email}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground/60 italic">Sin correo</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {student.phone ? (
                                    <a
                                        href={`tel:${student.phone}`}
                                        className="text-foreground hover:underline"
                                    >
                                        {student.phone}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground/60 italic">Sin teléfono</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>
                                    Registrado: {student.created_at ? formatNaturalDate(student.created_at) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Optional Notes */}
                    {student.notes && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-semibold block mb-0.5">Observaciones administrativas:</span>
                            <p className="whitespace-pre-line leading-relaxed">{student.notes}</p>
                        </div>
                    )}
                </div>

                {/* Key Metrics Dashboard Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    <div className="bg-card border rounded-2xl p-4 shadow-xs space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Ciclos Escolares
                        </span>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                            {metrics.total_periods}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Períodos académicos cursados
                        </p>
                    </div>

                    <div className="bg-card border rounded-2xl p-4 shadow-xs space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Cursos / Materias
                        </span>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                            {metrics.total_courses}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            {metrics.promoted_courses} aprobados • {metrics.repeated_courses} repite • {metrics.active_courses} activo
                        </p>
                    </div>

                    <div className="bg-card border rounded-2xl p-4 shadow-xs space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-amber-500" /> Promedio General
                        </span>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                            {metrics.average_score !== null ? `${metrics.average_score} pts` : '—'}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            {metrics.assessments_taken} evaluaciones registradas
                        </p>
                    </div>

                    <div className="bg-card border rounded-2xl p-4 shadow-xs space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-500" /> Asistencia Acumulada
                        </span>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                            {metrics.attendance_rate !== null ? `${metrics.attendance_rate}%` : '—'}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            {metrics.sessions_attended} de {metrics.total_course_sessions} sesiones asistidas
                        </p>
                    </div>

                    <div className="bg-card border rounded-2xl p-4 shadow-xs space-y-1 col-span-2 sm:col-span-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-violet-500" /> Temas Dominados
                        </span>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                            {metrics.topics_mastered}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            de {metrics.total_topics_evaluated} competencias evaluadas
                        </p>
                    </div>
                </div>

                {/* Tabs Selector */}
                <div className="border-b flex items-center gap-1 overflow-x-auto pb-px">
                    <button
                        type="button"
                        onClick={() => setActiveTab('trajectory')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'trajectory'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        Trayecto Académico ({trajectory.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('grades')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'grades'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Award className="h-4 w-4" />
                        Calificaciones ({assessments.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('attendance')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'attendance'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Clock className="h-4 w-4" />
                        Asistencias ({attendances.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('competencies')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'competencies'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <BookOpen className="h-4 w-4" />
                        Competencias y Temas ({topicProgress.length})
                    </button>
                </div>

                {/* TAB 1: TRAYECTO ACADÉMICO (TIMELINE HISTÓRICO) */}
                {activeTab === 'trajectory' && (
                    <div className="space-y-6">
                        {trajectory.length === 0 ? (
                            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
                                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                                <h3 className="font-semibold text-base text-foreground">
                                    Sin historial de cursos
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                                    Este estudiante aún no ha sido matriculado en ningún curso o período académico.
                                </p>
                            </div>
                        ) : (
                            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                                {trajectory.map((item, pIdx) => (
                                    <div key={item.period.id || pIdx} className="relative space-y-4">
                                        {/* Timeline Dot Indicator */}
                                        <div
                                            className={`absolute -left-6 sm:-left-8 top-1 h-6 w-6 rounded-full border-2 bg-background flex items-center justify-center ${
                                                item.period.is_current
                                                    ? 'border-emerald-500 text-emerald-600 shadow-xs'
                                                    : 'border-muted-foreground/40 text-muted-foreground'
                                            }`}
                                        >
                                            <div
                                                className={`h-2 w-2 rounded-full ${
                                                    item.period.is_current ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                                }`}
                                            />
                                        </div>

                                        {/* Period Banner Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border">
                                            <div className="flex items-center gap-2.5">
                                                <Calendar className="h-4 w-4 text-primary" />
                                                <span className="font-bold text-sm text-foreground">
                                                    Período {item.period.name}
                                                </span>
                                                {item.period.is_current && (
                                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                                                        Período Actual
                                                    </Badge>
                                                )}
                                                {item.period.is_closed && (
                                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                        Ciclo Cerrado / Histórico
                                                    </Badge>
                                                )}
                                            </div>

                                            {(item.period.start_date || item.period.end_date) && (
                                                <span className="text-xs text-muted-foreground">
                                                    {item.period.start_date ? formatNaturalDate(item.period.start_date) : ''}
                                                    {item.period.end_date ? ` — ${formatNaturalDate(item.period.end_date)}` : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Courses Cards for this Period */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {item.courses.map((course) => (
                                                <div
                                                    key={course.course_id}
                                                    className="bg-card border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                                                >
                                                    <div className="space-y-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                                                                    {course.name}
                                                                    {course.section && (
                                                                        <span className="text-xs font-mono font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                                                            {course.section}
                                                                        </span>
                                                                    )}
                                                                </h4>
                                                                {course.code && (
                                                                    <span className="text-[11px] font-mono text-muted-foreground">
                                                                        Código: {course.code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                {renderEnrollmentBadge(course.enrollment_status)}
                                                            </div>
                                                        </div>

                                                        {/* Teachers & Workstation info */}
                                                        <div className="space-y-1 text-xs text-muted-foreground">
                                                            {course.teachers.length > 0 && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Users className="h-3.5 w-3.5 shrink-0" />
                                                                    <span>Docente(s): {course.teachers.join(', ')}</span>
                                                                </div>
                                                            )}
                                                            {course.preferred_workstation && (
                                                                <div className="flex items-center gap-1.5 font-mono">
                                                                    <Computer className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                                    <span>Puesto asignado: {course.preferred_workstation}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Mini Academic Metrics Grid */}
                                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                                                            <div className="bg-muted/30 p-2 rounded-lg text-center">
                                                                <span className="text-[10px] text-muted-foreground block">
                                                                    Calificación
                                                                </span>
                                                                <span className="font-bold text-foreground">
                                                                    {course.metrics.average_score !== null
                                                                        ? `${course.metrics.average_score} pts`
                                                                        : '—'}
                                                                </span>
                                                            </div>

                                                            <div className="bg-muted/30 p-2 rounded-lg text-center">
                                                                <span className="text-[10px] text-muted-foreground block">
                                                                    Asistencia
                                                                </span>
                                                                <span className="font-bold text-foreground">
                                                                    {course.metrics.attendance_rate !== null
                                                                        ? `${course.metrics.attendance_rate}%`
                                                                        : '—'}
                                                                </span>
                                                            </div>

                                                            <div className="bg-muted/30 p-2 rounded-lg text-center">
                                                                <span className="text-[10px] text-muted-foreground block">
                                                                    Competencias
                                                                </span>
                                                                <span className="font-bold text-foreground">
                                                                    {course.metrics.topics_mastered} / {course.metrics.topics_total}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 flex justify-end">
                                                        <Link href={`/courses/${course.course_id}`}>
                                                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                                                                Ver Asignatura <ChevronRight className="h-3 w-3" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: CALIFICACIONES Y EVALUACIONES */}
                {activeTab === 'grades' && (
                    <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
                        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Historial Completo de Calificaciones
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Registro de evaluaciones, exámenes y asignaciones evaluadas en todos los períodos.
                                </p>
                            </div>
                            <Badge variant="outline" className="text-xs font-semibold">
                                {assessments.length} registro{assessments.length === 1 ? '' : 's'}
                            </Badge>
                        </div>

                        {assessments.length === 0 ? (
                            <div className="p-10 text-center text-xs text-muted-foreground">
                                No se registran calificaciones o evaluaciones para este estudiante.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                                            <th className="py-2.5 px-4">Evaluación</th>
                                            <th className="py-2.5 px-4">Asignatura</th>
                                            <th className="py-2.5 px-4">Período</th>
                                            <th className="py-2.5 px-4 text-center">Puntaje</th>
                                            <th className="py-2.5 px-4 text-center">Porcentaje</th>
                                            <th className="py-2.5 px-4">Retroalimentación</th>
                                            <th className="py-2.5 px-4">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {assessments.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/15 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="font-semibold text-foreground block">
                                                        {item.title}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Link
                                                        href={`/courses/${item.course_id}`}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {item.course_name}
                                                    </Link>
                                                    {item.course_section && (
                                                        <span className="text-[10px] text-muted-foreground font-mono ml-1">
                                                            ({item.course_section})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {item.period_name || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-foreground">
                                                    {item.score !== null ? `${item.score} / ${item.max_score}` : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {item.percentage !== null ? (
                                                        <span
                                                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                                                                item.percentage >= 70
                                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                                                            }`}
                                                        >
                                                            {item.percentage}%
                                                        </span>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                                                    {item.feedback || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                                                    {item.graded_at ? formatNaturalDate(item.graded_at) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: ASISTENCIAS Y SESIONES */}
                {activeTab === 'attendance' && (
                    <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
                        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Historial de Asistencias a Clases
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Registro de participación en sesiones prácticas y teóricas de cada asignatura.
                                </p>
                            </div>
                            <Badge variant="outline" className="text-xs font-semibold">
                                {attendances.length} sesión{attendances.length === 1 ? '' : 'es'}
                            </Badge>
                        </div>

                        {attendances.length === 0 ? (
                            <div className="p-10 text-center text-xs text-muted-foreground">
                                No se registran asistencias para este estudiante.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                                            <th className="py-2.5 px-4">Fecha</th>
                                            <th className="py-2.5 px-4">Asignatura</th>
                                            <th className="py-2.5 px-4">Sesión</th>
                                            <th className="py-2.5 px-4">Puesto</th>
                                            <th className="py-2.5 px-4">Temas Tratados</th>
                                            <th className="py-2.5 px-4">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {attendances.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/15 transition-colors">
                                                <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                                                    {item.session_date ? formatNaturalDate(item.session_date) : '—'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-semibold text-foreground block">
                                                        {item.course_name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {item.period_name}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-foreground font-medium">
                                                    {item.session_title}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {item.workstation ? (
                                                        <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-muted px-2 py-0.5 rounded text-foreground">
                                                            <Computer className="h-3 w-3" /> {item.workstation}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/60">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground max-w-sm">
                                                    {item.topics.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.topics.map((t, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="bg-muted text-[10px] px-1.5 py-0.5 rounded text-foreground"
                                                                >
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {item.notes || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: COMPETENCIAS Y TEMAS EVALUADOS */}
                {activeTab === 'competencies' && (
                    <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
                        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Progreso y Dominio de Pensum
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Nivel de adquisición y maestría de competencias y contenidos evaluados.
                                </p>
                            </div>
                            <Badge variant="outline" className="text-xs font-semibold">
                                {topicProgress.length} tema{topicProgress.length === 1 ? '' : 's'}
                            </Badge>
                        </div>

                        {topicProgress.length === 0 ? (
                            <div className="p-10 text-center text-xs text-muted-foreground">
                                No hay registros de progreso o competencias evaluadas para este estudiante.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                                            <th className="py-2.5 px-4">Tema / Contenido</th>
                                            <th className="py-2.5 px-4">Unidad</th>
                                            <th className="py-2.5 px-4">Asignatura</th>
                                            <th className="py-2.5 px-4">Nivel de Maestría</th>
                                            <th className="py-2.5 px-4">Estado</th>
                                            <th className="py-2.5 px-4">Fecha de Evaluación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {topicProgress.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/15 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-foreground">
                                                    {item.topic_title}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {item.unit_title || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-foreground font-medium">
                                                    {item.course_name}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {renderMasteryBadge(item.mastery_level)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="capitalize text-[11px] text-muted-foreground">
                                                        {item.coverage_status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                                                    {item.evaluated_at ? formatNaturalDate(item.evaluated_at) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Edit Student Dialog */}
                <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar Ficha del Estudiante</DialogTitle>
                            <DialogDescription>
                                Actualiza los datos de contacto, matrícula y estado administrativo.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="first_name">Nombres *</Label>
                                    <Input
                                        id="first_name"
                                        value={editForm.data.first_name}
                                        onChange={(e) => editForm.setData('first_name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="last_name">Apellidos *</Label>
                                    <Input
                                        id="last_name"
                                        value={editForm.data.last_name}
                                        onChange={(e) => editForm.setData('last_name', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="student_id_number">Matrícula / Carnet</Label>
                                <Input
                                    id="student_id_number"
                                    value={editForm.data.student_id_number}
                                    onChange={(e) => editForm.setData('student_id_number', e.target.value)}
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email">Correo</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={editForm.data.email}
                                        onChange={(e) => editForm.setData('email', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        value={editForm.data.phone}
                                        onChange={(e) => editForm.setData('phone', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="notes">Observaciones</Label>
                                <Input
                                    id="notes"
                                    value={editForm.data.notes}
                                    onChange={(e) => editForm.setData('notes', e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={editForm.data.is_active}
                                        onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span>Estudiante activo en la institución</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpenEditDialog(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Custom Confirmation Dialog */}
                <ConfirmDialogComponent />
            </div>
        </>
    );
}

StudentShow.layout = {
    breadcrumbs: [
        {
            title: 'Estudiantes',
            href: '/students',
        },
    ],
};
