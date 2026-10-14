import React, { useState, useMemo } from 'react';
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
    Search,
    ListFilter,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCw,
    Lock,
    Unlock,
    Sparkles,
    AlertCircle,
    Archive,
    CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { AcademicPeriodRolloverDialog } from '@/components/academic-period-rollover-dialog';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatNaturalDate } from '@/lib/formatters';

interface Institution {
    id: number;
    name: string;
}

interface AcademicPeriod {
    id: number;
    name: string;
    is_current?: boolean;
    is_closed?: boolean;
    closed_at?: string;
    start_date?: string;
    end_date?: string;
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
    selectedPeriodId?: string;
    isInstitutionAdmin?: boolean;
}

type CourseSortField = 'name' | 'period' | 'students' | 'topics' | 'sessions' | 'institution';
type CourseSortDirection = 'asc' | 'desc';

export default function CoursesIndex({
    courses,
    institutions,
    academicPeriods,
    activeInstitution,
    selectedPeriodId = 'all',
    isInstitutionAdmin = false,
}: Props) {
    const [openDialog, setOpenDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
    const [openPeriodDialog, setOpenPeriodDialog] = useState(false);
    const [openManagePeriodsDialog, setOpenManagePeriodsDialog] = useState(false);
    const [openEditPeriodDialog, setOpenEditPeriodDialog] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<AcademicPeriod | null>(null);
    const [openRolloverDialog, setOpenRolloverDialog] = useState(false);
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    // Search & Multi-factor sorting state
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<CourseSortField>('name');
    const [sortDirection, setSortDirection] = useState<CourseSortDirection>('asc');

    const handlePeriodChange = (periodId: string) => {
        router.get(
            '/courses',
            { academic_period_id: periodId },
            { preserveState: true, preserveScroll: true }
        );
    };

    const activeSelectedPeriod = useMemo(() => {
        if (!selectedPeriodId || selectedPeriodId === 'all') {
            return null;
        }
        return academicPeriods.find((p) => p.id.toString() === selectedPeriodId.toString()) || null;
    }, [academicPeriods, selectedPeriodId]);

    const currentPeriodInSystem = useMemo(() => {
        return academicPeriods.find((p) => p.is_current) || null;
    }, [academicPeriods]);

    const handleClosePeriod = (period: AcademicPeriod) => {
        confirm({
            title: `¿Cerrar el período "${period.name}"?`,
            description: 'Al cerrarlo, sus cursos se archivarán en modo histórico de solo lectura, protegiendo las notas, asistencias y evaluaciones de alteraciones accidentales.',
            confirmText: 'Cerrar Período',
            variant: 'warning',
            onConfirm: () => router.post(`/academic-periods/${period.id}/close`),
        });
    };

    const handleReopenPeriod = (period: AcademicPeriod) => {
        confirm({
            title: `¿Reactivar el período "${period.name}"?`,
            description: 'Los cursos volverán a estar activos para registrar y modificar sesiones de clase.',
            confirmText: 'Reactivar Período',
            variant: 'primary',
            onConfirm: () => router.post(`/academic-periods/${period.id}/reopen`),
        });
    };

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

    const editPeriodForm = useForm({
        name: '',
        start_date: '',
        end_date: '',
        is_current: false,
    });

    const handleStartEditPeriod = (period: AcademicPeriod) => {
        setEditingPeriod(period);
        const extractDatePart = (d?: string | null) => {
            if (!d) return '';
            return d.includes('T') ? d.split('T')[0] : d;
        };
        editPeriodForm.setData({
            name: period.name,
            start_date: extractDatePart(period.start_date),
            end_date: extractDatePart(period.end_date),
            is_current: Boolean(period.is_current),
        });
        setOpenEditPeriodDialog(true);
    };

    const handleEditPeriodSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPeriod) return;

        editPeriodForm.put(`/academic-periods/${editingPeriod.id}`, {
            onSuccess: () => {
                setOpenEditPeriodDialog(false);
                setEditingPeriod(null);
                editPeriodForm.reset();
            },
        });
    };

    const handleDeletePeriod = (period: AcademicPeriod) => {
        confirm({
            title: `¿Eliminar el período "${period.name}"?`,
            description: 'Se desvinculará este período de los cursos correspondientes. Esta acción no se puede deshacer.',
            confirmText: 'Eliminar Período',
            variant: 'destructive',
            onConfirm: () => router.delete(`/academic-periods/${period.id}`),
        });
    };

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
        confirm({
            title: `¿Eliminar el curso "${course.name}"?`,
            description: 'Esta acción eliminará el curso, su pensum y las sesiones registradas de forma irreversible.',
            confirmText: 'Eliminar Curso',
            variant: 'destructive',
            onConfirm: () => router.delete(`/courses/${course.id}`),
        });
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

    const handleSortDropdownChange = (val: string) => {
        const parts = val.split('_');
        const dir = parts.pop() as CourseSortDirection;
        const field = parts.join('_') as CourseSortField;
        if (field && dir) {
            setSortField(field);
            setSortDirection(dir);
        }
    };

    const filteredAndSortedCourses = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = courses.filter((c) => {
            if (!query) return true;
            return (
                c.name.toLowerCase().includes(query) ||
                (c.section && c.section.toLowerCase().includes(query)) ||
                (c.code && c.code.toLowerCase().includes(query)) ||
                (c.description && c.description.toLowerCase().includes(query)) ||
                (c.institution && c.institution.name.toLowerCase().includes(query)) ||
                (c.academic_period && c.academic_period.name.toLowerCase().includes(query))
            );
        });

        return [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
                    break;
                case 'period': {
                    const periodA = a.academic_period?.name || '';
                    const periodB = b.academic_period?.name || '';
                    comparison = periodA.localeCompare(periodB, 'es', { sensitivity: 'base' });
                    break;
                }
                case 'students':
                    comparison = (a.students_count || 0) - (b.students_count || 0);
                    break;
                case 'topics':
                    comparison = (a.course_topics_count || 0) - (b.course_topics_count || 0);
                    break;
                case 'sessions':
                    comparison = (a.sessions_count || 0) - (b.sessions_count || 0);
                    break;
                case 'institution': {
                    const instA = a.institution?.name || '';
                    const instB = b.institution?.name || '';
                    comparison = instA.localeCompare(instB, 'es', { sensitivity: 'base' });
                    break;
                }
                default:
                    comparison = 0;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [courses, search, sortField, sortDirection]);

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

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Rollover / Academic Period Transition Wizard */}
                        {isInstitutionAdmin && (
                            <Button
                                variant="outline"
                                className="gap-2 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                onClick={() => setOpenRolloverDialog(true)}
                            >
                                <Sparkles className="h-4 w-4" /> Transición de Período
                            </Button>
                        )}

                        {/* Manage Academic Periods modal trigger */}
                        {isInstitutionAdmin && (
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => setOpenManagePeriodsDialog(true)}
                            >
                                <CalendarDays className="h-4 w-4" /> Gestionar Períodos
                            </Button>
                        )}

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
                                        Define un nuevo ciclo o año escolar (ej. 2026-2027, 2026-I, Verano 2026).
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
                                            autoFocus
                                            placeholder="Ej: 2026-2027 o Año Escolar 2026-2027"
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
                                            autoFocus
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
                                            autoFocus
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

                {/* Academic Period Switcher & Filter */}
                {academicPeriods.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-xl border">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> Período:
                            </span>
                            <button
                                type="button"
                                onClick={() => handlePeriodChange('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    selectedPeriodId === 'all'
                                        ? 'bg-background shadow-xs text-foreground font-semibold border'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                            >
                                Todos los períodos
                            </button>
                            {academicPeriods.map((period) => {
                                const isSelected = selectedPeriodId === period.id.toString();
                                return (
                                    <button
                                        key={period.id}
                                        type="button"
                                        onClick={() => handlePeriodChange(period.id.toString())}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            isSelected
                                                ? 'bg-background shadow-xs text-foreground font-semibold border border-primary/30'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                        }`}
                                    >
                                        {period.name}
                                        {period.is_current && (
                                            <span className="inline-flex items-center text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded-full">
                                                Actual
                                            </span>
                                        )}
                                        {period.is_closed && (
                                            <span className="inline-flex items-center text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded-full gap-0.5">
                                                <Lock className="h-2.5 w-2.5" /> Cerrado
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Administrative actions for the actively selected period */}
                        {activeSelectedPeriod && isInstitutionAdmin && (
                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleStartEditPeriod(activeSelectedPeriod)}
                                    title="Editar nombre, fechas o estado de este período"
                                >
                                    <Pencil className="h-3 w-3 mr-1" /> Editar
                                </Button>

                                {activeSelectedPeriod.is_closed ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-amber-500/30 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                        onClick={() => handleReopenPeriod(activeSelectedPeriod)}
                                    >
                                        <Unlock className="h-3 w-3 mr-1" /> Reabrir
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => handleClosePeriod(activeSelectedPeriod)}
                                    >
                                        <Lock className="h-3 w-3 mr-1" /> Cerrar
                                    </Button>
                                )}

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeletePeriod(activeSelectedPeriod)}
                                    title="Eliminar este período"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Banner when viewing a closed academic period */}
                {activeSelectedPeriod?.is_closed && (
                    <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-lg text-xs">
                        <div className="flex items-center gap-2.5">
                            <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <span className="font-semibold">Período cerrado ({activeSelectedPeriod.name}):</span> Modo histórico de solo lectura. Todas las calificaciones, asistencias y registros de este ciclo escolar se encuentran resguardados y protegidos de alteraciones accidentales.
                            </div>
                        </div>
                        {isInstitutionAdmin && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/10 shrink-0"
                                onClick={() => handleReopenPeriod(activeSelectedPeriod)}
                            >
                                <Unlock className="h-3 w-3 mr-1" /> Reabrir
                            </Button>
                        )}
                    </div>
                )}

                {/* Filters & Sorting */}
                {courses.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                autoFocus
                                placeholder="Buscar curso por nombre, sección o código..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                            <div className="flex items-center gap-1.5">
                                <ListFilter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">Ordenar por:</span>
                                <select
                                    value={`${sortField}_${sortDirection}`}
                                    onChange={(e) => handleSortDropdownChange(e.target.value)}
                                    className="h-8 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="name_asc">Nombre (A → Z)</option>
                                    <option value="name_desc">Nombre (Z → A)</option>
                                    <option value="period_asc">Período Académico (A → Z)</option>
                                    <option value="period_desc">Período Académico (Z → A)</option>
                                    <option value="students_desc">Alumnos (Más alumnos)</option>
                                    <option value="students_asc">Alumnos (Menos alumnos)</option>
                                    <option value="topics_desc">Temas (Pensum más amplio)</option>
                                    <option value="topics_asc">Temas (Pensum menor)</option>
                                    <option value="sessions_desc">Sesiones (Más sesiones)</option>
                                    <option value="sessions_asc">Sesiones (Menos sesiones)</option>
                                    <option value="institution_asc">Institución (A → Z)</option>
                                </select>
                            </div>

                            <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded-md border border-border/40 whitespace-nowrap">
                                {filteredAndSortedCourses.length} {filteredAndSortedCourses.length === 1 ? 'curso' : 'cursos'}
                            </span>
                        </div>
                    </div>
                )}

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
                ) : filteredAndSortedCourses.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                        <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                        <p className="font-medium">No se encontraron cursos con los filtros actuales.</p>
                        <p className="text-xs mt-1">Prueba cambiando los términos de búsqueda o el criterio de orden.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredAndSortedCourses.map((course) => (
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
                                            {course.status === 'archived' && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border">
                                                    <Archive className="h-2.5 w-2.5" /> Archivado
                                                </span>
                                            )}
                                        </div>

                                        {course.status === 'archived' || course.academic_period?.is_closed ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80 bg-muted/60 px-2 py-0.5 rounded border border-border/50 shrink-0" title="Curso en modo histórico / solo lectura">
                                                <Lock className="h-3 w-3" /> Solo lectura
                                            </span>
                                        ) : (
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

                {/* Manage Academic Periods Dialog */}
                <Dialog open={openManagePeriodsDialog} onOpenChange={setOpenManagePeriodsDialog}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-primary" />
                                Períodos Académicos
                            </DialogTitle>
                            <DialogDescription>
                                Consulta, edita o administra los períodos escolares y semestres de la institución.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 pt-2">
                            {academicPeriods.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No hay períodos registrados. Crea uno con el botón "Nuevo Período".
                                </div>
                            ) : (
                                <div className="divide-y divide-border border rounded-lg overflow-hidden max-h-[380px] overflow-y-auto">
                                    {academicPeriods.map((period) => (
                                        <div
                                            key={period.id}
                                            className="p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-foreground truncate">
                                                        {period.name}
                                                    </span>
                                                    {period.is_current ? (
                                                        <span className="inline-flex items-center text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                                                            Período Activo
                                                        </span>
                                                    ) : period.is_closed ? (
                                                        <span className="inline-flex items-center text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full gap-1">
                                                            <Lock className="h-2.5 w-2.5" /> Cerrado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-[10px] bg-sky-500/15 text-sky-700 dark:text-sky-400 font-medium px-2 py-0.5 rounded-full">
                                                            Planificado
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    {period.start_date || period.end_date ? (
                                                        <>
                                                            <span>{period.start_date ? formatNaturalDate(period.start_date) : 'Sin fecha inicio'}</span>
                                                            <span>—</span>
                                                            <span>{period.end_date ? formatNaturalDate(period.end_date) : 'Sin fecha fin'}</span>
                                                        </>
                                                    ) : (
                                                        'Fechas no definidas'
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs gap-1"
                                                    onClick={() => {
                                                        setOpenManagePeriodsDialog(false);
                                                        handleStartEditPeriod(period);
                                                    }}
                                                >
                                                    <Pencil className="h-3 w-3" /> Editar
                                                </Button>

                                                {period.is_closed ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                                                        onClick={() => handleReopenPeriod(period)}
                                                        title="Reabrir período"
                                                    >
                                                        <Unlock className="h-3.5 w-3.5" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleClosePeriod(period)}
                                                        title="Cerrar período"
                                                    >
                                                        <Lock className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeletePeriod(period)}
                                                    title="Eliminar período"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setOpenManagePeriodsDialog(false);
                                    setOpenPeriodDialog(true);
                                }}
                                className="gap-1.5 text-xs"
                            >
                                <Plus className="h-3.5 w-3.5" /> Nuevo Período
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setOpenManagePeriodsDialog(false)}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit Academic Period Dialog */}
                <Dialog open={openEditPeriodDialog} onOpenChange={setOpenEditPeriodDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar Período Académico</DialogTitle>
                            <DialogDescription>
                                Modifica el nombre, fechas y estado del ciclo escolar.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditPeriodSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_period_name">Nombre del Período *</Label>
                                <Input
                                    id="edit_period_name"
                                    autoFocus
                                    placeholder="Ej: 2026-2027 o 2026-I"
                                    value={editPeriodForm.data.name}
                                    onChange={(e) => editPeriodForm.setData('name', e.target.value)}
                                    required
                                />
                                {editPeriodForm.errors.name && (
                                    <p className="text-xs text-destructive">{editPeriodForm.errors.name}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_period_start_date">Fecha Inicio</Label>
                                    <Input
                                        id="edit_period_start_date"
                                        type="date"
                                        value={editPeriodForm.data.start_date}
                                        onChange={(e) => editPeriodForm.setData('start_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_period_end_date">Fecha Fin</Label>
                                    <Input
                                        id="edit_period_end_date"
                                        type="date"
                                        value={editPeriodForm.data.end_date}
                                        onChange={(e) => editPeriodForm.setData('end_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                                <Checkbox
                                    id="edit_period_is_current"
                                    checked={editPeriodForm.data.is_current}
                                    onCheckedChange={(checked) => editPeriodForm.setData('is_current', Boolean(checked))}
                                />
                                <Label
                                    htmlFor="edit_period_is_current"
                                    className="text-xs font-normal cursor-pointer leading-tight"
                                >
                                    Establecer como <span className="font-semibold text-primary">Período Actual Activo</span> de la institución
                                </Label>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpenEditPeriodDialog(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={editPeriodForm.processing}>
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Academic Period Rollover Wizard Dialog */}
                <AcademicPeriodRolloverDialog
                    open={openRolloverDialog}
                    onOpenChange={setOpenRolloverDialog}
                    currentPeriod={currentPeriodInSystem}
                    courses={courses}
                    academicPeriods={academicPeriods}
                />

                {/* Custom Confirmation Dialog */}
                <ConfirmDialogComponent />
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
