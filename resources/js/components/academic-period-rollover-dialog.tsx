import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Calendar,
    ArrowRight,
    Lock,
    Copy,
    Users,
    CheckCircle2,
    BookOpen,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface AcademicPeriod {
    id: number;
    name: string;
    is_current?: boolean;
    is_closed?: boolean;
    start_date?: string;
    end_date?: string;
}

interface CourseItem {
    id: number;
    name: string;
    section?: string;
    academic_period_id?: number;
    students_count?: number;
    course_topics_count?: number;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPeriod: AcademicPeriod | null;
    courses: CourseItem[];
    academicPeriods?: AcademicPeriod[];
}

export function AcademicPeriodRolloverDialog({
    open,
    onOpenChange,
    currentPeriod,
    courses,
    academicPeriods = [],
}: Props) {
    const periodCourses = currentPeriod
        ? courses.filter((c) => c.academic_period_id === currentPeriod.id)
        : courses;

    const plannedPeriods = academicPeriods.filter(
        (p) => !p.is_closed && !p.is_current && p.id !== currentPeriod?.id
    );

    const { data, setData, post, processing, errors, reset } = useForm({
        new_period_name: '',
        start_date: '',
        end_date: '',
        is_current: true,
        close_source_period: true,
        clone_course_ids: [] as number[],
        promote_students: false,
    });

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

    // Initialize all courses selected by default when opened
    useEffect(() => {
        if (open && periodCourses.length > 0) {
            setData((prev) => ({
                ...prev,
                clone_course_ids: periodCourses.map((c) => c.id),
            }));
        }
    }, [open, periodCourses.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPeriod) return;

        post(`/academic-periods/${currentPeriod.id}/rollover`, {
            onSuccess: () => {
                onOpenChange(false);
                reset();
            },
        });
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
                prev.clone_course_ids.length === periodCourses.length
                    ? []
                    : periodCourses.map((c) => c.id),
        }));
    };

    if (!currentPeriod) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Transición y Cierre de Período Escolar
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Inicia el nuevo ciclo académico. Este asistente cerrará el período saliente (<strong>{currentPeriod.name}</strong>) y clonará los cursos seleccionados con sus pensums completos para el nuevo año.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4 text-xs max-h-[480px] overflow-y-auto pr-1">
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
                                        Sus cursos pasarán a modo histórico de consulta; sus notas y sesiones no podrán ser alteradas accidentalmente.
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
                                        Se duplicará la estructura de cada curso con su pensum completo de temas y subtemas.
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
                                                            <span>{course.students_count || 0} alumnos matriculados</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Promote Students Option */}
                            <label className="flex items-start gap-2.5 p-2 rounded-lg border bg-muted/20 cursor-pointer pt-2.5">
                                <input
                                    type="checkbox"
                                    checked={data.promote_students}
                                    onChange={(e) => setData('promote_students', e.target.checked)}
                                    className="mt-0.5 rounded text-primary"
                                />
                                <div>
                                    <span className="font-semibold text-foreground flex items-center gap-1">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        Transferir automáticamente los estudiantes matriculados
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block">
                                        Si está marcado, los alumnos inscritos en cada curso se registrarán de inmediato en su réplica del nuevo período escolar.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
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
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
