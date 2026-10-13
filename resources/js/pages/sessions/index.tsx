import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    History,
    Search,
    Filter,
    Plus,
    CalendarDays,
    BookOpen,
    Users,
    Computer,
    Pencil,
    Trash2,
    CheckCircle2,
    Clock,
    Ban,
    ArrowUpDown,
    GraduationCap,
    Sparkles,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatNaturalDateWithDay } from '@/lib/formatters';

interface SessionStudent {
    id: number;
    first_name: string;
    last_name: string;
    student_id_number?: string;
}

interface SessionAttendanceItem {
    id: number;
    student_id: number;
    workstation?: string;
    notes?: string;
    student?: SessionStudent;
}

interface SessionTopicItem {
    id: number;
    course_id: number;
    title: string;
    unit_title?: string;
}

interface ClassSessionItem {
    id: number;
    course_id: number;
    created_by_user_id: number;
    session_date: string;
    title?: string;
    notes?: string;
    status: 'draft' | 'completed' | 'cancelled';
    course: {
        id: number;
        name: string;
        section?: string;
        code?: string;
        institution_id: number;
        institution?: { id: number; name: string };
        academicPeriod?: { id: number; name: string };
    };
    createdBy?: { id: number; name: string };
    topics: SessionTopicItem[];
    attendances: SessionAttendanceItem[];
}

interface CourseOption {
    id: number;
    name: string;
    section?: string;
    code?: string;
}

interface Props {
    sessions: ClassSessionItem[];
    courses: CourseOption[];
    filters: {
        search: string;
        course_id: string;
        status: string;
        direction: 'asc' | 'desc';
    };
}

export default function SessionsIndex({ sessions, courses, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedCourse, setSelectedCourse] = useState(filters.course_id || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(filters.direction || 'desc');
    const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

    const handleApplyFilters = (newOverrides: Partial<typeof filters> = {}) => {
        router.get(
            '/sessions',
            {
                search: newOverrides.search !== undefined ? newOverrides.search : search,
                course_id: newOverrides.course_id !== undefined ? newOverrides.course_id : selectedCourse,
                status: newOverrides.status !== undefined ? newOverrides.status : selectedStatus,
                direction: newOverrides.direction !== undefined ? newOverrides.direction : sortDirection,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleApplyFilters();
    };

    const handleToggleSortDirection = () => {
        const nextDir = sortDirection === 'desc' ? 'asc' : 'desc';
        setSortDirection(nextDir);
        handleApplyFilters({ direction: nextDir });
    };

    const handleStatusChange = (sessionId: number, newStatus: string) => {
        setUpdatingStatusId(sessionId);
        router.patch(
            `/sessions/${sessionId}/status`,
            { status: newStatus },
            {
                preserveScroll: true,
                onFinish: () => setUpdatingStatusId(null),
            }
        );
    };

    const handleDeleteSession = (session: ClassSessionItem) => {
        const title = session.title ? `"${session.title}"` : `la sesión #${session.id}`;
        if (
            confirm(
                `¿Estás seguro de eliminar ${title} de ${session.course.name}?\n\nEsta acción eliminará el registro de asistencia y la acreditación de esta fecha.`
            )
        ) {
            router.delete(`/sessions/${session.id}`, {
                preserveScroll: true,
            });
        }
    };

    // Calculate metrics
    const totalSessions = sessions.length;
    const completedCount = sessions.filter((s) => s.status === 'completed').length;
    const draftCount = sessions.filter((s) => s.status === 'draft').length;
    const totalAttendances = sessions.reduce((acc, s) => acc + (s.attendances?.length || 0), 0);

    return (
        <>
            <Head title="Historial de Sesiones - H2O Teaching System" />

            <div className="flex flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <History className="h-5 w-5 text-primary" />
                            <h1 className="text-xl font-bold text-foreground">Registro de Sesiones de Clase</h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Historial cronológico de clases dictadas, asistencia de estudiantes y temas acreditados en los cursos.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {courses.length === 1 && (
                            <Link href={`/courses/${courses[0].id}/sessions/create`}>
                                <Button size="sm" className="gap-2">
                                    <Plus className="h-4 w-4" /> Iniciar Sesión
                                </Button>
                            </Link>
                        )}
                        {courses.length > 1 && (
                            <Link href="/courses">
                                <Button size="sm" variant="outline" className="gap-2">
                                    <GraduationCap className="h-4 w-4" /> Ver Cursos
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl border bg-card p-4 shadow-xs">
                        <span className="text-xs font-medium text-muted-foreground block">Total Sesiones</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-foreground">{totalSessions}</span>
                            <span className="text-xs text-muted-foreground">registradas</span>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-xs">
                        <span className="text-xs font-medium text-muted-foreground block">Completadas</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</span>
                            <span className="text-xs text-muted-foreground">acreditadas</span>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-xs">
                        <span className="text-xs font-medium text-muted-foreground block">En Borrador</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{draftCount}</span>
                            <span className="text-xs text-muted-foreground">pendientes</span>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-xs">
                        <span className="text-xs font-medium text-muted-foreground block">Asistencias Totales</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-primary">{totalAttendances}</span>
                            <span className="text-xs text-muted-foreground">alumnos</span>
                        </div>
                    </div>
                </div>

                {/* Filters & Search Toolbar */}
                <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-xl border">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por título, tema, curso, notas o nombre del alumno..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {courses.length > 0 && (
                            <select
                                value={selectedCourse}
                                onChange={(e) => {
                                    setSelectedCourse(e.target.value);
                                    handleApplyFilters({ course_id: e.target.value });
                                }}
                                className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">Todos los Cursos</option>
                                {courses.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.section ? `(${c.section})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}

                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                handleApplyFilters({ status: e.target.value });
                            }}
                            className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="">Todos los Estados</option>
                            <option value="completed">Completadas</option>
                            <option value="draft">Borradores</option>
                            <option value="cancelled">Canceladas</option>
                        </select>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 text-xs"
                            onClick={handleToggleSortDirection}
                            title={`Cambiar orden cronológico (actualmente ${sortDirection === 'desc' ? 'más recientes primero' : 'más antiguas primero'})`}
                        >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                            <span>{sortDirection === 'desc' ? 'Más recientes' : 'Más antiguas'}</span>
                        </Button>

                        {(search || selectedCourse || selectedStatus) && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    setSearch('');
                                    setSelectedCourse('');
                                    setSelectedStatus('');
                                    router.get('/sessions');
                                }}
                            >
                                Limpiar Filtros
                            </Button>
                        )}
                    </div>
                </form>

                {/* Sessions List in Execution Order */}
                {sessions.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground bg-card">
                        <History className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                        <h3 className="text-sm font-semibold text-foreground">No se encontraron sesiones de clase</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            {search || selectedCourse || selectedStatus
                                ? 'No hay sesiones que coincidan con los filtros aplicados. Intenta restablecer los filtros de búsqueda.'
                                : 'Aún no se han impartido sesiones en tus cursos. Puedes iniciar una nueva sesión desde la pestaña de cursos.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => {
                            const isUpdatingStatus = updatingStatusId === session.id;

                            return (
                                <div
                                    key={session.id}
                                    className="rounded-xl border bg-card p-5 shadow-xs hover:border-primary/40 transition-colors space-y-4"
                                >
                                    {/* Header Row: Course, Date, Status & Actions */}
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-3.5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link
                                                    href={`/courses/${session.course.id}`}
                                                    className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                                                >
                                                    <GraduationCap className="h-4 w-4 text-primary" />
                                                    <span>{session.course.name}</span>
                                                    {session.course.section && (
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            ({session.course.section})
                                                        </span>
                                                    )}
                                                </Link>

                                                {session.course.academicPeriod && (
                                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                                        {session.course.academicPeriod.name}
                                                    </Badge>
                                                )}

                                                <span className="text-xs text-muted-foreground">•</span>

                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                                                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                                    {formatNaturalDateWithDay(session.session_date)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-semibold text-foreground">
                                                    {session.title || 'Sesión de Clase'}
                                                </span>
                                                {session.createdBy && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Docente: {session.createdBy.name}</span>
                                                    </>
                                                )}
                                            </div>

                                            {session.notes && (
                                                <p className="text-xs text-muted-foreground/90 italic pt-0.5">
                                                    "{session.notes}"
                                                </p>
                                            )}
                                        </div>

                                        {/* Status Switcher & Action Buttons */}
                                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                            {/* Quick Status Selector */}
                                            <select
                                                value={session.status}
                                                disabled={isUpdatingStatus}
                                                onChange={(e) => handleStatusChange(session.id, e.target.value)}
                                                className={`h-7 rounded-md text-[11px] font-semibold px-2 py-0 cursor-pointer border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                                                    session.status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                        : session.status === 'draft'
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                                        : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                                }`}
                                            >
                                                <option value="completed">Completada</option>
                                                <option value="draft">Borrador</option>
                                                <option value="cancelled">Cancelada</option>
                                            </select>

                                            {/* Edit Button */}
                                            <Link href={`/courses/${session.course.id}/sessions/${session.id}/edit`}>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                                                    title="Editar detalles y asistencia de esta sesión"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" /> Editar
                                                </Button>
                                            </Link>

                                            {/* Delete Button */}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteSession(session)}
                                                title="Eliminar sesión de clase"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Middle: Topics Covered */}
                                    {session.topics && session.topics.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                                <span>Temas Impartidos ({session.topics.length}):</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {session.topics.map((topic) => (
                                                    <span
                                                        key={topic.id}
                                                        className="inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-md bg-muted text-foreground border"
                                                    >
                                                        {topic.title}
                                                        {topic.unit_title && (
                                                            <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                                                                [{topic.unit_title}]
                                                            </span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom: Students Who Attended */}
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                <Users className="h-3.5 w-3.5 text-primary" />
                                                <span>Estudiantes Asistentes ({session.attendances?.length || 0}):</span>
                                            </div>
                                        </div>

                                        {session.attendances && session.attendances.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {session.attendances.map((att) => {
                                                    const studentName = att.student
                                                        ? `${att.student.first_name} ${att.student.last_name}`
                                                        : `Estudiante #${att.student_id}`;

                                                    return (
                                                        <span
                                                            key={att.id}
                                                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-secondary/80 text-secondary-foreground border"
                                                        >
                                                            <span>{studentName}</span>
                                                            {att.workstation && (
                                                                <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground bg-background px-1 rounded border ml-0.5">
                                                                    <Computer className="h-2.5 w-2.5" />
                                                                    {att.workstation}
                                                                </span>
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">
                                                No se registraron alumnos asistentes en esta sesión.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

SessionsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Sesiones de Clase',
            href: '/sessions',
        },
    ],
};
