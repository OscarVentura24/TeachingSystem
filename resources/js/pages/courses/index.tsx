import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, GraduationCap, Users, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface Institution {
    id: number;
    name: string;
}

interface AcademicPeriod {
    id: number;
    name: string;
}

interface CourseItem {
    id: number;
    name: string;
    section?: string;
    code?: string;
    description?: string;
    color?: string;
    status: string;
    institution: Institution;
    academic_period?: AcademicPeriod;
    students_count: number;
    course_topics_count: number;
    sessions_count: number;
}

interface Props {
    courses: CourseItem[];
    institutions: Institution[];
    academicPeriods: AcademicPeriod[];
}

export default function CoursesIndex({ courses, institutions, academicPeriods }: Props) {
    const [openDialog, setOpenDialog] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        section: '',
        code: '',
        institution_id: institutions[0]?.id || '',
        academic_period_id: academicPeriods[0]?.id || '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/courses', {
            onSuccess: () => {
                setOpenDialog(false);
                reset();
            },
        });
    };

    return (
        <>
            <Head title="Cursos" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Cursos</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona tus asignaturas, pensums y supervisa el progreso de los estudiantes.
                        </p>
                    </div>

                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Nuevo Curso
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Crear Nuevo Curso</DialogTitle>
                                <DialogDescription>
                                    Define la asignatura, sección e institución para comenzar.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name">Nombre del Curso *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej: Programación I"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                    />
                                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="section">Sección / Turno</Label>
                                        <Input
                                            id="section"
                                            placeholder="Ej: Sección A"
                                            value={data.section}
                                            onChange={(e) => setData('section', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="code">Código Asignatura</Label>
                                        <Input
                                            id="code"
                                            placeholder="Ej: PROG-101"
                                            value={data.code}
                                            onChange={(e) => setData('code', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="institution_id">Institución *</Label>
                                    <select
                                        id="institution_id"
                                        value={data.institution_id}
                                        onChange={(e) => setData('institution_id', e.target.value)}
                                        className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        required
                                    >
                                        {institutions.map((inst) => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.institution_id && <p className="text-xs text-destructive">{errors.institution_id}</p>}
                                </div>

                                {academicPeriods.length > 0 && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="academic_period_id">Período Académico</Label>
                                        <select
                                            id="academic_period_id"
                                            value={data.academic_period_id}
                                            onChange={(e) => setData('academic_period_id', e.target.value)}
                                            className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="">Sin período específico</option>
                                            {academicPeriods.map((period) => (
                                                <option key={period.id} value={period.id}>
                                                    {period.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="description">Descripción / Observaciones</Label>
                                    <Input
                                        id="description"
                                        placeholder="Breve resumen del curso"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Guardar Curso
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {courses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-12 text-center">
                        <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold text-foreground">Aún no tienes cursos creados</h3>
                        <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                            Comienza creando tu primer curso para armar el temario y matricular a tus estudiantes.
                        </p>
                        <Button className="mt-6 gap-2" onClick={() => setOpenDialog(true)}>
                            <Plus className="h-4 w-4" /> Crear Primer Curso
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                            {course.institution?.name}
                                        </span>
                                        {course.academic_period && (
                                            <span className="text-xs text-muted-foreground">
                                                {course.academic_period.name}
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="mt-3 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                        {course.name}
                                    </h2>
                                    {course.section && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Sección: {course.section} {course.code && `(${course.code})`}
                                        </p>
                                    )}

                                    {course.description && (
                                        <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                                            {course.description}
                                        </p>
                                    )}

                                    <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-4 text-center">
                                        <div>
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                                <Users className="h-3.5 w-3.5" />
                                                <span className="text-xs font-semibold text-foreground">{course.students_count}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Alumnos</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                                <BookOpen className="h-3.5 w-3.5" />
                                                <span className="text-xs font-semibold text-foreground">{course.course_topics_count}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Temas</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span className="text-xs font-semibold text-foreground">{course.sessions_count}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Sesiones</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 border-t pt-4">
                                    <Link
                                        href={`/courses/${course.id}`}
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                    >
                                        Gestionar Curso <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

CoursesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Cursos',
            href: '/courses',
        },
    ],
};
