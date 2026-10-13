import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Computer,
    Sparkles,
    AlertCircle,
    AlertTriangle,
    BookOpen,
    Users,
    Save,
    Play,
    Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    student_id_number?: string;
    preferred_workstation?: string;
    pivot?: {
        preferred_workstation?: string;
        status?: string;
    };
}

interface CourseTopic {
    id: number;
    title: string;
    unit_title?: string;
    sort_order: number;
    parent_id?: number | null;
    subtopics?: CourseTopic[];
}

interface Course {
    id: number;
    name: string;
    section?: string;
    institution: { id: number; name: string };
}

interface ProgressRecord {
    id: number;
    class_session_id?: number;
    student_id: number;
    course_topic_id: number;
    coverage_status: string;
    mastery_level: string;
}

interface SessionData {
    id: number;
    session_date: string;
    title?: string;
    notes?: string;
    status: 'draft' | 'completed' | 'cancelled';
    topics: Array<{ id: number; title: string }>;
    attendances: Array<{
        id: number;
        student_id: number;
        workstation?: string;
        notes?: string;
    }>;
    progress_records?: ProgressRecord[];
    progressRecords?: ProgressRecord[];
}

interface SuggestionResult {
    status: string;
    present_students_count: number;
    primary_recommendation: {
        action_type: string;
        course_topic_id: number | null;
        title: string;
        rationale: string;
        ready_and_pending_count?: number;
        already_covered_count?: number;
        missing_prerequisites_count?: number;
    } | null;
}

interface Props {
    course: Course;
    session: SessionData;
    students: Student[];
    courseTopics: CourseTopic[];
}

export default function SessionEdit({ course, session, students, courseTopics }: Props) {
    const formattedDate = session.session_date.includes('T')
        ? session.session_date.split('T')[0]
        : session.session_date;

    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>(
        session.attendances.map((a) => a.student_id)
    );
    const [reinforcementStudentIds, setReinforcementStudentIds] = useState<number[]>(() => {
        const records = session.progress_records || session.progressRecords || [];
        const ids = records
            .filter((r) => r.mastery_level === 'needs_reinforcement')
            .map((r) => r.student_id);
        return Array.from(new Set(ids));
    });

    const toggleStudentReinforcement = (id: number) => {
        setReinforcementStudentIds((prev) =>
            prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
        );
    };

    const [workstations, setWorkstations] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        session.attendances.forEach((a) => {
            if (a.workstation) {
                initial[a.student_id] = a.workstation;
            }
        });
        students.forEach((s) => {
            const preferred = s.preferred_workstation || s.pivot?.preferred_workstation;
            if (!initial[s.id] && preferred) {
                initial[s.id] = preferred;
            }
        });
        return initial;
    });

    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>(
        session.topics.map((t) => t.id)
    );
    const [suggestion, setSuggestion] = useState<SuggestionResult | null>(null);
    const [loadingSuggestion, setLoadingSuggestion] = useState(false);

    // Live suggestion fetch when selectedStudentIds changes
    useEffect(() => {
        if (selectedStudentIds.length === 0) {
            setSuggestion(null);
            return;
        }

        const controller = new AbortController();
        setLoadingSuggestion(true);

        fetch(`/courses/${course.id}/sessions/suggest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify({ student_ids: selectedStudentIds }),
            signal: controller.signal,
        })
            .then((res) => res.json())
            .then((data) => {
                setSuggestion(data);
                setLoadingSuggestion(false);
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    setLoadingSuggestion(false);
                }
            });

        return () => controller.abort();
    }, [selectedStudentIds, course.id]);

    const { data, setData, put, processing, errors } = useForm({
        session_date: formattedDate,
        title: session.title || '',
        notes: session.notes || '',
        status: session.status,
        topic_ids: session.topics.map((t) => t.id),
        attendances: [] as Array<{ student_id: number; workstation?: string }>,
    });

    const toggleStudent = (id: number) => {
        setSelectedStudentIds((prev) =>
            prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
        );
    };

    const selectAllStudents = () => {
        setSelectedStudentIds(students.map((s) => s.id));
    };

    const clearStudents = () => {
        setSelectedStudentIds([]);
    };

    const toggleTopic = (id: number) => {
        setSelectedTopicIds((prev) =>
            prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
        );
    };

    const toggleTopicGroup = (topic: CourseTopic) => {
        if (!topic.subtopics || topic.subtopics.length === 0) {
            toggleTopic(topic.id);
            return;
        }

        const subIds = topic.subtopics.map((s) => s.id);
        const allSubSelected = subIds.every((id) => selectedTopicIds.includes(id));

        if (allSubSelected) {
            setSelectedTopicIds((prev) => prev.filter((id) => id !== topic.id && !subIds.includes(id)));
        } else {
            setSelectedTopicIds((prev) => Array.from(new Set([...prev, topic.id, ...subIds])));
        }
    };

    const applySuggestedTopic = () => {
        if (suggestion?.primary_recommendation?.course_topic_id) {
            const topicId = suggestion.primary_recommendation.course_topic_id;
            const parentTopic = courseTopics.find((t) => t.id === topicId);
            if (parentTopic && parentTopic.subtopics && parentTopic.subtopics.length > 0) {
                setSelectedTopicIds((prev) => Array.from(new Set([...prev, topicId, ...parentTopic.subtopics!.map((s) => s.id)])));
            } else {
                if (!selectedTopicIds.includes(topicId)) {
                    setSelectedTopicIds((prev) => [...prev, topicId]);
                }
            }
        }
    };

    const handleSaveSession = (newStatus: 'draft' | 'completed' | 'cancelled') => {
        const attendances = selectedStudentIds.map((sId) => ({
            student_id: sId,
            workstation: workstations[sId] || undefined,
        }));

        const progress_overrides = reinforcementStudentIds
            .filter((sId) => selectedStudentIds.includes(sId))
            .flatMap((sId) =>
                selectedTopicIds.map((tId) => ({
                    student_id: sId,
                    course_topic_id: tId,
                    coverage_status: 'explained',
                    mastery_level: 'needs_reinforcement',
                }))
            );

        router.put(`/courses/${course.id}/sessions/${session.id}`, {
            session_date: data.session_date,
            title: data.title,
            notes: data.notes,
            status: newStatus,
            topic_ids: selectedTopicIds,
            attendances,
            progress_overrides,
        });
    };

    return (
        <>
            <Head title={`Editar Sesión #${session.id} - ${course.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <Link href={`/courses/${course.id}`} className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {course.institution?.name}
                            </span>
                            <h1 className="text-xl font-bold text-foreground">
                                Editar Sesión de Clase — {course.name}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Session Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card border p-4 rounded-xl shadow-sm">
                    <div className="space-y-1.5">
                        <Label htmlFor="session_date">Fecha de la Sesión *</Label>
                        <Input
                            id="session_date"
                            type="date"
                            value={data.session_date}
                            onChange={(e) => setData('session_date', e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="session_title">Título / Objetivo de la Clase</Label>
                        <Input
                            id="session_title"
                            placeholder="Ej: Práctica en laboratorio de computación"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-3">
                        <Label htmlFor="session_notes">Notas de la Clase (Opcional)</Label>
                        <Input
                            id="session_notes"
                            placeholder="Observaciones de la clase, incidencias o tareas pendientes..."
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Student Selection & Workstations (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                <h3 className="font-semibold text-sm text-foreground">
                                    Alumnos en el Laboratorio ({selectedStudentIds.length}/{students.length})
                                </h3>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={selectAllStudents} className="text-xs h-7">
                                    Todos
                                </Button>
                                <Button size="sm" variant="ghost" onClick={clearStudents} className="text-xs h-7 text-muted-foreground">
                                    Limpiar
                                </Button>
                            </div>
                        </div>

                        {students.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-xs">
                                No hay estudiantes matriculados en este curso.
                            </div>
                        ) : (
                            <div className="divide-y rounded-xl border bg-card max-h-[460px] overflow-y-auto">
                                {students.map((student) => {
                                    const isSelected = selectedStudentIds.includes(student.id);

                                    return (
                                        <div
                                            key={student.id}
                                            className={`flex items-center justify-between p-3 transition-colors ${
                                                isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                                            }`}
                                        >
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleStudent(student.id)}
                                                    className="h-4 w-4 rounded text-primary border-muted-foreground"
                                                />
                                                <div>
                                                    <span className="text-xs font-semibold text-foreground block">
                                                        {student.last_name}, {student.first_name}
                                                    </span>
                                                    {student.student_id_number && (
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {student.student_id_number}
                                                        </span>
                                                    )}
                                                </div>
                                            </label>

                                            {isSelected && (
                                                <div className="flex items-center gap-2 pl-2">
                                                    <div className="flex items-center gap-1">
                                                        <Computer className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            placeholder="Puesto/PC"
                                                            value={workstations[student.id] || ''}
                                                            onChange={(e) =>
                                                                setWorkstations({
                                                                    ...workstations,
                                                                    [student.id]: e.target.value,
                                                                })
                                                            }
                                                            className="h-7 w-20 text-xs px-2 rounded border bg-background text-foreground font-mono"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleStudentReinforcement(student.id);
                                                        }}
                                                        className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                                                            reinforcementStudentIds.includes(student.id)
                                                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold'
                                                                : 'bg-muted/30 text-muted-foreground hover:bg-muted/70 border-border/50'
                                                        }`}
                                                        title={
                                                            reinforcementStudentIds.includes(student.id)
                                                                ? 'Marcado para refuerzo pedagógico en esta sesión'
                                                                : 'Marcar si el alumno requiere refuerzo'
                                                        }
                                                    >
                                                        <AlertTriangle
                                                            className={`h-3 w-3 ${
                                                                reinforcementStudentIds.includes(student.id)
                                                                    ? 'text-amber-600 dark:text-amber-400'
                                                                    : 'text-muted-foreground/60'
                                                            }`}
                                                        />
                                                        <span>{reinforcementStudentIds.includes(student.id) ? 'Refuerzo' : 'Normal'}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Topics & Suggestions (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Recommendation Card */}
                        {loadingSuggestion && (
                            <div className="p-4 rounded-xl border bg-card animate-pulse flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-primary shrink-0 animate-spin" />
                                <span className="text-xs text-muted-foreground">Analizando temario recomendado...</span>
                            </div>
                        )}

                        {!loadingSuggestion && suggestion && suggestion.primary_recommendation && (
                            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                            Sugerencia Inteligente
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground"
                                        onClick={applySuggestedTopic}
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Aplicar Tema
                                    </Button>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-foreground">
                                        {suggestion.primary_recommendation.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {suggestion.primary_recommendation.rationale}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Topics Selection Checklist */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                    <h3 className="font-semibold text-sm text-foreground">
                                        Temas Impartidos ({selectedTopicIds.length})
                                    </h3>
                                </div>
                            </div>

                            {courseTopics.length === 0 ? (
                                <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-xs">
                                    No hay temas en el pensum de este curso.
                                </div>
                            ) : (
                                <div className="divide-y rounded-xl border bg-card max-h-[350px] overflow-y-auto">
                                    {courseTopics.map((topic, index) => {
                                        const isParentSelected = selectedTopicIds.includes(topic.id);
                                        const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
                                        const subtopics = topic.subtopics || [];
                                        const allSubSelected =
                                            hasSubtopics && subtopics.every((s) => selectedTopicIds.includes(s.id));
                                        const someSubSelected =
                                            hasSubtopics && subtopics.some((s) => selectedTopicIds.includes(s.id));

                                        const isChecked = hasSubtopics ? allSubSelected : isParentSelected;

                                        return (
                                            <div key={topic.id} className="p-3 hover:bg-muted/20 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        ref={(el) => {
                                                            if (el && hasSubtopics) {
                                                                el.indeterminate = someSubSelected && !allSubSelected;
                                                            }
                                                        }}
                                                        onChange={() => toggleTopicGroup(topic)}
                                                        className="mt-0.5 h-4 w-4 rounded text-primary border-muted-foreground cursor-pointer"
                                                    />
                                                    <div className="flex-1 cursor-pointer" onClick={() => toggleTopicGroup(topic)}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-foreground">
                                                                {index + 1}. {topic.title}
                                                            </span>
                                                            {hasSubtopics && (
                                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                                                    {topic.subtopics!.length} subtemas
                                                                </span>
                                                            )}
                                                        </div>
                                                        {topic.unit_title && (
                                                            <span className="text-[10px] text-muted-foreground block">
                                                                {topic.unit_title}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {hasSubtopics && (
                                                    <div className="mt-2 ml-7 pl-3 border-l-2 border-border/60 space-y-1.5">
                                                        {topic.subtopics!.map((sub, sIdx) => {
                                                            const isSubSelected = selectedTopicIds.includes(sub.id);
                                                            return (
                                                                <label
                                                                    key={sub.id}
                                                                    className={`flex items-center gap-2.5 py-1 px-2 rounded cursor-pointer transition-colors ${
                                                                        isSubSelected ? 'bg-primary/10' : 'hover:bg-muted/40'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSubSelected}
                                                                        onChange={() => toggleTopic(sub.id)}
                                                                        className="h-3.5 w-3.5 rounded text-primary border-muted-foreground cursor-pointer"
                                                                    />
                                                                    <span className="text-xs text-foreground">
                                                                        <span className="text-muted-foreground font-mono text-[10px] mr-1.5">
                                                                            {index + 1}.{sIdx + 1}
                                                                        </span>
                                                                        {sub.title}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 space-y-2">
                            <Button
                                type="button"
                                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={selectedStudentIds.length === 0 || selectedTopicIds.length === 0 || processing}
                                onClick={() => handleSaveSession('completed')}
                            >
                                <Play className="h-4 w-4 fill-white" /> Guardar como Completada
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full gap-2 text-xs"
                                disabled={selectedStudentIds.length === 0 || selectedTopicIds.length === 0 || processing}
                                onClick={() => handleSaveSession('draft')}
                            >
                                <Save className="h-3.5 w-3.5" /> Guardar como Borrador
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full gap-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                disabled={processing}
                                onClick={() => handleSaveSession('cancelled')}
                            >
                                <Ban className="h-3.5 w-3.5" /> Marcar como Cancelada
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

SessionEdit.layout = {
    breadcrumbs: [
        {
            title: 'Cursos',
            href: '/courses',
        },
        {
            title: 'Editar Sesión',
            href: '',
        },
    ],
};
