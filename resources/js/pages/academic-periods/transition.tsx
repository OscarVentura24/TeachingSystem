import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    ArrowRight,
    Lock,
    Users,
    CheckCircle2,
    BookOpen,
    Sparkles,
    GraduationCap,
    Search,
    AlertCircle,
    RotateCcw,
    Building2,
    Check,
    UserMinus,
    HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

interface AcademicPeriod {
    id: number;
    name: string;
    is_current?: boolean;
    is_closed?: boolean;
    start_date?: string;
    end_date?: string;
}

interface StudentItem {
    id: number;
    first_name: string;
    last_name: string;
    student_id_number?: string;
    pivot?: {
        status?: string;
        preferred_workstation?: string;
    };
}

interface CourseItem {
    id: number;
    name: string;
    section?: string;
    code?: string;
    academic_period_id?: number;
    students_count?: number;
    course_topics_count?: number;
    students?: StudentItem[];
}

interface Props {
    sourcePeriod: AcademicPeriod;
    academicPeriods: AcademicPeriod[];
    courses: CourseItem[];
    activeInstitution: {
        id: number;
        name: string;
    };
}

type PromotionAction = 'promote' | 'repeat' | 'withdraw' | 'none';

interface StudentPromotionRecord {
    action: PromotionAction;
    mark_institution_inactive?: boolean;
}

export default function AcademicPeriodTransition({
    sourcePeriod,
    academicPeriods = [],
    courses = [],
    activeInstitution,
}: Props) {
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    // Planned periods that are not the current source period and not closed
    const plannedPeriods = useMemo(() => {
        return academicPeriods.filter(
            (p) => !p.is_closed && !p.is_current && p.id !== sourcePeriod.id
        );
    }, [academicPeriods, sourcePeriod]);

    const { data, setData, post, processing, errors } = useForm({
        new_period_name: '',
        start_date: '',
        end_date: '',
        is_current: true,
        close_source_period: true,
        clone_course_ids: [] as number[],
        promote_students: false,
    });

    // Promotion mode: 'none' (empty new courses) or 'configure' (customize who passed / repeated / withdrew)
    const [promotionMode, setPromotionMode] = useState<'configure' | 'none'>('configure');

    // Map: sourceCourseId -> targetSourceCourseId for promoted students (e.g. 3er Curso -> 4to Curso)
    const [coursePromoteTargets, setCoursePromoteTargets] = useState<Record<number, number | ''>>({});

    // Map: sourceCourseId -> studentId -> StudentPromotionRecord
    const [courseStudentPromotions, setCourseStudentPromotions] = useState<
        Record<number, Record<number, StudentPromotionRecord>>
    >({});

    // Per-course student search filters
    const [studentSearch, setStudentSearch] = useState<Record<number, string>>({});

    // Helper: auto-suggest target course for next grade level
    const findNextCourseSuggestion = (sourceCourse: CourseItem, allCourses: CourseItem[]): number | '' => {
        const otherCourses = allCourses.filter((c) => c.id !== sourceCourse.id);
        if (otherCourses.length === 0) return '';

        // Match numbers in names (e.g., "3er Curso" -> looks for "4to Curso")
        const numMatch = sourceCourse.name.match(/\d+/);
        if (numMatch) {
            const nextNum = parseInt(numMatch[0], 10) + 1;
            const nextMatch = otherCourses.find((c) => c.name.includes(String(nextNum)));
            if (nextMatch) return nextMatch.id;
        }

        // Fallback: check index in list
        const idx = allCourses.findIndex((c) => c.id === sourceCourse.id);
        if (idx !== -1 && idx + 1 < allCourses.length) {
            return allCourses[idx + 1].id;
        }

        return '';
    };

    // Initialize course selections, defaults, and students on mount
    useEffect(() => {
        if (courses.length > 0) {
            const allCourseIds = courses.map((c) => c.id);
            setData((prev) => ({
                ...prev,
                clone_course_ids: allCourseIds,
            }));

            const initialTargets: Record<number, number | ''> = {};
            const initialPromotions: Record<number, Record<number, StudentPromotionRecord>> = {};

            courses.forEach((c) => {
                initialTargets[c.id] = findNextCourseSuggestion(c, courses);
                initialPromotions[c.id] = {};

                if (c.students && c.students.length > 0) {
                    c.students.forEach((st) => {
                        initialPromotions[c.id][st.id] = {
                            action: 'promote',
                            mark_institution_inactive: false,
                        };
                    });
                }
            });

            setCoursePromoteTargets(initialTargets);
            setCourseStudentPromotions(initialPromotions);
        }

        // If there's an already planned next period (e.g. 2027-2028), prefill its name
        if (plannedPeriods.length > 0) {
            const planned = plannedPeriods[0];
            const extractDatePart = (d?: string | null) => {
                if (!d) return '';
                return d.includes('T') ? d.split('T')[0] : d;
            };
            setData((prev) => ({
                ...prev,
                new_period_name: planned.name,
                start_date: extractDatePart(planned.start_date) || '',
                end_date: extractDatePart(planned.end_date) || '',
            }));
        }
    }, [courses, plannedPeriods]);

    const handleSelectExistingPeriod = (period: AcademicPeriod) => {
        const extractDatePart = (d?: string | null) => {
            if (!d) return '';
            return d.includes('T') ? d.split('T')[0] : d;
        };
        setData((prev) => ({
            ...prev,
            new_period_name: period.name,
            start_date: extractDatePart(period.start_date) || prev.start_date,
            end_date: extractDatePart(period.end_date) || prev.end_date,
        }));
    };

    const toggleCourse = (id: number) => {
        setData((prev) => ({
            ...prev,
            clone_course_ids: prev.clone_course_ids.includes(id)
                ? prev.clone_course_ids.filter((cId) => cId !== id)
                : [...prev.clone_course_ids, id],
        }));
    };

    const toggleAllCourses = () => {
        setData((prev) => ({
            ...prev,
            clone_course_ids:
                prev.clone_course_ids.length === courses.length
                    ? []
                    : courses.map((c) => c.id),
        }));
    };

    // Promotion actions helpers for a course
    const handleSetAllCourseStudentsAction = (courseId: number, action: PromotionAction) => {
        setCourseStudentPromotions((prev) => {
            const courseMap = { ...(prev[courseId] || {}) };
            const course = courses.find((c) => c.id === courseId);
            if (course?.students) {
                course.students.forEach((st) => {
                    courseMap[st.id] = {
                        action,
                        mark_institution_inactive: false,
                    };
                });
            }
            return { ...prev, [courseId]: courseMap };
        });
    };

    const handleStudentActionChange = (
        courseId: number,
        studentId: number,
        action: PromotionAction
    ) => {
        setCourseStudentPromotions((prev) => {
            const courseMap = { ...(prev[courseId] || {}) };
            courseMap[studentId] = {
                ...(courseMap[studentId] || {}),
                action,
            };
            return { ...prev, [courseId]: courseMap };
        });
    };

    const handleToggleStudentInactive = (courseId: number, studentId: number) => {
        setCourseStudentPromotions((prev) => {
            const courseMap = { ...(prev[courseId] || {}) };
            const current = courseMap[studentId] || { action: 'withdraw' };
            courseMap[studentId] = {
                ...current,
                mark_institution_inactive: !current.mark_institution_inactive,
            };
            return { ...prev, [courseId]: courseMap };
        });
    };

    // Calculate promotion summary counts
    const promotionCounts = useMemo(() => {
        let promoted = 0;
        let repeated = 0;
        let withdrawn = 0;
        let total = 0;

        if (promotionMode === 'configure') {
            data.clone_course_ids.forEach((cId) => {
                const cPromotions = courseStudentPromotions[cId] || {};
                Object.values(cPromotions).forEach((p) => {
                    if (p.action === 'promote') {
                        promoted++;
                        total++;
                    } else if (p.action === 'repeat') {
                        repeated++;
                        total++;
                    } else if (p.action === 'withdraw') {
                        withdrawn++;
                        total++;
                    }
                });
            });
        }

        return { promoted, repeated, withdrawn, total };
    }, [promotionMode, data.clone_course_ids, courseStudentPromotions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.new_period_name.trim()) return;

        // Build flat promotions array if configured
        const promotionsPayload: Array<{
            student_id: number;
            source_course_id: number;
            action: PromotionAction;
            target_source_course_id?: number | null;
            mark_institution_inactive?: boolean;
        }> = [];

        if (promotionMode === 'configure') {
            data.clone_course_ids.forEach((cId) => {
                const cPromotions = courseStudentPromotions[cId] || {};
                const targetCourseId = coursePromoteTargets[cId]
                    ? Number(coursePromoteTargets[cId])
                    : null;

                Object.entries(cPromotions).forEach(([stIdStr, pRecord]) => {
                    if (pRecord.action !== 'none') {
                        promotionsPayload.push({
                            student_id: Number(stIdStr),
                            source_course_id: cId,
                            action: pRecord.action,
                            target_source_course_id:
                                pRecord.action === 'promote' ? targetCourseId : null,
                            mark_institution_inactive: pRecord.mark_institution_inactive || false,
                        });
                    }
                });
            });
        }

        confirm({
            title: '¿Confirmar y ejecutar transición de período escolar?',
            description: `Se cerrará el período ${sourcePeriod.name}, se creará el nuevo período lectivo "${data.new_period_name}", se replicarán ${data.clone_course_ids.length} cursos con sus planes de estudio, y ${
                promotionMode === 'configure'
                    ? `se procesará la resolución académica de ${promotionCounts.total} estudiantes (${promotionCounts.promoted} promovidos, ${promotionCounts.repeated} repitentes y ${promotionCounts.withdrawn} retirados).`
                    : 'los nuevos cursos se crearán sin estudiantes para matriculación manual.'
            }`,
            confirmText: 'Ejecutar Transición',
            variant: 'primary',
            onConfirm: () => {
                router.post(
                    `/academic-periods/${sourcePeriod.id}/rollover`,
                    {
                        ...data,
                        promote_students: false,
                        promotions: promotionsPayload,
                    }
                );
            },
        });
    };

    return (
        <>
            <Head title={`Transición de Período - ${activeInstitution.name}`} />

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-36">
                {/* Header with Navigation */}
                <div className="flex flex-col gap-3 border-b pb-6">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/courses"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-muted"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Volver a Cursos</span>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <Sparkles className="h-6 w-6 text-indigo-500 shrink-0" />
                                    Transición y Cierre de Período Escolar
                                </h1>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                                Asistente institucional para cerrar el ciclo lectivo saliente, aperturar el nuevo año escolar, replicar asignaturas con sus planes de estudio completos y organizar la continuidad y promoción de los estudiantes.
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className="bg-muted/60 border rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">{activeInstitution.name}</span>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs">
                                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-muted-foreground">Período Saliente:</span>
                                <span className="font-bold text-amber-700 dark:text-amber-300">{sourcePeriod.name}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* SECTION 1: Datos del Nuevo Período */}
                    <div className="bg-card border rounded-2xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center gap-2.5 border-b pb-3">
                            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                1
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-foreground">
                                    Datos del Nuevo Período Lectivo
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Identifica el nuevo ciclo académico que entrará en vigencia.
                                </p>
                            </div>
                        </div>

                        {/* Quick planned periods detection */}
                        {plannedPeriods.length > 0 && (
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                                    <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                                    <span>
                                        Tienes un período previamente planificado:{' '}
                                        <strong className="font-semibold">{plannedPeriods[0].name}</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {plannedPeriods.map((p) => (
                                        <Button
                                            key={p.id}
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className={`h-7 text-xs border-indigo-300 dark:border-indigo-800 ${
                                                data.new_period_name.trim().toLowerCase() === p.name.trim().toLowerCase()
                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                    : 'hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                            }`}
                                            onClick={() => handleSelectExistingPeriod(p)}
                                        >
                                            {data.new_period_name.trim().toLowerCase() === p.name.trim().toLowerCase() && (
                                                <Check className="h-3 w-3 mr-1" />
                                            )}
                                            Usar "{p.name}"
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5 md:col-span-1">
                                <Label htmlFor="new_period_name" className="text-xs font-medium">
                                    Nombre del Nuevo Período *
                                </Label>
                                <Input
                                    id="new_period_name"
                                    placeholder="Ej: 2027-2028 o Año Escolar 2027-2028"
                                    value={data.new_period_name}
                                    onChange={(e) => setData('new_period_name', e.target.value)}
                                    className="text-sm font-medium"
                                    required
                                />
                                {errors.new_period_name && (
                                    <p className="text-xs text-destructive">{errors.new_period_name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="start_date" className="text-xs font-medium">
                                    Fecha de Inicio (Opcional)
                                </Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={data.start_date}
                                    onChange={(e) => setData('start_date', e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="end_date" className="text-xs font-medium">
                                    Fecha de Fin (Opcional)
                                </Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={data.end_date}
                                    onChange={(e) => setData('end_date', e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
                                <Checkbox
                                    checked={data.is_current}
                                    onCheckedChange={(checked) => setData('is_current', !!checked)}
                                    className="mt-0.5"
                                />
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        Activar como Período Actual
                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300">
                                            Recomendado
                                        </Badge>
                                    </span>
                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                        Los docentes y directores ingresarán directamente a los cursos de este ciclo.
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
                                <Checkbox
                                    checked={data.close_source_period}
                                    onCheckedChange={(checked) => setData('close_source_period', !!checked)}
                                    className="mt-0.5"
                                />
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <Lock className="h-3 w-3 text-amber-600" />
                                        Cerrar Período Saliente ({sourcePeriod.name})
                                    </span>
                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                        Archiva los cursos anteriores protegiendo sus calificaciones, asistencias e historial en modo solo lectura.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* SECTION 2: Cursos a Replicar */}
                    <div className="bg-card border rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                    2
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">
                                        Cursos y Planes de Estudio a Replicar
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Se duplicará la estructura completa de asignaturas, unidades temáticas y competencias, iniciando con asistencias y calificaciones limpias para el nuevo año.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={toggleAllCourses}
                                >
                                    {data.clone_course_ids.length === courses.length
                                        ? 'Deseleccionar Todos'
                                        : 'Seleccionar Todos'}
                                </Button>
                            </div>
                        </div>

                        {courses.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                No se encontraron cursos registrados en el período {sourcePeriod.name}.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {courses.map((course) => {
                                    const isSelected = data.clone_course_ids.includes(course.id);
                                    return (
                                        <div
                                            key={course.id}
                                            onClick={() => toggleCourse(course.id)}
                                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 select-none ${
                                                isSelected
                                                    ? 'bg-primary/5 border-primary shadow-xs'
                                                    : 'bg-muted/20 border-border/70 hover:bg-muted/40 opacity-75'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleCourse(course.id)}
                                                className="mt-0.5"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <h3 className="font-semibold text-xs text-foreground truncate">
                                                        {course.name}
                                                    </h3>
                                                    {course.section && (
                                                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                                            {course.section}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <BookOpen className="h-3 w-3" />
                                                        {course.course_topics_count ?? 0} temas
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {course.students_count ?? 0} alumnos
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: Promoción y Continuidad de Estudiantes */}
                    <div className="bg-card border rounded-2xl p-6 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                    3
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                                        <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        Promoción y Continuidad de Estudiantes
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Define el destino académico de los alumnos hacia el nuevo ciclo escolar.
                                    </p>
                                </div>
                            </div>

                            {promotionMode === 'configure' && (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold px-2.5 py-1">
                                        {promotionCounts.promoted} Promovidos
                                    </Badge>
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold px-2.5 py-1">
                                        {promotionCounts.repeated} Repitentes
                                    </Badge>
                                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold px-2.5 py-1">
                                        {promotionCounts.withdrawn} Retirados
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {/* Mode Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onClick={() => setPromotionMode('configure')}
                                className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                                    promotionMode === 'configure'
                                        ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                                        : 'bg-muted/15 border-border/70 hover:bg-muted/30 opacity-80'
                                }`}
                            >
                                <div
                                    className={`h-5 w-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                        promotionMode === 'configure'
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-muted-foreground/40'
                                    }`}
                                >
                                    {promotionMode === 'configure' && <div className="h-2 w-2 rounded-full bg-white" />}
                                </div>
                                <div className="space-y-1">
                                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        Configurar Promoción ahora
                                        <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                                            Recomendado
                                        </Badge>
                                    </span>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Asigna de forma transparente quiénes aprobaron para matricularse en el grado siguiente, quiénes repiten el curso o quiénes se retiran de la institución.
                                    </p>
                                </div>
                            </div>

                            <div
                                onClick={() => setPromotionMode('none')}
                                className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                                    promotionMode === 'none'
                                        ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                                        : 'bg-muted/15 border-border/70 hover:bg-muted/30 opacity-80'
                                }`}
                            >
                                <div
                                    className={`h-5 w-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                        promotionMode === 'none'
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-muted-foreground/40'
                                    }`}
                                >
                                    {promotionMode === 'none' && <div className="h-2 w-2 rounded-full bg-white" />}
                                </div>
                                <div className="space-y-1">
                                    <span className="text-sm font-semibold text-foreground">
                                        No transferir alumnos ahora
                                    </span>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Los nuevos cursos se crearán con sus programas de asignaturas intactos pero sin estudiantes. Podrás matricular a los estudiantes manualmente más adelante.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Course by Course Promotion Table */}
                        {promotionMode === 'configure' && (
                            <div className="space-y-6 pt-2">
                                {data.clone_course_ids.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl bg-muted/10">
                                        Selecciona al menos un curso en el Paso 2 para configurar la promoción de sus alumnos.
                                    </div>
                                ) : (
                                    data.clone_course_ids.map((courseId) => {
                                        const course = courses.find((c) => c.id === courseId);
                                        if (!course) return null;

                                        const enrolledStudents = course.students || [];
                                        const cPromotions = courseStudentPromotions[courseId] || {};
                                        const selectedTargetCourseId = coursePromoteTargets[courseId];
                                        const targetCourse = courses.find(
                                            (c) => c.id === Number(selectedTargetCourseId)
                                        );

                                        // Count for this course
                                        let cPromoted = 0;
                                        let cRepeated = 0;
                                        let cWithdrawn = 0;
                                        enrolledStudents.forEach((st) => {
                                            const p = cPromotions[st.id]?.action || 'promote';
                                            if (p === 'promote') cPromoted++;
                                            else if (p === 'repeat') cRepeated++;
                                            else if (p === 'withdraw') cWithdrawn++;
                                        });

                                        const query = (studentSearch[courseId] || '').toLowerCase().trim();
                                        const filteredStudents = enrolledStudents.filter((st) => {
                                            if (!query) return true;
                                            const fullName = `${st.first_name} ${st.last_name}`.toLowerCase();
                                            const matricula = (st.student_id_number || '').toLowerCase();
                                            return fullName.includes(query) || matricula.includes(query);
                                        });

                                        return (
                                            <div
                                                key={course.id}
                                                className="border rounded-2xl overflow-hidden bg-card shadow-xs"
                                            >
                                                {/* Course Banner Header */}
                                                <div className="p-4 sm:p-5 bg-muted/30 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-sm sm:text-base text-foreground">
                                                                {course.name}
                                                            </h3>
                                                            {course.section && (
                                                                <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono font-medium">
                                                                    {course.section}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                ({enrolledStudents.length} matriculado{enrolledStudents.length === 1 ? '' : 's'})
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                                                {cPromoted} promovidos
                                                            </span>
                                                            <span>•</span>
                                                            <span className="text-amber-700 dark:text-amber-400 font-medium">
                                                                {cRepeated} repitentes
                                                            </span>
                                                            <span>•</span>
                                                            <span className="text-rose-700 dark:text-rose-400 font-medium">
                                                                {cWithdrawn} retirados
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Controls & Destination Selector */}
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-2 bg-background border px-3 py-1.5 rounded-xl text-xs">
                                                            <span className="text-muted-foreground whitespace-nowrap font-medium">
                                                                Aprobados van a:
                                                            </span>
                                                            <select
                                                                value={selectedTargetCourseId}
                                                                onChange={(e) => {
                                                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                                                    setCoursePromoteTargets((prev) => ({
                                                                        ...prev,
                                                                        [course.id]: val,
                                                                    }));
                                                                }}
                                                                className="bg-transparent font-semibold text-foreground focus:outline-hidden cursor-pointer"
                                                            >
                                                                <option value="">(Egresados / Fin de ciclo)</option>
                                                                {courses
                                                                    .filter((c) => data.clone_course_ids.includes(c.id))
                                                                    .map((c) => (
                                                                        <option key={c.id} value={c.id}>
                                                                            {c.name} {c.section ? `(${c.section})` : ''}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </div>

                                                        {/* Batch Actions */}
                                                        <div className="flex items-center gap-1.5">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                                onClick={() =>
                                                                    handleSetAllCourseStudentsAction(course.id, 'promote')
                                                                }
                                                                title="Marcar a todos como promovidos"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                                                Pasaron Todos
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-xs text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                                onClick={() =>
                                                                    handleSetAllCourseStudentsAction(course.id, 'repeat')
                                                                }
                                                                title="Marcar a todos como repitentes"
                                                            >
                                                                <RotateCcw className="h-3.5 w-3.5 mr-1 text-amber-600" />
                                                                Repiten Todos
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Search bar inside course card */}
                                                {enrolledStudents.length > 5 && (
                                                    <div className="px-4 py-2 bg-muted/10 border-b flex items-center justify-between gap-3">
                                                        <div className="relative flex-1 max-w-sm">
                                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                            <Input
                                                                placeholder="Buscar estudiante en este curso..."
                                                                value={studentSearch[course.id] || ''}
                                                                onChange={(e) =>
                                                                    setStudentSearch((prev) => ({
                                                                        ...prev,
                                                                        [course.id]: e.target.value,
                                                                    }))
                                                                }
                                                                className="h-7 pl-8 text-xs bg-background"
                                                            />
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            Mostrando {filteredStudents.length} de {enrolledStudents.length}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Students Table */}
                                                {enrolledStudents.length === 0 ? (
                                                    <div className="p-6 text-center text-xs text-muted-foreground">
                                                        No hay estudiantes matriculados en este curso.
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b bg-muted/20 text-muted-foreground font-semibold">
                                                                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                                                                    <th className="py-2.5 px-4">Estudiante</th>
                                                                    <th className="py-2.5 px-4 w-36">Estado Actual</th>
                                                                    <th className="py-2.5 px-4 min-w-[340px]">
                                                                        Resolución para el Nuevo Ciclo
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {filteredStudents.map((student, idx) => {
                                                                    const pRecord = cPromotions[student.id] || {
                                                                        action: 'promote',
                                                                        mark_institution_inactive: false,
                                                                    };
                                                                    const currentAction = pRecord.action;

                                                                    return (
                                                                        <tr
                                                                            key={student.id}
                                                                            className="hover:bg-muted/15 transition-colors"
                                                                        >
                                                                            <td className="py-3 px-4 text-center font-mono text-[11px] text-muted-foreground">
                                                                                {idx + 1}
                                                                            </td>
                                                                            <td className="py-3 px-4">
                                                                                <div className="font-semibold text-foreground">
                                                                                    {student.last_name}, {student.first_name}
                                                                                </div>
                                                                                {student.student_id_number && (
                                                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                                                        Matrícula: {student.student_id_number}
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 px-4">
                                                                                {student.pivot?.status === 'repeated' ? (
                                                                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                                                                        Repitente
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                                                                        Activo
                                                                                    </Badge>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 px-4">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    {/* Promote Chip */}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handleStudentActionChange(
                                                                                                course.id,
                                                                                                student.id,
                                                                                                'promote'
                                                                                            )
                                                                                        }
                                                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                                                                            currentAction === 'promote'
                                                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                                                                : 'bg-background hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                                                                                        }`}
                                                                                    >
                                                                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                                                        <span>
                                                                                            Promovido{' '}
                                                                                            {targetCourse
                                                                                                ? `→ ${targetCourse.name}`
                                                                                                : '→ Egresado'}
                                                                                        </span>
                                                                                    </button>

                                                                                    {/* Repeat Chip */}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handleStudentActionChange(
                                                                                                course.id,
                                                                                                student.id,
                                                                                                'repeat'
                                                                                            )
                                                                                        }
                                                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                                                                            currentAction === 'repeat'
                                                                                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                                                                                : 'bg-background hover:bg-amber-50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                                                                                        }`}
                                                                                    >
                                                                                        <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                                                                                        <span>Repite en {course.name}</span>
                                                                                    </button>

                                                                                    {/* Withdraw Chip */}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handleStudentActionChange(
                                                                                                course.id,
                                                                                                student.id,
                                                                                                'withdraw'
                                                                                            )
                                                                                        }
                                                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                                                                            currentAction === 'withdraw'
                                                                                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                                                                                : 'bg-background hover:bg-rose-50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800/60'
                                                                                        }`}
                                                                                    >
                                                                                        <UserMinus className="h-3.5 w-3.5 shrink-0" />
                                                                                        <span>Retirado / Baja</span>
                                                                                    </button>

                                                                                    {/* Inactive in institution checkbox for withdrawals */}
                                                                                    {currentAction === 'withdraw' && (
                                                                                        <label className="inline-flex items-center gap-1.5 ml-2 text-[11px] text-muted-foreground cursor-pointer">
                                                                                            <Checkbox
                                                                                                checked={
                                                                                                    pRecord.mark_institution_inactive
                                                                                                }
                                                                                                onCheckedChange={() =>
                                                                                                    handleToggleStudentInactive(
                                                                                                        course.id,
                                                                                                        student.id
                                                                                                    )
                                                                                                }
                                                                                                className="h-3.5 w-3.5"
                                                                                            />
                                                                                            <span>Desactivar en la institución</span>
                                                                                        </label>
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
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sticky Bottom Action Bar */}
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t px-6 py-4 shadow-xl">
                        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                <span className="font-semibold text-foreground">
                                    Resumen de Transición:
                                </span>
                                <span className="bg-muted px-2.5 py-1 rounded-md text-foreground font-medium">
                                    {data.clone_course_ids.length} curso{data.clone_course_ids.length === 1 ? '' : 's'} a crear
                                </span>
                                {promotionMode === 'configure' && (
                                    <>
                                        <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md font-semibold">
                                            {promotionCounts.promoted} promovidos
                                        </span>
                                        <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-md font-semibold">
                                            {promotionCounts.repeated} repitentes
                                        </span>
                                        <span className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-md font-semibold">
                                            {promotionCounts.withdrawn} retirados
                                        </span>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <Link href="/courses">
                                    <Button type="button" variant="outline" className="h-9">
                                        Cancelar y Volver
                                    </Button>
                                </Link>

                                <Button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        !data.new_period_name.trim() ||
                                        data.clone_course_ids.length === 0
                                    }
                                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5 h-9"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    {processing ? 'Ejecutando Transición...' : 'Ejecutar Transición de Período'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Custom Confirmation Dialog */}
                <ConfirmDialogComponent />
            </div>
        </>
    );
}

AcademicPeriodTransition.layout = {
    breadcrumbs: [
        {
            title: 'Cursos',
            href: '/courses',
        },
        {
            title: 'Transición de Período',
            href: '/academic-periods/transition',
        },
    ],
};
