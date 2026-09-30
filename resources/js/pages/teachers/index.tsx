import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Users,
    ShieldCheck,
    GraduationCap,
    Plus,
    Pencil,
    Trash2,
    Search,
    BookOpen,
    Key,
    CheckCircle2,
    XCircle,
    UserCheck,
    UserX,
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

interface TeacherCourse {
    id: number;
    name: string;
    section?: string;
    is_primary: boolean;
}

interface TeacherItem {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'teacher';
    is_active: boolean;
    institution_id?: number;
    institution_name?: string;
    courses: TeacherCourse[];
    sessions_count: number;
}

interface InstitutionItem {
    id: number;
    name: string;
}

interface CourseItem {
    id: number;
    name: string;
    section?: string;
    institution_id: number;
}

interface Props {
    teachers: TeacherItem[];
    institutions: InstitutionItem[];
    courses: CourseItem[];
    isCurrentUserAdmin: boolean;
}

export default function TeachersIndex({ teachers, institutions, courses }: Props) {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'admin'>('all');

    const defaultInstId = institutions.length > 0 ? institutions[0].id : '';

    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        institution_id: defaultInstId,
        role: 'teacher' as 'teacher' | 'admin',
        course_ids: [] as number[],
    });

    const editForm = useForm({
        name: '',
        email: '',
        password: '',
        institution_id: defaultInstId,
        role: 'teacher' as 'teacher' | 'admin',
        is_active: true,
        course_ids: [] as number[],
    });

    const filteredTeachers = teachers.filter((t) => {
        const query = search.toLowerCase();
        const matchesQuery =
            t.name.toLowerCase().includes(query) ||
            t.email.toLowerCase().includes(query) ||
            (t.institution_name && t.institution_name.toLowerCase().includes(query)) ||
            t.courses.some((c) => c.name.toLowerCase().includes(query));

        if (!matchesQuery) return false;
        if (roleFilter === 'all') return true;
        return t.role === roleFilter;
    });

    // Counts
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter((t) => t.is_active).length;
    const adminCount = teachers.filter((t) => t.role === 'admin').length;
    const totalAssignments = teachers.reduce((acc, t) => acc + t.courses.length, 0);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/teachers', {
            onSuccess: () => {
                setOpenCreateDialog(false);
                createForm.reset();
            },
        });
    };

    const openEditModal = (teacher: TeacherItem) => {
        setEditingTeacher(teacher);
        editForm.setData({
            name: teacher.name,
            email: teacher.email,
            password: '',
            institution_id: teacher.institution_id || defaultInstId,
            role: teacher.role,
            is_active: teacher.is_active,
            course_ids: teacher.courses.map((c) => c.id),
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeacher) return;

        editForm.put(`/teachers/${editingTeacher.id}`, {
            onSuccess: () => {
                setEditingTeacher(null);
                editForm.reset();
            },
        });
    };

    const handleDelete = (teacher: TeacherItem) => {
        const warning =
            teacher.sessions_count > 0
                ? `El docente "${teacher.name}" tiene ${teacher.sessions_count} sesiones de clase registradas. Al eliminarlo, se desactivará su cuenta y se desvinculará de los cursos para proteger el historial académico de los estudiantes. ¿Deseas continuar?`
                : `¿Estás seguro de eliminar al docente "${teacher.name}"? Esta acción no se puede deshacer.`;

        if (confirm(warning)) {
            router.delete(`/teachers/${teacher.id}`);
        }
    };

    const toggleCourseSelection = (form: typeof createForm | typeof editForm, courseId: number) => {
        const current = form.data.course_ids;
        if (current.includes(courseId)) {
            form.setData('course_ids', current.filter((id) => id !== courseId));
        } else {
            form.setData('course_ids', [...current, courseId]);
        }
    };

    return (
        <>
            <Head title="Docentes y Permisos - TeachingSystem" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                            <Users className="h-6 w-6 text-primary" />
                            Gestión de Docentes y Permisos
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Crea profesores, asigna roles institucionales y vincula qué cursos puede impartir y evaluar cada uno.
                        </p>
                    </div>

                    <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Nuevo Docente
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Registrar Nuevo Docente</DialogTitle>
                                <DialogDescription>
                                    Define los datos de acceso, institución y los cursos a los que tendrá acceso restringido.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="teacher_name">Nombre Completo *</Label>
                                    <Input
                                        id="teacher_name"
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                        placeholder="Ej: Lic. Mariana Ramos"
                                        required
                                    />
                                    {createForm.errors.name && (
                                        <p className="text-xs text-destructive">{createForm.errors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="teacher_email">Correo Electrónico *</Label>
                                    <Input
                                        id="teacher_email"
                                        type="email"
                                        value={createForm.data.email}
                                        onChange={(e) => createForm.setData('email', e.target.value)}
                                        placeholder="docente@institucion.edu"
                                        required
                                    />
                                    {createForm.errors.email && (
                                        <p className="text-xs text-destructive">{createForm.errors.email}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="teacher_password">Contraseña Inicial (Opcional)</Label>
                                    <Input
                                        id="teacher_password"
                                        type="password"
                                        value={createForm.data.password}
                                        onChange={(e) => createForm.setData('password', e.target.value)}
                                        placeholder="Dejar en blanco para: Docente2026*"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Si no especificas una, se usará por defecto: <code className="bg-muted px-1 py-0.5 rounded">Docente2026*</code>
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Institución *</Label>
                                    <SearchableSelect
                                        options={institutions.map((inst) => ({
                                            value: inst.id,
                                            label: inst.name,
                                        }))}
                                        value={createForm.data.institution_id}
                                        onChange={(val) => createForm.setData('institution_id', val)}
                                        placeholder="Seleccionar institución..."
                                        searchPlaceholder="Buscar institución..."
                                    />
                                    {createForm.errors.institution_id && (
                                        <p className="text-xs text-destructive">{createForm.errors.institution_id}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Rol y Nivel de Acceso *</Label>
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div
                                            onClick={() => createForm.setData('role', 'teacher')}
                                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                                createForm.data.role === 'teacher'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-border hover:bg-muted/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 font-medium text-sm">
                                                <GraduationCap className="h-4 w-4" /> Docente
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                Solo puede ver y gestionar las sesiones de los grupos que tiene asignados.
                                            </p>
                                        </div>

                                        <div
                                            onClick={() => createForm.setData('role', 'admin')}
                                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                                createForm.data.role === 'admin'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-border hover:bg-muted/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 font-medium text-sm">
                                                <ShieldCheck className="h-4 w-4" /> Administrador
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                Control total sobre todos los cursos, docentes y períodos de la institución.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t">
                                    <Label className="flex items-center justify-between text-xs">
                                        <span>Asignar Cursos Iniciales ({createForm.data.course_ids.length})</span>
                                        <span className="text-muted-foreground font-normal">Opcional</span>
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Selecciona los grupos que este docente podrá dictar:
                                    </p>

                                    <div className="max-h-40 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
                                        {courses.length === 0 ? (
                                            <p className="text-xs text-muted-foreground p-2 text-center">
                                                No hay cursos activos disponibles.
                                            </p>
                                        ) : (
                                            courses.map((course) => {
                                                const isSelected = createForm.data.course_ids.includes(course.id);
                                                return (
                                                    <div
                                                        key={course.id}
                                                        onClick={() => toggleCourseSelection(createForm, course.id)}
                                                        className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? 'bg-primary/10 text-primary font-medium'
                                                                : 'hover:bg-muted text-foreground'
                                                        }`}
                                                    >
                                                        <span>
                                                            {course.name} {course.section ? `(${course.section})` : ''}
                                                        </span>
                                                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpenCreateDialog(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createForm.processing}>
                                        {createForm.processing ? 'Registrando...' : 'Registrar Docente'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Docentes</span>
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{totalTeachers}</p>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Docentes Activos</span>
                            <UserCheck className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-bold mt-2 text-emerald-600">{activeTeachers}</p>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Administradores</span>
                            <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{adminCount}</p>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Grupos Asignados</span>
                            <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{totalAssignments}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar docente por nombre, correo, institución o curso..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <Button
                            variant={roleFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRoleFilter('all')}
                        >
                            Todos
                        </Button>
                        <Button
                            variant={roleFilter === 'teacher' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRoleFilter('teacher')}
                        >
                            Docentes
                        </Button>
                        <Button
                            variant={roleFilter === 'admin' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRoleFilter('admin')}
                        >
                            Administradores
                        </Button>
                    </div>
                </div>

                {/* Teachers List */}
                {filteredTeachers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/10">
                        <Users className="h-10 w-10 text-muted-foreground/60 mb-3" />
                        <h3 className="font-semibold text-lg text-foreground">No se encontraron docentes</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1">
                            {search
                                ? 'No hay docentes que coincidan con la búsqueda actual.'
                                : 'Comienza registrando a los profesores de tu institución para asignarles cursos.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTeachers.map((teacher) => {
                            const initials = teacher.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();

                            return (
                                <div
                                    key={teacher.id}
                                    className={`rounded-lg border bg-card p-5 shadow-sm flex flex-col justify-between transition-all hover:border-primary/40 ${
                                        !teacher.is_active ? 'opacity-70 bg-muted/20' : ''
                                    }`}
                                >
                                    <div>
                                        {/* Card Top */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                                                        {teacher.name}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {teacher.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {teacher.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" /> Activo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                        <XCircle className="h-3 w-3" /> Inactivo
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Institution & Role Badges */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                                            <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                                {teacher.institution_name || 'Sin institución'}
                                            </span>

                                            {teacher.role === 'admin' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                                    <ShieldCheck className="h-3 w-3" /> Admin Institución
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                                    <GraduationCap className="h-3 w-3" /> Docente
                                                </span>
                                            )}

                                            <span className="text-[11px] text-muted-foreground ml-auto">
                                                {teacher.sessions_count} {teacher.sessions_count === 1 ? 'sesión' : 'sesiones'}
                                            </span>
                                        </div>

                                        {/* Assigned Courses */}
                                        <div className="space-y-1.5 pt-2 border-t">
                                            <span className="text-[11px] font-medium text-muted-foreground block">
                                                Cursos Asignados ({teacher.courses.length}):
                                            </span>
                                            {teacher.courses.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">
                                                    {teacher.role === 'admin'
                                                        ? 'Tiene acceso a todos los cursos por ser administrador.'
                                                        : 'Sin cursos asignados (no tiene acceso a grupos).'}
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                                    {teacher.courses.map((c) => (
                                                        <span
                                                            key={c.id}
                                                            className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded border"
                                                        >
                                                            {c.name} {c.section ? `(${c.section})` : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1.5 text-xs"
                                            onClick={() => openEditModal(teacher)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" /> Editar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => handleDelete(teacher)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            {editingTeacher && (
                <Dialog open={!!editingTeacher} onOpenChange={(open) => !open && setEditingTeacher(null)}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Editar Docente / Permisos</DialogTitle>
                            <DialogDescription>
                                Modifica datos de acceso, estado activo, rol y cursos asignados.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_teacher_name">Nombre Completo *</Label>
                                <Input
                                    id="edit_teacher_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    required
                                />
                                {editForm.errors.name && (
                                    <p className="text-xs text-destructive">{editForm.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_teacher_email">Correo Electrónico *</Label>
                                <Input
                                    id="edit_teacher_email"
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(e) => editForm.setData('email', e.target.value)}
                                    required
                                />
                                {editForm.errors.email && (
                                    <p className="text-xs text-destructive">{editForm.errors.email}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_teacher_password">Nueva Contraseña (Opcional)</Label>
                                <Input
                                    id="edit_teacher_password"
                                    type="password"
                                    value={editForm.data.password}
                                    onChange={(e) => editForm.setData('password', e.target.value)}
                                    placeholder="Dejar en blanco para conservar la actual"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Solo escribe si deseas cambiar la contraseña de acceso.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Institución *</Label>
                                <SearchableSelect
                                    options={institutions.map((inst) => ({
                                        value: inst.id,
                                        label: inst.name,
                                    }))}
                                    value={editForm.data.institution_id}
                                    onChange={(val) => editForm.setData('institution_id', val)}
                                    placeholder="Seleccionar institución..."
                                    searchPlaceholder="Buscar institución..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <Label>Rol</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={editForm.data.role === 'teacher' ? 'default' : 'outline'}
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => editForm.setData('role', 'teacher')}
                                        >
                                            Docente
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={editForm.data.role === 'admin' ? 'default' : 'outline'}
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => editForm.setData('role', 'admin')}
                                        >
                                            Admin
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Estado de Cuenta</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={editForm.data.is_active ? 'default' : 'outline'}
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => editForm.setData('is_active', true)}
                                        >
                                            Activo
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={!editForm.data.is_active ? 'destructive' : 'outline'}
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => editForm.setData('is_active', false)}
                                        >
                                            Inactivo
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t">
                                <Label className="flex items-center justify-between text-xs">
                                    <span>Cursos Asignados ({editForm.data.course_ids.length})</span>
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Marca o desmarca los grupos a los que este docente tiene acceso:
                                </p>

                                <div className="max-h-40 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
                                    {courses.map((course) => {
                                        const isSelected = editForm.data.course_ids.includes(course.id);
                                        return (
                                            <div
                                                key={course.id}
                                                onClick={() => toggleCourseSelection(editForm, course.id)}
                                                className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-primary/10 text-primary font-medium'
                                                        : 'hover:bg-muted text-foreground'
                                                }`}
                                            >
                                                <span>
                                                    {course.name} {course.section ? `(${course.section})` : ''}
                                                </span>
                                                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingTeacher(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    {editForm.processing ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
