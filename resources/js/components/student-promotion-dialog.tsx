import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    GraduationCap,
    CheckCircle2,
    RotateCcw,
    UserMinus,
    AlertCircle,
    ArrowRight,
    Search,
    Sparkles,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

export interface TargetCourseOption {
    id: number;
    name: string;
    section?: string;
    code?: string;
    academic_period?: {
        id: number;
        name: string;
        is_current?: boolean;
    };
}

export interface EnrolledStudent {
    id: number;
    first_name: string;
    last_name: string;
    student_id_number?: string;
    preferred_workstation?: string;
    pivot?: {
        status?: string;
        preferred_workstation?: string;
        enrolled_at?: string;
    };
}

interface StudentPromotionItem {
    student_id: number;
    action: 'promote' | 'repeat' | 'withdraw' | 'none';
    target_course_id?: number | null;
    mark_institution_inactive?: boolean;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    course: {
        id: number;
        name: string;
        section?: string;
        is_read_only?: boolean;
        academic_period?: { id: number; name: string; is_closed?: boolean };
        institution: { id: number; name: string };
    };
    students: EnrolledStudent[];
    availableTargetCourses: TargetCourseOption[];
}

export function StudentPromotionDialog({
    open,
    onOpenChange,
    course,
    students,
    availableTargetCourses,
}: Props) {
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const [searchQuery, setSearchQuery] = useState('');
    const [defaultPromoteCourseId, setDefaultPromoteCourseId] = useState<number | ''>('');
    const [defaultRepeatCourseId, setDefaultRepeatCourseId] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSourceReadOnly = Boolean(course.is_read_only || course.academic_period?.is_closed);

    // Available target courses including "Permanecer en este curso" if active
    const targetCourseOptions = useMemo<TargetCourseOption[]>(() => {
        const list: TargetCourseOption[] = [];

        // If source course is active and open, offer "Permanecer en este curso"
        if (!isSourceReadOnly) {
            list.push({
                id: course.id,
                name: `📌 Permanecer en este curso (${course.name}${course.section ? ` ${course.section}` : ''})`,
                section: course.section,
                academic_period: course.academic_period,
            });
        }

        availableTargetCourses.forEach((tc) => {
            if (tc.id !== course.id) {
                list.push(tc);
            }
        });

        return list;
    }, [isSourceReadOnly, course, availableTargetCourses]);

    // Initial promotions state map: student_id -> promotion config
    const [promotions, setPromotions] = useState<Record<number, StudentPromotionItem>>({});

    // Reset or initialize when opened
    React.useEffect(() => {
        if (open) {
            const initial: Record<number, StudentPromotionItem> = {};
            students.forEach((s) => {
                initial[s.id] = {
                    student_id: s.id,
                    action: 'none',
                    target_course_id: null,
                    mark_institution_inactive: false,
                };
            });
            setPromotions(initial);

            // Auto-detect sensible defaults for promote and repeat:
            if (!isSourceReadOnly) {
                // If active course, repeating students naturally stay in this course!
                setDefaultRepeatCourseId(course.id);
            } else {
                // If closed course, look for a course in targetCourseOptions with matching name/grade
                const matchingLevelCourse = availableTargetCourses.find(
                    (tc) => tc.name.trim().toLowerCase() === course.name.trim().toLowerCase()
                );
                if (matchingLevelCourse) {
                    setDefaultRepeatCourseId(matchingLevelCourse.id);
                } else {
                    setDefaultRepeatCourseId('');
                }
            }

            // For promoted students, look for a course with a different/higher level
            const nextLevelCourse = availableTargetCourses.find(
                (tc) => tc.id !== course.id && tc.name.trim().toLowerCase() !== course.name.trim().toLowerCase()
            );
            if (nextLevelCourse) {
                setDefaultPromoteCourseId(nextLevelCourse.id);
            } else {
                const firstOther = availableTargetCourses.find((tc) => tc.id !== course.id);
                if (firstOther) {
                    setDefaultPromoteCourseId(firstOther.id);
                } else {
                    setDefaultPromoteCourseId('');
                }
            }
        }
    }, [open, students, isSourceReadOnly, course, availableTargetCourses]);

    // Filter students by name or id number
    const filteredStudents = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return students;
        return students.filter(
            (s) =>
                s.first_name.toLowerCase().includes(q) ||
                s.last_name.toLowerCase().includes(q) ||
                (s.student_id_number && s.student_id_number.toLowerCase().includes(q))
        );
    }, [students, searchQuery]);

    // Quick preset: Mark all as Promoted
    const handleSetAllPromoted = () => {
        setPromotions((prev) => {
            const updated = { ...prev };
            students.forEach((s) => {
                updated[s.id] = {
                    ...updated[s.id],
                    action: 'promote',
                    target_course_id: defaultPromoteCourseId ? Number(defaultPromoteCourseId) : updated[s.id]?.target_course_id || null,
                };
            });
            return updated;
        });
    };

    // Quick preset: Mark all as Repeaters
    const handleSetAllRepeaters = () => {
        const repeatTargetId = defaultRepeatCourseId
            ? Number(defaultRepeatCourseId)
            : (!isSourceReadOnly ? course.id : null);

        setPromotions((prev) => {
            const updated = { ...prev };
            students.forEach((s) => {
                updated[s.id] = {
                    ...updated[s.id],
                    action: 'repeat',
                    target_course_id: repeatTargetId,
                };
            });
            return updated;
        });
    };

    // Reset all to 'none'
    const handleResetAll = () => {
        setPromotions((prev) => {
            const updated = { ...prev };
            students.forEach((s) => {
                updated[s.id] = {
                    student_id: s.id,
                    action: 'none',
                    target_course_id: null,
                    mark_institution_inactive: false,
                };
            });
            return updated;
        });
    };

    // Change action for single student
    const handleStudentActionChange = (
        studentId: number,
        action: 'promote' | 'repeat' | 'withdraw' | 'none'
    ) => {
        setPromotions((prev) => {
            const current = prev[studentId] || { student_id: studentId, action: 'none' };
            let targetCourse = current.target_course_id;

            if (action === 'promote' && defaultPromoteCourseId) {
                targetCourse = Number(defaultPromoteCourseId);
            } else if (action === 'repeat') {
                if (defaultRepeatCourseId) {
                    targetCourse = Number(defaultRepeatCourseId);
                } else if (!isSourceReadOnly) {
                    targetCourse = course.id;
                } else {
                    targetCourse = null;
                }
            } else if (action === 'withdraw' || action === 'none') {
                targetCourse = null;
            }

            return {
                ...prev,
                [studentId]: {
                    ...current,
                    action,
                    target_course_id: targetCourse,
                },
            };
        });
    };

    // Change target course for single student
    const handleStudentTargetCourseChange = (studentId: number, courseIdStr: string) => {
        setPromotions((prev) => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || { student_id: studentId, action: 'none' }),
                target_course_id: courseIdStr ? Number(courseIdStr) : null,
            },
        }));
    };

    // Toggle mark inactive for withdrawn student
    const handleToggleInactive = (studentId: number) => {
        setPromotions((prev) => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || { student_id: studentId, action: 'withdraw' }),
                mark_institution_inactive: !prev[studentId]?.mark_institution_inactive,
            },
        }));
    };

    // Handle change of default promoted target course
    const handleDefaultPromoteCourseChange = (newCourseIdStr: string) => {
        const id = newCourseIdStr ? Number(newCourseIdStr) : '';
        setDefaultPromoteCourseId(id);
        if (id) {
            setPromotions((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((k) => {
                    const stId = Number(k);
                    if (updated[stId].action === 'promote') {
                        updated[stId] = { ...updated[stId], target_course_id: id };
                    }
                });
                return updated;
            });
        }
    };

    // Handle change of default repeater target course
    const handleDefaultRepeatCourseChange = (newCourseIdStr: string) => {
        const id = newCourseIdStr ? Number(newCourseIdStr) : '';
        setDefaultRepeatCourseId(id);
        if (id) {
            setPromotions((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((k) => {
                    const stId = Number(k);
                    if (updated[stId].action === 'repeat') {
                        updated[stId] = { ...updated[stId], target_course_id: id };
                    }
                });
                return updated;
            });
        }
    };

    // Calculate counts
    const counts = useMemo(() => {
        let promoted = 0;
        let repeated = 0;
        let withdrawn = 0;
        let none = 0;
        let missingTarget = 0;

        Object.values(promotions).forEach((p) => {
            if (p.action === 'promote') {
                promoted++;
                if (!p.target_course_id) missingTarget++;
            } else if (p.action === 'repeat') {
                repeated++;
                if (!p.target_course_id) missingTarget++;
            } else if (p.action === 'withdraw') {
                withdrawn++;
            } else {
                none++;
            }
        });

        return { promoted, repeated, withdrawn, none, missingTarget };
    }, [promotions]);

    const hasAnyAction = counts.promoted > 0 || counts.repeated > 0 || counts.withdrawn > 0;
    const canSubmit = hasAnyAction && counts.missingTarget === 0 && !isSubmitting;

    const handleSubmit = () => {
        if (!canSubmit) return;

        const activePromotions = Object.values(promotions).filter((p) => p.action !== 'none');

        confirm({
            title: '¿Confirmar y aplicar promoción de estudiantes?',
            description: `Se registrará la resolución académica de ${activePromotions.length} estudiantes: ${counts.promoted} promovidos al nuevo grado, ${counts.repeated} repitentes y ${counts.withdrawn} retirados.`,
            confirmText: 'Aplicar Promoción',
            variant: 'primary',
            onConfirm: () => {
                setIsSubmitting(true);
                router.post(
                    `/courses/${course.id}/promote-students`,
                    { promotions: activePromotions as any },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            setIsSubmitting(false);
                            onOpenChange(false);
                        },
                        onError: () => {
                            setIsSubmitting(false);
                        },
                    }
                );
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-6">
                <DialogHeader className="space-y-1.5 pb-2 border-b">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                Promoción y Transición de Estudiantes
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Origen: <span className="font-semibold text-foreground">{course.name} {course.section ? `(${course.section})` : ''}</span> • {course.academic_period?.name ?? 'Período actual'} ({course.institution.name})
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {targetCourseOptions.length === 0 ? (
                    <div className="py-8 text-center space-y-3">
                        <AlertCircle className="mx-auto h-10 w-10 text-amber-500/80" />
                        <h4 className="font-semibold text-sm text-foreground">No hay cursos de destino disponibles en períodos activos</h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Para poder promover o transferir estudiantes, primero debes tener creados los cursos en el nuevo período académico abierto (ej: 4to Curso en 2027-2028).
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-2">
                        {/* Global Presets & Defaults */}
                        <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Asignación Rápida y Cursos de Destino
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                                        onClick={handleSetAllPromoted}
                                    >
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Todos Promovidos
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30"
                                        onClick={handleSetAllRepeaters}
                                    >
                                        <RotateCcw className="h-3 w-3 mr-1" /> Todos Repitentes
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={handleResetAll}
                                    >
                                        Reiniciar
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50 text-xs">
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-muted-foreground">
                                        Curso destino por defecto para <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">Promovidos (Pasaron)</strong>:
                                    </Label>
                                    <select
                                        value={defaultPromoteCourseId}
                                        onChange={(e) => handleDefaultPromoteCourseChange(e.target.value)}
                                        className="w-full h-8 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="">Seleccionar curso del siguiente nivel...</option>
                                        {targetCourseOptions
                                            .filter((tc) => tc.id !== course.id)
                                            .map((tc) => (
                                                <option key={tc.id} value={tc.id}>
                                                    {tc.name} {tc.section ? `(${tc.section})` : ''} — {tc.academic_period?.name ?? 'Período activo'}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[11px] text-muted-foreground">
                                        Curso destino por defecto para <strong className="text-amber-700 dark:text-amber-400 font-semibold">Repitentes (Repiten grado)</strong>:
                                    </Label>
                                    <select
                                        value={defaultRepeatCourseId}
                                        onChange={(e) => handleDefaultRepeatCourseChange(e.target.value)}
                                        className="w-full h-8 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="">Seleccionar curso del mismo nivel en nuevo ciclo...</option>
                                        {targetCourseOptions.map((tc) => (
                                            <option key={tc.id} value={tc.id}>
                                                {tc.id === course.id
                                                    ? tc.name
                                                    : `${tc.name} ${tc.section ? `(${tc.section})` : ''} — ${tc.academic_period?.name ?? 'Período activo'}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar & Stats */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="relative max-w-sm flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar alumno por nombre o carnet..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 text-xs h-8"
                                />
                            </div>

                            {/* Summary Pill Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                    {counts.promoted} Promovidos
                                </Badge>
                                <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                    {counts.repeated} Repitentes
                                </Badge>
                                <Badge variant="outline" className="text-[11px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
                                    {counts.withdrawn} Retirados
                                </Badge>
                                <Badge variant="secondary" className="text-[11px]">
                                    {counts.none} Sin cambio
                                </Badge>
                            </div>
                        </div>

                        {/* Students Table */}
                        <div className="flex-1 overflow-y-auto rounded-xl border bg-card max-h-[360px]">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 bg-muted/95 backdrop-blur border-b z-10">
                                    <tr>
                                        <th className="px-3.5 py-2.5 font-semibold text-foreground">Estudiante</th>
                                        <th className="px-3 py-2.5 font-semibold text-foreground w-64 text-center">Resultado / Decisión</th>
                                        <th className="px-3 py-2.5 font-semibold text-foreground">Curso de Destino</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                                No se encontraron estudiantes con los criterios de búsqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((st) => {
                                            const item = promotions[st.id] || { student_id: st.id, action: 'none' };
                                            const prevStatus = st.pivot?.status;

                                            return (
                                                <tr key={st.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-3.5 py-2.5 font-medium text-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <span>{st.last_name}, {st.first_name}</span>
                                                            {prevStatus && prevStatus !== 'active' && (
                                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                                                                    {prevStatus}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {st.student_id_number && (
                                                            <span className="text-[10px] font-mono text-muted-foreground block">
                                                                {st.student_id_number}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Radio Button Choices */}
                                                    <td className="px-3 py-2 text-center">
                                                        <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5 text-[11px]">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStudentActionChange(st.id, 'promote')}
                                                                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                                                                    item.action === 'promote'
                                                                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                }`}
                                                                title="Aprobó: avanza al siguiente grado"
                                                            >
                                                                Promovido
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStudentActionChange(st.id, 'repeat')}
                                                                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                                                                    item.action === 'repeat'
                                                                        ? 'bg-amber-600 text-white shadow-xs font-semibold'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                }`}
                                                                title="Reprobó: repite el grado actual en el nuevo ciclo"
                                                            >
                                                                Repitente
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStudentActionChange(st.id, 'withdraw')}
                                                                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                                                                    item.action === 'withdraw'
                                                                        ? 'bg-rose-600 text-white shadow-xs font-semibold'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                }`}
                                                                title="Se fue de la institución / desvinculado"
                                                            >
                                                                Retirado
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStudentActionChange(st.id, 'none')}
                                                                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                                                                    item.action === 'none'
                                                                        ? 'bg-background text-foreground shadow-xs'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                }`}
                                                                title="Sin cambios"
                                                            >
                                                                Ninguno
                                                            </button>
                                                        </div>
                                                    </td>

                                                    {/* Target Course Selector / Withdrawn Options */}
                                                    <td className="px-3 py-2">
                                                        {item.action === 'promote' || item.action === 'repeat' ? (
                                                            <div className="space-y-1">
                                                                <select
                                                                    value={item.target_course_id || ''}
                                                                    onChange={(e) => handleStudentTargetCourseChange(st.id, e.target.value)}
                                                                    className={`w-full h-7 rounded border bg-background px-2 text-[11px] focus:outline-none focus:ring-1 ${
                                                                        !item.target_course_id
                                                                            ? 'border-destructive/60 bg-destructive/5 text-destructive'
                                                                            : 'border-border text-foreground'
                                                                    }`}
                                                                >
                                                                    <option value="">-- Seleccionar curso destino * --</option>
                                                                    {targetCourseOptions
                                                                        .filter((tc) => item.action !== 'promote' || tc.id !== course.id)
                                                                        .map((tc) => (
                                                                            <option key={tc.id} value={tc.id}>
                                                                                {tc.id === course.id
                                                                                    ? tc.name
                                                                                    : `${tc.name} ${tc.section ? `(${tc.section})` : ''} (${tc.academic_period?.name ?? 'Período'})`}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                                {!item.target_course_id && (
                                                                    <span className="text-[10px] text-destructive block">
                                                                        Falta asignar curso
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : item.action === 'withdraw' ? (
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                                                                <Checkbox
                                                                    checked={item.mark_institution_inactive || false}
                                                                    onCheckedChange={() => handleToggleInactive(st.id)}
                                                                />
                                                                <span className="text-[11px]">
                                                                    Dar de baja en el padrón institucional (Inactivo)
                                                                </span>
                                                            </label>
                                                        ) : (
                                                            <span className="text-muted-foreground/60 text-[11px] italic">
                                                                Sin modificación
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                        {counts.missingTarget > 0 ? (
                            <span className="text-destructive font-medium flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Hay {counts.missingTarget} estudiante(s) con resultado asignado sin curso de destino.
                            </span>
                        ) : hasAnyAction ? (
                            <span className="text-foreground">
                                Se procesará la transición de {counts.promoted + counts.repeated + counts.withdrawn} alumno(s).
                            </span>
                        ) : (
                            <span>Selecciona la acción académica para los estudiantes para continuar.</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={!canSubmit}
                            onClick={handleSubmit}
                            className="bg-primary text-primary-foreground gap-1.5"
                        >
                            <Check className="h-4 w-4" />
                            {isSubmitting ? 'Procesando...' : 'Confirmar y Aplicar Promoción'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
            <ConfirmDialogComponent />
        </Dialog>
    );
}
