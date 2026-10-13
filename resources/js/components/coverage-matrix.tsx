import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { CheckCircle2, AlertTriangle, Circle, Search, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    student_id_number?: string;
    preferred_workstation?: string;
}

interface CourseTopic {
    id: number;
    title: string;
    unit_title?: string;
    sort_order: number;
    parent_id?: number | null;
    subtopics?: CourseTopic[];
}

interface ProgressRecord {
    id: number;
    student_id: number;
    course_topic_id: number;
    coverage_status: 'explained' | 'pending';
    mastery_level: 'not_evaluated' | 'needs_reinforcement' | 'mastered';
    evaluation_notes?: string;
}

interface ActiveCell {
    studentId: number;
    studentName: string;
    topicId: number;
    topicTitle: string;
    currentStatus: 'explained' | 'needs_reinforcement' | 'pending';
}

interface Props {
    courseId?: number;
    students: Student[];
    topics: CourseTopic[];
    progressByStudent: Record<number, ProgressRecord[]>;
}

export function CoverageMatrix({ courseId, students, topics, progressByStudent }: Props) {
    const [search, setSearch] = useState('');
    const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateStatus = (status: 'explained' | 'needs_reinforcement' | 'pending') => {
        if (!courseId || !activeCell) return;
        setIsUpdating(true);
        router.post(
            `/courses/${courseId}/progress`,
            {
                student_id: activeCell.studentId,
                course_topic_id: activeCell.topicId,
                status,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setIsUpdating(false);
                    setActiveCell(null);
                },
            }
        );
    };

    const filteredStudents = students.filter((s) => {
        const query = search.toLowerCase();
        return (
            s.first_name.toLowerCase().includes(query) ||
            s.last_name.toLowerCase().includes(query) ||
            (s.student_id_number && s.student_id_number.toLowerCase().includes(query))
        );
    });

    if (topics.length === 0) {
        return (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <p>El pensum del curso aún no tiene temas asignados.</p>
                <p className="mt-1 text-sm">Agrega temas desde la pestaña "Pensum del Curso" para activar la matriz de cobertura.</p>
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <p>No hay estudiantes matriculados en este curso todavía.</p>
                <p className="mt-1 text-sm">Matricula alumnos desde la pestaña "Estudiantes" para visualizar la matriz.</p>
            </div>
        );
    }

    interface EvaluableTopic {
        id: number;
        shortLabel: string;
        title: string;
        parentTitle?: string;
        fullLabel: string;
    }

    const evaluableTopics = useMemo<EvaluableTopic[]>(() => {
        const list: EvaluableTopic[] = [];
        topics.forEach((t, tIdx) => {
            if (t.subtopics && t.subtopics.length > 0) {
                t.subtopics.forEach((sub, sIdx) => {
                    list.push({
                        id: sub.id,
                        shortLabel: `T${tIdx + 1}.${sIdx + 1}`,
                        title: sub.title,
                        parentTitle: t.title,
                        fullLabel: `${t.title} > ${sub.title}`,
                    });
                });
            } else {
                list.push({
                    id: t.id,
                    shortLabel: `T${tIdx + 1}`,
                    title: t.title,
                    fullLabel: t.title,
                });
            }
        });
        return list;
    }, [topics]);

    const evaluableIdSet = useMemo(() => new Set(evaluableTopics.map((e) => e.id)), [evaluableTopics]);

    // Helper to get progress for a specific student and topic
    const getStudentTopicProgress = (studentId: number, topicId: number): ProgressRecord | undefined => {
        const studentRecords = progressByStudent[studentId] || [];
        return studentRecords.find((r) => r.course_topic_id === topicId && r.coverage_status === 'explained');
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filtrar estudiante..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {courseId && (
                        <span className="text-[11px] text-primary font-medium mr-1 hidden sm:inline">
                            💡 Clic en cualquier celda para cambiar su estado
                        </span>
                    )}
                    <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Explicado
                    </span>
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Refuerzo
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Circle className="h-4 w-4 text-muted-foreground/40" /> Pendiente
                    </span>
                </div>
            </div>

            <div className="relative max-h-[600px] overflow-auto rounded-lg border bg-card shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur border-b">
                        <tr>
                            <th className="sticky left-0 z-30 bg-muted/95 backdrop-blur px-4 py-3 font-semibold text-foreground min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Estudiante ({filteredStudents.length})
                            </th>
                            <th className="px-3 py-3 font-medium text-center text-muted-foreground min-w-[80px]">
                                % Avance
                            </th>
                            {evaluableTopics.map((item) => (
                                <th
                                    key={item.id}
                                    className="px-3 py-3 font-medium text-foreground max-w-[160px] truncate"
                                    title={item.fullLabel}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] uppercase text-muted-foreground font-mono block">
                                            {item.shortLabel}
                                        </span>
                                        {item.parentTitle && (
                                            <span className="text-[9px] text-muted-foreground/70 truncate block" title={item.parentTitle}>
                                                ({item.parentTitle})
                                            </span>
                                        )}
                                    </div>
                                    <span className="truncate block font-medium">
                                        {item.title}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredStudents.map((student) => {
                            const studentRecords = progressByStudent[student.id] || [];
                            const completedCount = studentRecords.filter((r) => evaluableIdSet.has(r.course_topic_id) && r.coverage_status === 'explained').length;
                            const percentage = evaluableTopics.length > 0 ? Math.round((completedCount / evaluableTopics.length) * 100) : 0;

                            return (
                                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium text-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        <div className="flex flex-col">
                                            <span>{student.last_name}, {student.first_name}</span>
                                            {student.student_id_number && (
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {student.student_id_number}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                            percentage === 100
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                : percentage > 50
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {percentage}%
                                        </span>
                                    </td>
                                    {evaluableTopics.map((item) => {
                                        const progress = getStudentTopicProgress(student.id, item.id);
                                        const isInteractive = Boolean(courseId);

                                        const onCellClick = () => {
                                            if (!isInteractive) return;
                                            const currentStatus = !progress
                                                ? 'pending'
                                                : progress.mastery_level === 'needs_reinforcement'
                                                ? 'needs_reinforcement'
                                                : 'explained';

                                            setActiveCell({
                                                studentId: student.id,
                                                studentName: `${student.last_name}, ${student.first_name}`,
                                                topicId: item.id,
                                                topicTitle: item.fullLabel,
                                                currentStatus,
                                            });
                                        };

                                        if (!progress) {
                                            return (
                                                <td
                                                    key={item.id}
                                                    onClick={onCellClick}
                                                    className={`px-3 py-2.5 text-center transition-colors ${
                                                        isInteractive ? 'cursor-pointer hover:bg-muted/60' : ''
                                                    }`}
                                                    title={isInteractive ? 'Pendiente (Clic para modificar)' : 'Pendiente'}
                                                >
                                                    <Circle className="h-4 w-4 mx-auto text-muted-foreground/30" />
                                                </td>
                                            );
                                        }

                                        if (progress.mastery_level === 'needs_reinforcement') {
                                            return (
                                                <td
                                                    key={item.id}
                                                    onClick={onCellClick}
                                                    className={`px-3 py-2.5 text-center bg-amber-500/10 transition-colors ${
                                                        isInteractive ? 'cursor-pointer hover:bg-amber-500/20' : ''
                                                    }`}
                                                    title={isInteractive ? 'Requiere Refuerzo (Clic para modificar)' : 'Explicado (Requiere Refuerzo)'}
                                                >
                                                    <AlertTriangle
                                                        className="h-4 w-4 mx-auto text-amber-600 dark:text-amber-400"
                                                    />
                                                </td>
                                            );
                                        }

                                        return (
                                            <td
                                                key={item.id}
                                                onClick={onCellClick}
                                                className={`px-3 py-2.5 text-center bg-emerald-500/10 transition-colors ${
                                                    isInteractive ? 'cursor-pointer hover:bg-emerald-500/20' : ''
                                                }`}
                                                title={isInteractive ? 'Explicado (Clic para modificar)' : (progress.mastery_level === 'mastered' ? 'Dominado' : 'Explicado')}
                                            >
                                                <CheckCircle2
                                                    className="h-4 w-4 mx-auto text-emerald-600 dark:text-emerald-400"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal de edición rápida de estado */}
            <Dialog open={!!activeCell} onOpenChange={(open) => !open && !isUpdating && setActiveCell(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">
                            Cambiar Estado del Tema
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            <span className="font-semibold text-foreground">{activeCell?.studentName}</span>
                            <br />
                            <span className="text-muted-foreground">{activeCell?.topicTitle}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-2.5 pt-2">
                        <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus('explained')}
                            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                                activeCell?.currentStatus === 'explained'
                                    ? 'border-emerald-500 bg-emerald-500/15 text-foreground ring-1 ring-emerald-500'
                                    : 'hover:bg-muted/60 border-border'
                            }`}
                        >
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <span className="text-xs font-semibold block text-emerald-700 dark:text-emerald-300">
                                    Explicado
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                    Tema cubierto y acreditado normalmente para el estudiante.
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus('needs_reinforcement')}
                            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                                activeCell?.currentStatus === 'needs_reinforcement'
                                    ? 'border-amber-500 bg-amber-500/15 text-foreground ring-1 ring-amber-500'
                                    : 'hover:bg-muted/60 border-border'
                            }`}
                        >
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <span className="text-xs font-semibold block text-amber-700 dark:text-amber-300">
                                    Requiere Refuerzo
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                    El estudiante asistió pero necesita repaso, práctica guiada o apoyo individual.
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus('pending')}
                            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                                activeCell?.currentStatus === 'pending'
                                    ? 'border-muted-foreground/60 bg-muted text-foreground ring-1 ring-muted-foreground/40'
                                    : 'hover:bg-muted/60 border-border'
                            }`}
                        >
                            <Circle className="h-5 w-5 text-muted-foreground/60 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <span className="text-xs font-semibold block text-foreground">
                                    Pendiente
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                    Remover la acreditación; el tema vuelve a estado pendiente.
                                </span>
                            </div>
                        </button>
                    </div>

                    {isUpdating && (
                        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span>Guardando cambios...</span>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
