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
    Clock,
    Filter,
    CalendarDays,
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

interface StudentAttendanceRecord {
    session_id: number;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    duration_minutes?: number | null;
    formatted_time_range?: string | null;
    status: string;
}

interface DaySessionItem {
    id: number;
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    duration_minutes?: number | null;
    formatted_time_range?: string | null;
    status: string;
    student_count: number;
}

interface DaySummary {
    date: string;
    sessions_count: number;
    attended_student_ids: number[];
    student_attendance_map: Record<number, StudentAttendanceRecord[]>;
    sessions: DaySessionItem[];
}

interface Props {
    course: Course;
    students: Student[];
    courseTopics: CourseTopic[];
    daySummary?: DaySummary;
    initialDate?: string;
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const totalMinutes = (h * 60 + m + minutesToAdd) % (24 * 60);
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function diffMinutes(startStr: string, endStr: string): number {
    const [h1, m1] = startStr.split(':').map(Number);
    const [h2, m2] = endStr.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    const diff = h2 * 60 + m2 - (h1 * 60 + m1);
    return diff > 0 ? diff : 0;
}

export default function SessionCreate({ course, students, courseTopics, daySummary: initialDaySummary, initialDate }: Props) {
    const today = initialDate || new Date().toISOString().split('T')[0];

    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [reinforcementStudentIds, setReinforcementStudentIds] = useState<number[]>([]);
    const [workstations, setWorkstations] = useState<Record<number, string>>({});
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [suggestion, setSuggestion] = useState<SuggestionResult | null>(null);
    const [loadingSuggestion, setLoadingSuggestion] = useState(false);

    // Day sessions & attendance detection state
    const [daySummary, setDaySummary] = useState<DaySummary>(
        initialDaySummary || {
            date: today,
            sessions_count: 0,
            attended_student_ids: [],
            student_attendance_map: {},
            sessions: [],
        }
    );
    const [loadingDaySummary, setLoadingDaySummary] = useState(false);
    const [studentFilter, setStudentFilter] = useState<'all' | 'pending' | 'attended'>('all');

    const toggleStudentReinforcement = (id: number) => {
        setReinforcementStudentIds((prev) =>
            prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
        );
    };

    // Initialize workstations from preferred_workstation
    useEffect(() => {
        const initialWorkstations: Record<number, string> = {};
        students.forEach((s) => {
            const preferred = s.preferred_workstation || s.pivot?.preferred_workstation;
            if (preferred) {
                initialWorkstations[s.id] = preferred;
            }
        });
        setWorkstations(initialWorkstations);
    }, [students]);

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

    const { data, setData, post, processing, errors } = useForm({
        session_date: today,
        start_time: '',
        end_time: '',
        duration_minutes: '' as number | '',
        title: '',
        notes: '',
        status: 'completed',
        topic_ids: [] as number[],
        attendances: [] as Array<{ student_id: number; workstation?: string }>,
    });

    const handleDateChange = (newDate: string) => {
        setData('session_date', newDate);
        if (!newDate) return;

        setLoadingDaySummary(true);
        fetch(`/courses/${course.id}/sessions/date-summary?date=${newDate}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((summary: DaySummary) => {
                setDaySummary(summary);
                setLoadingDaySummary(false);
            })
            .catch(() => {
                setLoadingDaySummary(false);
            });
    };

    const handleStartTimeChange = (time: string) => {
        setData((prev) => {
            const updated = { ...prev, start_time: time };
            if (time && prev.duration_minutes) {
                updated.end_time = addMinutesToTime(time, Number(prev.duration_minutes));
            } else if (time && prev.end_time) {
                const diff = diffMinutes(time, prev.end_time);
                if (diff > 0) updated.duration_minutes = diff;
            }
            return updated;
        });
    };

    const handleDurationChange = (minutes: number | '') => {
        setData((prev) => {
            const updated = { ...prev, duration_minutes: minutes };
            if (prev.start_time && minutes) {
                updated.end_time = addMinutesToTime(prev.start_time, Number(minutes));
            }
            return updated;
        });
    };

    const handleEndTimeChange = (time: string) => {
        setData((prev) => {
            const updated = { ...prev, end_time: time };
            if (prev.start_time && time) {
                const diff = diffMinutes(prev.start_time, time);
                if (diff > 0) updated.duration_minutes = diff;
            }
            return updated;
        });
    };

    const setCurrentTime = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        handleStartTimeChange(`${hours}:${minutes}`);
    };

    const toggleStudent = (id: number) => {
        setSelectedStudentIds((prev) =>
            prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
        );
    };

    const selectAllVisibleStudents = () => {
        const visibleIds = filteredStudents.map((s) => s.id);
        setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    };

    const selectOnlyPendingStudents = () => {
        const pendingIds = students
            .filter((s) => !daySummary.attended_student_ids.includes(s.id))
            .map((s) => s.id);
        setSelectedStudentIds(pendingIds);
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

    const handleSaveSession = (status: 'draft' | 'completed') => {
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

        router.post(`/courses/${course.id}/sessions`, {
            session_date: data.session_date,
            start_time: data.start_time || undefined,
            end_time: data.end_time || undefined,
            duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : undefined,
            title: data.title,
            notes: data.notes,
            status,
            topic_ids: selectedTopicIds,
            attendances,
            progress_overrides,
        });
    };

    // Filter students by attendance in the day
    const attendedCount = students.filter((s) => daySummary.attended_student_ids.includes(s.id)).length;
    const pendingCount = students.length - attendedCount;

    const filteredStudents = students.filter((s) => {
        const alreadyAttended = daySummary.attended_student_ids.includes(s.id);
        if (studentFilter === 'pending') return !alreadyAttended;
        if (studentFilter === 'attended') return alreadyAttended;
        return true;
    });

    return (
        <>
            <Head title={`Nueva Sesión - ${course.name}`} />

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
                                Iniciar Sesión de Clase — {course.name}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Session Meta Card: Date, Title, Start Time, Duration limit & End Time */}
                <div className="bg-card border p-5 rounded-xl shadow-xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="session_date" className="flex items-center gap-1.5 font-semibold">
                                <CalendarDays className="h-3.5 w-3.5 text-primary" /> Fecha de la Sesión *
                            </Label>
                            <Input
                                id="session_date"
                                type="date"
                                value={data.session_date}
                                onChange={(e) => handleDateChange(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="session_title" className="font-semibold">Título / Objetivo de la Clase</Label>
                            <Input
                                id="session_title"
                                placeholder="Ej: Práctica en laboratorio de computación - Grupo 1"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Schedule & Duration Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 border-t">
                        {/* Start Time */}
                        <div className="sm:col-span-4 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="start_time" className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Clock className="h-3.5 w-3.5 text-primary" /> Hora de Inicio
                                </Label>
                                <button
                                    type="button"
                                    onClick={setCurrentTime}
                                    className="text-[11px] text-primary hover:underline font-medium"
                                >
                                    Poner ahora
                                </button>
                            </div>
                            <Input
                                id="start_time"
                                type="time"
                                value={data.start_time}
                                onChange={(e) => handleStartTimeChange(e.target.value)}
                                className="font-mono text-sm"
                            />
                        </div>

                        {/* Duration Presets & Custom Limit */}
                        <div className="sm:col-span-4 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="duration_minutes" className="text-xs font-semibold">
                                    Límite / Duración
                                </Label>
                                {data.duration_minutes && (
                                    <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                                        {data.duration_minutes} min
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5">
                                {[30, 45, 60, 90].map((mins) => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => handleDurationChange(mins)}
                                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                                            Number(data.duration_minutes) === mins
                                                ? 'bg-primary text-primary-foreground border-primary font-semibold'
                                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                        }`}
                                    >
                                        {mins}m
                                    </button>
                                ))}
                                <div className="relative flex-1 min-w-[65px]">
                                    <Input
                                        id="duration_minutes"
                                        type="number"
                                        min="1"
                                        max="720"
                                        placeholder="Min"
                                        value={data.duration_minutes}
                                        onChange={(e) => handleDurationChange(e.target.value ? Number(e.target.value) : '')}
                                        className="text-xs h-9 font-mono pr-5"
                                    />
                                    <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground pointer-events-none">
                                        m
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* End Time */}
                        <div className="sm:col-span-4 space-y-1.5">
                            <Label htmlFor="end_time" className="flex items-center gap-1.5 text-xs font-semibold">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Hora de Fin (Estimada)
                            </Label>
                            <Input
                                id="end_time"
                                type="time"
                                value={data.end_time}
                                onChange={(e) => handleEndTimeChange(e.target.value)}
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Day Sessions Context Banner */}
                {daySummary.sessions_count > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary shrink-0" />
                            <span>
                                <strong>{daySummary.sessions_count} sesión(es)</strong> registradas en esta fecha ({daySummary.attended_student_ids.length} estudiantes ya atendidos hoy).
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {daySummary.sessions.map((ds) => (
                                <span
                                    key={ds.id}
                                    className="bg-background border rounded px-2 py-0.5 font-mono text-[11px] text-muted-foreground flex items-center gap-1"
                                    title={`${ds.student_count} alumno(s)`}
                                >
                                    <span className="font-medium text-foreground">{ds.title}</span>
                                    {ds.formatted_time_range && (
                                        <span className="text-[10px] text-primary">({ds.formatted_time_range})</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Student Selection & Workstations (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    <h3 className="font-semibold text-sm text-foreground">
                                        Alumnos en la Sesión ({selectedStudentIds.length}/{students.length})
                                    </h3>
                                    {loadingDaySummary && (
                                        <span className="text-[10px] text-muted-foreground animate-pulse">
                                            Actualizando...
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={selectAllVisibleStudents}
                                        className="text-xs h-7 px-2"
                                        title="Seleccionar todos los estudiantes visibles según el filtro actual"
                                    >
                                        Seleccionar visibles
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={clearStudents}
                                        className="text-xs h-7 px-2 text-muted-foreground"
                                    >
                                        Limpiar
                                    </Button>
                                </div>
                            </div>

                            {/* Filter Bar: Todos / Sin sesión hoy / Ya en sesión */}
                            <div className="flex items-center justify-between gap-2 border rounded-lg p-1 bg-muted/40">
                                <div className="flex items-center gap-1 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setStudentFilter('all')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                                            studentFilter === 'all'
                                                ? 'bg-background text-foreground shadow-xs font-semibold'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Todos ({students.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudentFilter('pending')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                                            studentFilter === 'pending'
                                                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                                        }`}
                                        title="Filtrar estudiantes que aún no han tenido sesión en este día"
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${studentFilter === 'pending' ? 'bg-white' : 'bg-emerald-500'}`} />
                                        Sin sesión hoy ({pendingCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudentFilter('attended')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                                            studentFilter === 'attended'
                                                ? 'bg-background text-foreground shadow-xs font-semibold'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                        title="Estudiantes que ya asistieron a otra sesión hoy"
                                    >
                                        Ya en sesión ({attendedCount})
                                    </button>
                                </div>

                                {pendingCount > 0 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={selectOnlyPendingStudents}
                                        className="text-[11px] h-6 px-2 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0"
                                    >
                                        + Seleccionar sin sesión ({pendingCount})
                                    </Button>
                                )}
                            </div>
                        </div>

                        {students.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-xs">
                                No hay estudiantes matriculados en este curso.
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-xs bg-card">
                                <Users className="mx-auto h-7 w-7 text-muted-foreground/40 mb-2" />
                                <p className="font-semibold text-foreground">
                                    {studentFilter === 'pending'
                                        ? '¡Todos los estudiantes ya tomaron sesión en este día!'
                                        : 'Ningún estudiante coincide con este filtro.'}
                                </p>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="link"
                                    onClick={() => setStudentFilter('all')}
                                    className="text-xs text-primary mt-1"
                                >
                                    Ver todos los estudiantes
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y rounded-xl border bg-card max-h-[460px] overflow-y-auto">
                                {filteredStudents.map((student) => {
                                    const isSelected = selectedStudentIds.includes(student.id);
                                    const studentSessions = daySummary.student_attendance_map[student.id] || [];
                                    const alreadyAttended = studentSessions.length > 0;

                                    return (
                                        <div
                                            key={student.id}
                                            className={`flex items-center justify-between p-3 transition-colors ${
                                                isSelected
                                                    ? 'bg-primary/5'
                                                    : alreadyAttended
                                                    ? 'bg-muted/15 hover:bg-muted/30'
                                                    : 'hover:bg-muted/30'
                                            }`}
                                        >
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleStudent(student.id)}
                                                    className="h-4 w-4 rounded text-primary border-muted-foreground"
                                                />
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-semibold text-foreground">
                                                            {student.last_name}, {student.first_name}
                                                        </span>

                                                        {/* Status Badge: already attended vs free */}
                                                        {alreadyAttended ? (
                                                            <span
                                                                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                                                title={`Ya asistió a: ${studentSessions
                                                                    .map((s) => `${s.title} (${s.formatted_time_range || 'sin hora'})`)
                                                                    .join(', ')}`}
                                                            >
                                                                <Clock className="h-3 w-3 text-amber-600" />
                                                                Ya en sesión hoy {studentSessions[0]?.start_time ? `(${studentSessions[0].start_time})` : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                Libre hoy
                                                            </span>
                                                        )}
                                                    </div>

                                                    {student.student_id_number && (
                                                        <span className="text-[10px] text-muted-foreground font-mono block">
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
                                                            className="w-20 px-2 py-1 text-[11px] font-mono border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
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

                    {/* Right Column: Live Suggestion & Topic Selection (5 cols) */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* Live Topic Suggestion Box */}
                        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4" /> Sugerencia Determinista
                                </span>
                                {loadingSuggestion && (
                                    <span className="text-[10px] text-muted-foreground animate-pulse">
                                        Analizando grupo...
                                    </span>
                                )}
                            </div>

                            {selectedStudentIds.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    Selecciona los estudiantes presentes en el aula o laboratorio para obtener la recomendación pedagógica en tiempo real.
                                </p>
                            ) : suggestion?.primary_recommendation ? (
                                <div className="space-y-2.5">
                                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-xs font-bold text-foreground">
                                                {suggestion.primary_recommendation.title}
                                            </h4>
                                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                                                {suggestion.primary_recommendation.action_type === 'advance'
                                                    ? 'Avanzar'
                                                    : suggestion.primary_recommendation.action_type === 'review_leveling'
                                                    ? 'Nivelación'
                                                    : 'Inicio'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1.5">
                                            {suggestion.primary_recommendation.rationale}
                                        </p>
                                    </div>

                                    {suggestion.primary_recommendation.course_topic_id && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            className="w-full text-xs gap-1.5"
                                            onClick={applySuggestedTopic}
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            Seleccionar este tema para la sesión
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    No hay sugerencias disponibles para la selección actual.
                                </p>
                            )}
                        </div>

                        {/* Topics Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                <h3 className="font-semibold text-sm text-foreground">
                                    Temas a Explicar ({selectedTopicIds.length})
                                </h3>
                            </div>

                            {courseTopics.length === 0 ? (
                                <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-xs">
                                    El pensum no tiene temas configurados.
                                </div>
                            ) : (
                                <div className="divide-y rounded-xl border bg-card max-h-[340px] overflow-y-auto">
                                    {courseTopics.map((topic, index) => {
                                        const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
                                        const isTopicSelected = selectedTopicIds.includes(topic.id);
                                        const subIds = hasSubtopics ? topic.subtopics!.map((s) => s.id) : [];
                                        const allSubSelected = hasSubtopics && subIds.every((id) => selectedTopicIds.includes(id));
                                        const someSubSelected = hasSubtopics && subIds.some((id) => selectedTopicIds.includes(id));
                                        const isChecked = hasSubtopics ? allSubSelected : isTopicSelected;

                                        return (
                                            <div key={topic.id} className="p-3">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        ref={(el) => {
                                                            if (el && hasSubtopics) {
                                                                el.indeterminate = Boolean(someSubSelected && !allSubSelected);
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
                                <Play className="h-4 w-4 fill-white" /> Completar y Acreditar Sesión
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
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

SessionCreate.layout = {
    breadcrumbs: [
        {
            title: 'Cursos',
            href: '/courses',
        },
        {
            title: 'Nueva Sesión',
            href: '',
        },
    ],
};
