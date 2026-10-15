import React, { useState, useEffect, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    Calendar,
    ArrowRight,
    Lock,
    Copy,
    Users,
    CheckCircle2,
    BookOpen,
    Sparkles,
    GraduationCap,
    ChevronDown,
    ChevronUp,
    Search,
    AlertCircle,
    RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    academic_period_id?: number;
    students_count?: number;
    course_topics_count?: number;
    students?: StudentItem[];
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPeriod: AcademicPeriod | null;
    courses: CourseItem[];
    academicPeriods?: AcademicPeriod[];
}

type PromotionAction = 'promote' | 'repeat' | 'withdraw' | 'none';

interface StudentPromotionRecord {
    action: PromotionAction;
    mark_institution_inactive?: boolean;
}

export function AcademicPeriodRolloverDialog({
    open,
    onOpenChange,
    currentPeriod,
    courses,
    academicPeriods = [],
}: Props) {
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    const periodCourses = useMemo(() => {
        return currentPeriod
            ? courses.filter((c) => c.academic_period_id === currentPeriod.id)
            : courses;
    }, [currentPeriod, courses]);

    const plannedPeriods = useMemo(() => {
        return academicPeriods.filter(
            (p) => !p.is_closed && !p.is_current && p.id !== currentPeriod?.id
        );
    }, [academicPeriods, currentPeriod]);

    const { data, setData, post, processing, errors, reset } = useForm({
        new_period_name: '',
        start_date: '',
        end_date: '',
        is_current: true,
        close_source_period: true,
        clone_course_ids: [] as number[],
        promote_students: false,
    });

    // Promotion mode: 'none' (empty new courses) or 'configure' (customize who passed / repeated / withdrew)
    const [promotionMode, setPromotionMode] = useState<'none' | 'configure'>('none');

    // Map: sourceCourseId -> targetSourceCourseId for promoted students (e.g. 3er Curso -> 4to Curso)
    const [coursePromoteTargets, setCoursePromoteTargets] = useState<Record<number, number | ''>>({});

    // Map: sourceCourseId -> studentId -> StudentPromotionRecord
    const [courseStudentPromotions, setCourseStudentPromotions] = useState<
        Record<number, Record<number, StudentPromotionRecord>>
    >({});

    // Expanded states for course cards in the promotion section
    const [expandedCourses, setExpandedCourses] = useState<Record<number, boolean>>({});

    // Course search filter for student promotion tables
    const [studentSearch, setStudentSearch] = useState<Record<number, string>>({});

    // Helper: auto-suggest target course for next level
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

    // Initialize course selections, defaults, and students when opening
    useEffect(() => {
        if (open && periodCourses.length > 0) {
            const allCourseIds = periodCourses.map((c) => c.id);
            setData((prev) => ({
                ...prev,
                clone_course_ids: allCourseIds,
            }));

            // Initialize promotion targets and student promotion records
            const initialTargets: Record<number, number | ''> = {};
            const initialPromotions: Record<number, Record<number, StudentPromotionRecord>> = {};
            const initialExpanded: Record<number, boolean> = {};

            periodCourses.forEach((c) => {
                initialTargets[c.id] = findNextCourseSuggestion(c, periodCourses);
                initialPromotions[c.id] = {};
                initialExpanded[c.id] = false;

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
            setCoursePromoteTargets(initialTargets);
            setExpandedCourses(initialExpanded);
        }
    }, [open, periodCourses]);

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

    const matchedPeriod = plannedPeriods.find(
        (p) => p.name.trim().toLowerCase() === data.new_period_name.trim().toLowerCase()
    );

    const matchingSuggestions = plannedPeriods.filter(
        (p) =>
            data.new_period_name.trim() !== '' &&
            p.name.toLowerCase().includes(data.new_period_name.trim().toLowerCase()) &&
            p.name.toLowerCase() !== data.new_period_name.trim().toLowerCase()
    );

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
                prev.clone_course_ids.length === periodCourses.length
                    ? []
                    : periodCourses.map((c) => c.id),
        }));
    };

    // Promotion actions helpers for a course
    const handleSetAllCourseStudentsAction = (courseId: number, action: PromotionAction) => {
        setCourseStudentPromotions((prev) => {
            const courseMap = { ...(prev[courseId] || {}) };
            const course = periodCourses.find((c) => c.id === courseId);
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
        if (!currentPeriod || !data.new_period_name) return;

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
            description: `Se cerrará el período ${currentPeriod.name}, se creará el nuevo período lectivo "${data.new_period_name}", se replicarán ${data.clone_course_ids.length} cursos con sus pensums, y ${
                promotionMode === 'configure'
                    ? `se procesará la resolución académica de ${promotionCounts.total} estudiantes (${promotionCounts.promoted} promovidos, ${promotionCounts.repeated} repitentes y ${promotionCounts.withdrawn} retirados).`
                    : 'los nuevos cursos se crearán sin estudiantes para matriculación manual.'
            }`,
            confirmText: 'Ejecutar Transición',
            variant: 'primary',
            onConfirm: () => {
                router.post(
                    `/academic-periods/${currentPeriod.id}/rollover`,
                    {
                        ...data,
                        promote_students: false,
                        promotions: promotionsPayload,
                    },
                    {
                        onSuccess: () => {
                            onOpenChange(false);
                            reset();
                        },
                    }
                );
            },
        });
    };

    if (!currentPeriod) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-6">
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Transición y Cierre de Período Escolar
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Inicia el nuevo ciclo académico. Este asistente cerrará el período saliente (
                            <strong>{currentPeriod.name}</strong>), creará el nuevo año lectivo, duplicará los cursos con sus pensums completos y organizará la promoción de los estudiantes.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
                        {/* Section 1: New Period Definition */}
                        <div className="p-3.5 rounded-xl border bg-card space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-primary" /> Datos del Nuevo Período
                                </span>
                                <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded">
                                    Período Saliente: {currentPeriod.name}
                                </span>
                            </div>

                            {/* Planned Periods Quick Selector */}
                            {plannedPeriods.length > 0 && (
                                <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-2.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                                            Períodos planificados detectados:
                                        </span>
                                        <span className="text-[10px] text-sky-700 dark:text-sky-300">
                                            Haz clic para autocompletar
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {plannedPeriods.map((period) => {
                                            const isSelected =
                                                data.new_period_name.trim().toLowerCase() ===
                                                period.name.trim().toLowerCase();
                                            return (
                                                <button
                                                    key={period.id}
                                                    type="button"
                                                    onClick={() => handleSelectExistingPeriod(period)}
                                                    className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                                            : 'bg-background hover:bg-sky-100 dark:hover:bg-sky-950/60 text-foreground border-sky-300 dark:border-sky-800'
                                                    }`}
                                                >
                                                    <span>{period.name}</span>
                                                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="new_period_name">Nombre del Nuevo Período Escolar *</Label>
                                <Input
                                    id="new_period_name"
                                    list="planned_periods_datalist"
                                    placeholder="Ej: 2027-2028 o Año Escolar 2027-2028"
                                    value={data.new_period_name}
                                    onChange={(e) => setData('new_period_name', e.target.value)}
                                    required
                                    autoFocus
                                />
                                <datalist id="planned_periods_datalist">
                                    {plannedPeriods.map((period) => (
                                        <option key={period.id} value={period.name} />
                                    ))}
                                </datalist>

                                {matchedPeriod && (
                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                                        Se adoptará el período existente "{matchedPeriod.name}" y se activará como el nuevo año lectivo.
                                    </p>
                                )}

                                {!matchedPeriod && matchingSuggestions.length > 0 && (
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap pt-0.5">
                                        <span>¿Quisiste decir?</span>
                                        {matchingSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion.id}
                                                type="button"
                                                onClick={() => handleSelectExistingPeriod(suggestion)}
                                                className="font-medium text-sky-600 hover:text-sky-800 underline inline-flex items-center gap-0.5"
                                            >
                                                {suggestion.name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {errors.new_period_name && (
                                    <p className="text-destructive text-[11px]">{errors.new_period_name}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="rollover_start_date">Fecha de Inicio</Label>
                                    <Input
                                        id="rollover_start_date"
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="rollover_end_date">Fecha de Fin</Label>
                                    <Input
                                        id="rollover_end_date"
                                        type="date"
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Close source period checkbox */}
                            <label className="flex items-start gap-2.5 p-2 rounded-lg border bg-muted/40 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.close_source_period}
                                    onChange={(e) => setData('close_source_period', e.target.checked)}
                                    className="mt-0.5 rounded text-primary"
                                />
                                <div>
                                    <span className="font-semibold text-foreground flex items-center gap-1">
                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                        Cerrar y congelar el período actual ({currentPeriod.name})
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block">
                                        Sus cursos pasarán a modo solo lectura histórico; sus notas, sesiones y pensum no podrán ser alterados accidentalmente.
                                    </span>
                                </div>
                            </label>
                        </div>

                        {/* Section 2: Course Rollover & Syllabus Duplication */}
                        <div className="p-3.5 rounded-xl border bg-card space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <div>
                                    <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                        <Copy className="h-4 w-4 text-primary" /> Cursos a Replicar ({data.clone_course_ids.length}/{periodCourses.length})
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                        Se duplicará la estructura de cada curso con su pensum completo de temas y subtemas en el nuevo ciclo.
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleAllCourses}
                                    className="text-[11px] h-7"
                                >
                                    {data.clone_course_ids.length === periodCourses.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                </Button>
                            </div>

                            {periodCourses.length === 0 ? (
                                <p className="text-muted-foreground text-[11px] py-2 text-center">
                                    No hay cursos registrados en el período actual para transferir.
                                </p>
                            ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto divide-y divide-border/40">
                                    {periodCourses.map((course) => {
                                        const isChecked = data.clone_course_ids.includes(course.id);
                                        return (
                                            <label
                                                key={course.id}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                                    isChecked ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/40'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleCourse(course.id)}
                                                        className="rounded text-primary"
                                                    />
                                                    <div>
                                                        <span className="font-semibold text-foreground block">
                                                            {course.name}
                                                            {course.section && (
                                                                <span className="text-muted-foreground font-normal ml-1">
                                                                    ({course.section})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                                                            <span>{course.course_topics_count || 0} temas en pensum</span>
                                                            <span>•</span>
                                                            <span>{course.students?.length ?? course.students_count ?? 0} alumnos matriculados</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Section 3: Student Promotion & Academic Continuity */}
                        <div className="p-3.5 rounded-xl border bg-card space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <div>
                                    <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                        <GraduationCap className="h-4 w-4 text-primary" /> Promoción y Continuidad de Estudiantes
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                        Define el destino académico de los alumnos hacia el nuevo ciclo escolar.
                                    </span>
                                </div>

                                {promotionMode === 'configure' && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                            {promotionCounts.promoted} Promovidos
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                            {promotionCounts.repeated} Repitentes
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
                                            {promotionCounts.withdrawn} Retirados
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Mode Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <label
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        promotionMode === 'none'
                                            ? 'bg-primary/5 border-primary/40 shadow-xs'
                                            : 'bg-muted/20 hover:bg-muted/40 border-border/60'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <input
                                            type="radio"
                                            name="promotion_mode"
                                            checked={promotionMode === 'none'}
                                            onChange={() => setPromotionMode('none')}
                                            className="mt-0.5 text-primary"
                                        />
                                        <div>
                                            <span className="font-semibold text-foreground block">No transferir alumnos ahora</span>
                                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                                                Los cursos nuevos se crearán vacíos y los estudiantes serán matriculados manualmente después.
                                            </span>
                                        </div>
                                    </div>
                                </label>

                                <label
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        promotionMode === 'configure'
                                            ? 'bg-primary/5 border-primary/40 shadow-xs'
                                            : 'bg-muted/20 hover:bg-muted/40 border-border/60'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <input
                                            type="radio"
                                            name="promotion_mode"
                                            checked={promotionMode === 'configure'}
                                            onChange={() => setPromotionMode('configure')}
                                            className="mt-0.5 text-primary"
                                        />
                                        <div>
                                            <span className="font-semibold text-foreground block">Configurar Promoción ahora</span>
                                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                                                Asignar quiénes pasaron al siguiente grado, quiénes repiten el curso o quiénes se retiran.
                                            </span>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Detailed Promotion List per Course */}
                            {promotionMode === 'configure' && (
                                <div className="space-y-3 pt-2">
                                    {periodCourses
                                        .filter((c) => data.clone_course_ids.includes(c.id))
                                        .map((course) => {
                                            const enrolledStudents = course.students || [];
                                            const isExpanded = expandedCourses[course.id] || false;
                                            const coursePromotions = courseStudentPromotions[course.id] || {};

                                            let cPromoted = 0;
                                            let cRepeated = 0;
                                            let cWithdrawn = 0;
                                            Object.values(coursePromotions).forEach((p) => {
                                                if (p.action === 'promote') cPromoted++;
                                                else if (p.action === 'repeat') cRepeated++;
                                                else if (p.action === 'withdraw') cWithdrawn++;
                                            });

                                            const q = (studentSearch[course.id] || '').toLowerCase().trim();
                                            const filteredStudents = enrolledStudents.filter(
                                                (st) =>
                                                    !q ||
                                                    st.first_name.toLowerCase().includes(q) ||
                                                    st.last_name.toLowerCase().includes(q) ||
                                                    (st.student_id_number && st.student_id_number.toLowerCase().includes(q))
                                            );

                                            return (
                                                <div
                                                    key={course.id}
                                                    className="rounded-xl border bg-muted/20 overflow-hidden transition-all"
                                                >
                                                    {/* Course Promotion Header */}
                                                    <div className="p-3 bg-muted/40 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setExpandedCourses((prev) => ({
                                                                        ...prev,
                                                                        [course.id]: !prev[course.id],
                                                                    }))
                                                                }
                                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronUp className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                            <div>
                                                                <span className="font-bold text-foreground block">
                                                                    {course.name} {course.section ? `(${course.section})` : ''}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {enrolledStudents.length} alumno(s) matriculado(s) en este ciclo
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Target for Promoted Students & Quick Actions */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <div className="flex items-center gap-1.5 text-[11px]">
                                                                <span className="text-muted-foreground text-[10px]">Aprobados van a:</span>
                                                                <select
                                                                    value={coursePromoteTargets[course.id] || ''}
                                                                    onChange={(e) =>
                                                                        setCoursePromoteTargets((prev) => ({
                                                                            ...prev,
                                                                            [course.id]: e.target.value ? Number(e.target.value) : '',
                                                                        }))
                                                                    }
                                                                    className="h-7 text-xs rounded border bg-background px-2 text-foreground focus:ring-1 focus:ring-primary"
                                                                >
                                                                    <option value="">-- Graduados / Sin réplica --</option>
                                                                    {periodCourses
                                                                        .filter((other) => other.id !== course.id)
                                                                        .map((other) => (
                                                                            <option key={other.id} value={other.id}>
                                                                                {other.name} {other.section ? `(${other.section})` : ''}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-6 text-[10px] px-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                                                    onClick={() => handleSetAllCourseStudentsAction(course.id, 'promote')}
                                                                >
                                                                    Pasaron Todos
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-6 text-[10px] px-2 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                                                                    onClick={() => handleSetAllCourseStudentsAction(course.id, 'repeat')}
                                                                >
                                                                    Repiten Todos
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Course Student Rows (Expanded) */}
                                                    {isExpanded && (
                                                        <div className="p-3 space-y-2 bg-background">
                                                            {enrolledStudents.length > 5 && (
                                                                <div className="relative max-w-xs">
                                                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                                                    <Input
                                                                        placeholder="Filtrar estudiantes..."
                                                                        value={studentSearch[course.id] || ''}
                                                                        onChange={(e) =>
                                                                            setStudentSearch((prev) => ({
                                                                                ...prev,
                                                                                [course.id]: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="h-7 text-[11px] pl-8"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="rounded-lg border overflow-hidden max-h-52 overflow-y-auto">
                                                                <table className="w-full text-left text-xs border-collapse">
                                                                    <thead className="bg-muted/60 border-b text-[10px] text-muted-foreground sticky top-0">
                                                                        <tr>
                                                                            <th className="px-3 py-2 font-semibold">Estudiante</th>
                                                                            <th className="px-3 py-2 font-semibold text-center w-56">Resolución</th>
                                                                            <th className="px-3 py-2 font-semibold">Destino en Nuevo Ciclo</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border/40 text-[11px]">
                                                                        {filteredStudents.map((st) => {
                                                                            const pRecord = coursePromotions[st.id] || { action: 'promote' };
                                                                            const targetCourseId = coursePromoteTargets[course.id];
                                                                            const targetCourse = periodCourses.find((c) => c.id === targetCourseId);

                                                                            return (
                                                                                <tr key={st.id} className="hover:bg-muted/20">
                                                                                    <td className="px-3 py-1.5 font-medium">
                                                                                        <div>
                                                                                            <span>{st.last_name}, {st.first_name}</span>
                                                                                            {st.student_id_number && (
                                                                                                <span className="text-[10px] text-muted-foreground font-mono block">
                                                                                                    {st.student_id_number}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5 text-center">
                                                                                        <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5 text-[10px]">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleStudentActionChange(course.id, st.id, 'promote')}
                                                                                                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                                                                                    pRecord.action === 'promote'
                                                                                                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                                                }`}
                                                                                            >
                                                                                                Promovido
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleStudentActionChange(course.id, st.id, 'repeat')}
                                                                                                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                                                                                    pRecord.action === 'repeat'
                                                                                                        ? 'bg-amber-600 text-white shadow-xs font-semibold'
                                                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                                                }`}
                                                                                            >
                                                                                                Repitente
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleStudentActionChange(course.id, st.id, 'withdraw')}
                                                                                                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                                                                                    pRecord.action === 'withdraw'
                                                                                                        ? 'bg-rose-600 text-white shadow-xs font-semibold'
                                                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                                                }`}
                                                                                            >
                                                                                                Retirado
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5 text-[11px]">
                                                                                        {pRecord.action === 'promote' ? (
                                                                                            <span className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                                                                                                <ArrowRight className="h-3 w-3" />
                                                                                                {targetCourse
                                                                                                    ? `${targetCourse.name} (${targetCourse.section || 'A'})`
                                                                                                    : 'Egresado / Sin nuevo curso'}
                                                                                            </span>
                                                                                        ) : pRecord.action === 'repeat' ? (
                                                                                            <span className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                                                                                                <RotateCcw className="h-3 w-3" />
                                                                                                {course.name} ({course.section || 'A'}) en nuevo ciclo
                                                                                            </span>
                                                                                        ) : (
                                                                                            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                                                                                                <Checkbox
                                                                                                    checked={pRecord.mark_institution_inactive || false}
                                                                                                    onCheckedChange={() => handleToggleStudentInactive(course.id, st.id)}
                                                                                                />
                                                                                                <span className="text-[10px]">Inactivar en padrón institucional</span>
                                                                                            </label>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-3 flex items-center justify-between">
                        <div className="text-[11px] text-muted-foreground">
                            {promotionMode === 'configure' ? (
                                <span>
                                    Resolución: <strong>{promotionCounts.promoted}</strong> promovidos,{' '}
                                    <strong>{promotionCounts.repeated}</strong> repitentes,{' '}
                                    <strong>{promotionCounts.withdrawn}</strong> retirados.
                                </span>
                            ) : (
                                <span>Los cursos se crearán sin matrículas iniciales.</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing || !data.new_period_name}
                                className="gap-2 bg-primary"
                            >
                                <ArrowRight className="h-4 w-4" />
                                {processing ? 'Procesando transición...' : 'Ejecutar Transición de Período'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>

            {/* Custom Confirmation Dialog */}
            <ConfirmDialogComponent />
        </Dialog>
    );
}
