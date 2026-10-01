import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Building2,
    Clock,
    Globe,
    GraduationCap,
    Library,
    Play,
    Plus,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

interface GlobalStats {
    totalInstitutions: number;
    activeInstitutions: number;
    totalCourses: number;
    totalStudents: number;
    totalTeachers: number;
    totalGlobalTopics: number;
}

interface InstitutionalStats {
    totalCourses: number;
    totalStudents: number;
    totalTeachers: number;
    totalSessions: number;
}

interface InstitutionData {
    id: number;
    name: string;
    code?: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
    courses_count?: number;
    students_count?: number;
    teachers_count?: number;
}

interface CourseData {
    id: number;
    name: string;
    section?: string;
    code?: string;
    students_count?: number;
    course_topics_count?: number;
    sessions_count?: number;
    academic_period?: { name: string };
    institution?: { name: string };
}

interface SessionData {
    id: number;
    session_date: string;
    title?: string;
    attendances_count: number;
    course?: { id: number; name: string };
}

interface Props {
    mode: 'global' | 'institution' | 'no_institution';
    stats: GlobalStats | InstitutionalStats;
    institution?: InstitutionData;
    institutions?: InstitutionData[];
    courses?: CourseData[];
    recentCourses?: CourseData[];
    recentSessions?: SessionData[];
}

export default function Dashboard({
    mode,
    stats,
    institution,
    institutions = [],
    courses = [],
    recentCourses = [],
    recentSessions = [],
}: Props) {
    const handleSwitchToInstitution = (id: number) => {
        router.post('/institutions/switch', {
            institution_id: id,
        });
    };

    const handleExitToGlobal = () => {
        router.post('/institutions/switch', {
            institution_id: 'global',
        });
    };

    return (
        <>
            <Head title={mode === 'global' ? 'Dashboard Global' : `${institution?.name || 'Dashboard'} - Panel`} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Mode 1: Global Platform Dashboard */}
                {mode === 'global' ? (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                        <Globe className="h-3 w-3" /> Plataforma Global
                                    </span>
                                    <span className="text-xs text-muted-foreground">Modo Super Admin</span>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Panel Central de Control
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Supervisa todas las instituciones educativas, cursos y el banco curricular global.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link href="/institutions">
                                    <Button className="gap-2">
                                        <Building2 className="h-4 w-4" /> Administrar Instituciones
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Global KPI Cards */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Instituciones</span>
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-2">
                                    {(stats as GlobalStats).totalInstitutions ?? 0}
                                </p>
                                <span className="text-[11px] text-emerald-600 font-medium">
                                    {(stats as GlobalStats).activeInstitutions ?? 0} activas en servicio
                                </span>
                            </div>

                            <div className="rounded-xl border bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Total Cursos</span>
                                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-2">
                                    {(stats as GlobalStats).totalCourses ?? 0}
                                </p>
                                <span className="text-[11px] text-muted-foreground">
                                    En todas las instituciones
                                </span>
                            </div>

                            <div className="rounded-xl border bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Estudiantes</span>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-2">
                                    {(stats as GlobalStats).totalStudents ?? 0}
                                </p>
                                <span className="text-[11px] text-muted-foreground">
                                    Matriculados globalmente
                                </span>
                            </div>

                            <div className="rounded-xl border bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Banco de Temas</span>
                                    <Library className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-2">
                                    {(stats as GlobalStats).totalGlobalTopics ?? 0}
                                </p>
                                <span className="text-[11px] text-muted-foreground">
                                    Temas didácticos disponibles
                                </span>
                            </div>
                        </div>

                        {/* Institutions List with direct Access to Tenant Panel */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">Instituciones Registradas</h2>
                                    <p className="text-xs text-muted-foreground">
                                        Selecciona una institución para acceder a su panel operativo y gestionar sus cursos y alumnos.
                                    </p>
                                </div>
                                <Link href="/institutions">
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                        <Plus className="h-3.5 w-3.5" /> Nueva Institución
                                    </Button>
                                </Link>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {institutions.map((inst) => (
                                    <div
                                        key={inst.id}
                                        className="rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                                    {inst.code || 'INST'}
                                                </span>
                                                <span className="text-[11px] text-emerald-600 font-medium">Activa</span>
                                            </div>
                                            <h3 className="text-base font-semibold text-foreground mt-3">
                                                {inst.name}
                                            </h3>

                                            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-center text-xs">
                                                <div>
                                                    <span className="font-semibold text-foreground block">
                                                        {inst.courses_count ?? 0}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">Cursos</span>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-foreground block">
                                                        {inst.students_count ?? 0}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">Alumnos</span>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-foreground block">
                                                        {inst.teachers_count ?? 0}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">Docentes</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-3 border-t">
                                            <Button
                                                onClick={() => handleSwitchToInstitution(inst.id)}
                                                className="w-full gap-2 text-xs"
                                                variant="secondary"
                                            >
                                                Acceder al Panel Institucional <ArrowRight className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    /* Mode 2: Institutional Dashboard */
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        <Building2 className="h-3 w-3" /> Panel Institucional
                                    </span>
                                    {institution?.code && (
                                        <span className="text-xs font-mono text-muted-foreground">
                                            • {institution.code}
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {institution?.name}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Supervisa las asignaturas, estudiantes y sesiones de clase correspondientes a este centro.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleExitToGlobal}
                                    className="gap-2 text-xs"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Salir a Plataforma Global
                                </Button>
                                <Link href="/courses">
                                    <Button className="gap-2 text-xs">
                                        <GraduationCap className="h-4 w-4" /> Ver Cursos
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Institutional KPIs */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Cursos Activos</span>
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-2">
                                    {(stats as InstitutionalStats).totalCourses ?? 0}
                                </p>
                                <span className="text-[11px] text-muted-foreground">En este centro educativo</span>
                            </div>

                            <div className="rounded-xl border bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Alumnos</span>
                                    <Users className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-2">
                                    {(stats as InstitutionalStats).totalStudents ?? 0}
                                </p>
                                <span className="text-[11px] text-muted-foreground">Matriculados formalmente</span>
                            </div>

                            <div className="rounded-xl border bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Equipo Docente</span>
                                    <Users className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-2">
                                    {(stats as InstitutionalStats).totalTeachers ?? 0}
                                </p>
                                <span className="text-[11px] text-muted-foreground">Profesores habilitados</span>
                            </div>

                            <div className="rounded-xl border bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Sesiones Dictadas</span>
                                    <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-2xl font-bold text-foreground mt-2">
                                    {(stats as InstitutionalStats).totalSessions ?? 0}
                                </p>
                                <span className="text-[11px] text-muted-foreground">Laboratorios registrados</span>
                            </div>
                        </div>

                        {/* Courses Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">Cursos de la Institución</h2>
                                    <p className="text-xs text-muted-foreground">
                                        Listado de cursos creados en {institution?.name}.
                                    </p>
                                </div>
                                <Link href="/courses">
                                    <Button size="sm" className="gap-1.5 text-xs">
                                        <Plus className="h-3.5 w-3.5" /> Administrar Cursos
                                    </Button>
                                </Link>
                            </div>

                            {courses.length === 0 ? (
                                <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                                    <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                                    <p className="font-medium">No hay cursos registrados en esta institución.</p>
                                    <Link href="/courses">
                                        <Button size="sm" variant="outline" className="mt-4 gap-1.5 text-xs">
                                            <Plus className="h-3.5 w-3.5" /> Crear Primer Curso
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {courses.map((course) => (
                                        <div
                                            key={course.id}
                                            className="rounded-xl border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>{course.academic_period?.name || 'Sin período'}</span>
                                                    {course.section && <span className="font-mono">Sec: {course.section}</span>}
                                                </div>
                                                <h3 className="text-base font-bold text-foreground mt-2">
                                                    {course.name}
                                                </h3>

                                                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t text-center text-xs">
                                                    <div>
                                                        <span className="font-semibold text-foreground block">
                                                            {course.students_count ?? 0}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">Alumnos</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-foreground block">
                                                            {course.course_topics_count ?? 0}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">Temas</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-foreground block">
                                                            {course.sessions_count ?? 0}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">Sesiones</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 pt-3 border-t flex items-center gap-2">
                                                <Link href={`/courses/${course.id}`} className="flex-1">
                                                    <Button variant="secondary" size="sm" className="w-full text-xs gap-1.5">
                                                        Gestionar <ArrowRight className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/courses/${course.id}/sessions/create`}>
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5" title="Iniciar Clase">
                                                        <Play className="h-3.5 w-3.5 fill-white" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
