import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    Plus,
    GraduationCap,
    Users,
    BookOpen,
    Clock,
    ArrowRight,
    Calendar,
    Building2,
    Pencil,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
    academic_period_id?: number;
    students_count: number;
    course_topics_count: number;
    sessions_count: number;
}

interface Props {
    courses: CourseItem[];
    institutions: Institution[];
    academicPeriods: AcademicPeriod[];
    activeInstitution?: { id: number; name: string } | null;
}

export default function CoursesIndex({ courses, institutions, academicPeriods, activeInstitution }: Props) {
    const [openDialog, setOpenDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
    const [openPeriodDialog, setOpenPeriodDialog] = useState(false);

    const defaultInstId = activeInstitution?.id || institutions[0]?.id || '';

    const createForm = useForm({
        name: '',
        section: '',
        code: '',
        institution_id: defaultInstId,
        academic_period_id: academicPeriods[0]?.id || '',
        description: '',
    });

    const editForm = useForm({
        name: '',
        section: '',
        code: '',
        academic_period_id: '' as string | number,
        description: '',
    });

    const periodForm = useForm({
        institution_id: defaultInstId,
        name: '',
        start_date: '',
        end_date: '',
        is_current: true,
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/courses', {
            onSuccess: () => {
                setOpenDialog(false);
                createForm.reset();
            },
        });
    };

    const handleStartEditCourse = (course: CourseItem) => {
        setEditingCourse(course);
        editForm.setData({
            name: course.name,
            section: course.section || '',
            code: course.code || '',
            academic_period_id: course.academic_period?.id || course.academic_period_id || '',
            description: course.description || '',
        });
        setOpenEditDialog(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourse) return;

        editForm.put(`/courses/${editingCourse.id}`, {
            onSuccess: () => {
                setOpenEditDialog(false);
                setEditingCourse(null);
                editForm.reset();
            },
        });
    };

    const handleDeleteCourse = (course: CourseItem) => {
        if (
            confirm(
                `¿Estás seguro de eliminar el curso "${course.name}"?\n\nEsta acción eliminará el curso, su pensum y las sesiones registradas de forma irreversible.`
            )
        ) {
            router.delete(`/courses/${course.id}`);
        }
    };

    const handleCreatePeriodSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        periodForm.post('/academic-periods', {
            onSuccess: () => {
                setOpenPeriodDialog(false);
                periodForm.reset();
            },
        });
    };

    const institutionOptions = institutions.map((inst) => ({
        value: inst.id,
        label: inst.name,
    }));

    const periodOptions = [
        { value: '', label: 'Sin período específico' },
        ...academicPeriods.map((p) => ({
            value: p.id,
            label: p.name,
        })),
    ];

    return (
        <>
            <Head title="Cursos" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            Cursos
                            {activeInstitution && (
                                <span className="text-base font-normal text-muted-foreground">
                                    • {activeInstitution.name}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {activeInstitution
                                ? `Gestiona los cursos y materias de ${activeInstitution.name}.`
                                : 'Gestiona tus asignaturas, pensums y supervisa el progreso de los estudiantes.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Quick create academic period button */}
                        <Dialog open={openPeriodDialog} onOpenChange={setOpenPeriodDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Calendar className="h-4 w-4" /> Nuevo Período
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Crear Período Académico</DialogTitle>
                                    <DialogDescription>
                                        Define un nuevo ciclo o semestre (ej. 2026-II, Verano 2026).
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleCreatePeriodSubmit} className="space-y-4 pt-2">
                                    {activeInstitution ? (
                                        <div className="bg-primary/5 border border-primary/20 rounded-md p-2.5 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                <span className="font-medium text-foreground">{activeInstitution.name}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Institución Activa</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="period_institution">Institución *</Label>
                                            <SearchableSelect
                                                options={institutionOptions}
                                                value={periodForm.data.institution_id}
                                                onChange={(val) => periodForm.setData('institution_id', val)}
                                                placeholder="Seleccionar institución..."
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label htmlFor="period_name">Nombre del Período *</Label>
                                        <Input
                                            id="period_name"
                                            placeholder="Ej: 2026-II o Semestre 2026-B"
                                            value={periodForm.data.name}
                                            onChange={(e) => periodForm.setData('name', e.target.value)}
                                            required
                                        />
                                        {periodForm.errors.name && (
                                            <p className="text-xs text-destructive">{periodForm.errors.name}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="start_date">Fecha Inicio</Label>
                                            <Input
                                                id="start_date"
                                                type="date"
                                                value={periodForm.data.start_date}
                                                onChange={(e) => periodForm.setData('start_date', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="end_date">Fecha Fin</Label>
                                            <Input
                                                id="end_date"
                                                type="date"
                                                value={periodForm.data.end_date}
                                                onChange={(e) => periodForm.setData('end_date', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setOpenPeriodDialog(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={periodForm.processing}>
                                            Guardar Período
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Create Course Dialog */}
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

                                <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name">Nombre del Curso *</Label>
                                        <Input
                                            id="name"
                                            placeholder="Ej: Programación I"
                                            value={createForm.data.name}
                                            onChange={(e) => createForm.setData('name', e.target.value)}
                                            required
                                        />
                                        {createForm.errors.name && <p className="text-xs text-destructive">{createForm.errors.name}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="section">Sección / Turno</Label>
                                            <Input
                                                id="section"
                                                placeholder="Ej: Sección A"
                                                value={createForm.data.section}
                                                onChange={(e) => createForm.setData('section', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="code">Código Asignatura</Label>
                                            <Input
                                                id="code"
                                                placeholder="Ej: PROG-101"
                                                value={createForm.data.code}
                                                onChange={(e) => createForm.setData('code', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Institution Searchable Select or Active Institution Badge */}
                                    {activeInstitution ? (
                                        <div className="bg-primary/5 border border-primary/20 rounded-md p-2.5 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                <span className="font-medium text-foreground">{activeInstitution.name}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Institución Activa</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <Label>Institución *</Label>
                                            <SearchableSelect
                                                options={institutionOptions}
                                                value={createForm.data.institution_id}
                                                onChange={(val) => createForm.setData('institution_id', val)}
                                                placeholder="Buscar institución..."
                                                required
                                            />
                                            {createForm.errors.institution_id && (
                                                <p className="text-xs text-destructive">{createForm.errors.institution_id}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Academic Period Searchable Select with quick add */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label>Período Académico</Label>
                                            <button
                                                type="button"
                                                onClick={() => setOpenPeriodDialog(true)}
                                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                            >
                                                <Plus className="h-2.5 w-2.5" /> Nuevo Período
                                            </button>
                                        </div>
                                        <SearchableSelect
                                            options={periodOptions}
                                            value={createForm.data.academic_period_id}
                                            onChange={(val) => createForm.setData('academic_period_id', val)}
                                            placeholder="Buscar período académico..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="description">Descripción / Observaciones</Label>
                                        <Input
                                            id="description"
                                            placeholder="Breve resumen del curso"
                                            value={createForm.data.description}
                                            onChange={(e) => createForm.setData('description', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setOpenDialog(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={createForm.processing}>
                                            Guardar Curso
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Edit Course Dialog */}
                        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Editar Curso</DialogTitle>
                                    <DialogDescription>
                                        Modifica el nombre, sección, código o período del curso.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit_course_name">Nombre del Curso *</Label>
                                        <Input
                                            id="edit_course_name"
                                            value={editForm.data.name}
                                            onChange={(e) => editForm.setData('name', e.target.value)}
                                            required
                                        />
                                        {editForm.errors.name && (
                                            <p className="text-xs text-destructive">{editForm.errors.name}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_course_section">Sección / Turno</Label>
                                            <Input
                                                id="edit_course_section"
                                                value={editForm.data.section}
                                                onChange={(e) => editForm.setData('section', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_course_code">Código Asignatura</Label>
                                            <Input
                                                id="edit_course_code"
                                                value={editForm.data.code}
                                                onChange={(e) => editForm.setData('code', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Período Académico</Label>
                                        <SearchableSelect
                                            options={periodOptions}
                                            value={editForm.data.academic_period_id}
                                            onChange={(val) => editForm.setData('academic_period_id', val)}
                                            placeholder="Buscar período académico..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit_course_description">Descripción / Observaciones</Label>
                                        <Input
                                            id="edit_course_description"
                                            value={editForm.data.description}
                                            onChange={(e) => editForm.setData('description', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setOpenEditDialog(false);
                                                setEditingCourse(null);
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={editForm.processing}>
                                            {editForm.processing ? 'Actualizando...' : 'Guardar Cambios'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
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
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                {course.institution?.name}
                                            </span>
                                            {course.academic_period && (
                                                <span className="text-xs text-muted-foreground">
                                                    • {course.academic_period.name}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                onClick={() => handleStartEditCourse(course)}
                                                title="Editar Curso"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteCourse(course)}
                                                title="Eliminar Curso"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
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
