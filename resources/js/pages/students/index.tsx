import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Plus,
    Search,
    UserCheck,
    GraduationCap,
    Pencil,
    Trash2,
    Building2,
    Mail,
    Phone,
    IdCard,
} from 'lucide-react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';

interface InstitutionItem {
    id: number;
    name: string;
    code?: string;
}

interface StudentItem {
    id: number;
    institution_id: number;
    institution?: InstitutionItem;
    first_name: string;
    last_name: string;
    student_id_number?: string;
    email?: string;
    phone?: string;
    notes?: string;
    is_active: boolean;
    courses_count?: number;
    created_at?: string;
}

interface Props {
    students: StudentItem[];
    institutions: InstitutionItem[];
    isGlobalMode?: boolean;
    activeInstitution?: {
        id: number;
        name: string;
        code?: string;
    } | null;
}

export default function StudentsIndex({
    students,
    institutions = [],
    isGlobalMode = false,
    activeInstitution,
}: Props) {
    const [search, setSearch] = useState('');
    const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('all');
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);

    const createForm = useForm({
        institution_id: isGlobalMode ? '' : (activeInstitution?.id ? String(activeInstitution.id) : ''),
        first_name: '',
        last_name: '',
        student_id_number: '',
        email: '',
        phone: '',
        notes: '',
    });

    const editForm = useForm({
        first_name: '',
        last_name: '',
        student_id_number: '',
        email: '',
        phone: '',
        notes: '',
        is_active: true,
    });

    const filteredStudents = students.filter((s) => {
        const matchesInstitution =
            selectedInstitutionId === 'all' || String(s.institution_id) === selectedInstitutionId;

        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        const query = search.toLowerCase();
        const matchesSearch =
            fullName.includes(query) ||
            (s.student_id_number && s.student_id_number.toLowerCase().includes(query)) ||
            (s.email && s.email.toLowerCase().includes(query)) ||
            (s.institution && s.institution.name.toLowerCase().includes(query));

        return matchesInstitution && matchesSearch;
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/students', {
            onSuccess: () => {
                setOpenCreateDialog(false);
                createForm.reset();
            },
        });
    };

    const handleStartEdit = (student: StudentItem) => {
        setEditingStudent(student);
        editForm.setData({
            first_name: student.first_name || '',
            last_name: student.last_name || '',
            student_id_number: student.student_id_number || '',
            email: student.email || '',
            phone: student.phone || '',
            notes: student.notes || '',
            is_active: student.is_active,
        });
        setOpenEditDialog(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;

        editForm.put(`/students/${editingStudent.id}`, {
            onSuccess: () => {
                setOpenEditDialog(false);
                setEditingStudent(null);
                editForm.reset();
            },
        });
    };

    const handleDelete = (student: StudentItem) => {
        const fullName = `${student.first_name} ${student.last_name}`;
        if (
            confirm(
                `¿Estás seguro de eliminar a "${fullName}" del padrón de la institución?\n\nSe eliminarán también sus matrículas y registros de asistencia.`
            )
        ) {
            router.delete(`/students/${student.id}`);
        }
    };

    const institutionOptions = institutions.map((inst) => ({
        value: inst.id,
        label: inst.name,
        subLabel: inst.code,
    }));

    return (
        <>
            <Head title="Padrón de Estudiantes - TeachingSystem" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1.5">
                                {isGlobalMode ? (
                                    <>
                                        <Building2 className="h-3 w-3" /> Padrón Global de Estudiantes
                                    </>
                                ) : (
                                    <>
                                        <Building2 className="h-3 w-3" /> Sede: {activeInstitution?.name || 'Institucional'}
                                    </>
                                )}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Estudiantes Matriculados
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isGlobalMode
                                ? 'Padrón centralizado de estudiantes registrados en todas las instituciones.'
                                : `Padrón oficial de estudiantes matriculados en ${activeInstitution?.name || 'la institución'}. Los profesores pueden seleccionarlos para inscribirlos en sus cursos.`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" /> Matricular Estudiante
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Matricular Estudiante en la Institución</DialogTitle>
                                    <DialogDescription>
                                        Registra a un nuevo estudiante en el padrón institucional para que pueda ser asignado a cursos y sesiones de clase.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                                    {isGlobalMode && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="institution_id">Institución *</Label>
                                            <SearchableSelect
                                                options={institutionOptions}
                                                value={createForm.data.institution_id}
                                                onChange={(val) => createForm.setData('institution_id', String(val))}
                                                placeholder="Seleccionar institución..."
                                                required
                                            />
                                            {createForm.errors.institution_id && (
                                                <p className="text-xs text-destructive">{createForm.errors.institution_id}</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="first_name">Nombres *</Label>
                                            <Input
                                                id="first_name"
                                                placeholder="Ej: Carlos"
                                                value={createForm.data.first_name}
                                                onChange={(e) => createForm.setData('first_name', e.target.value)}
                                                required
                                            />
                                            {createForm.errors.first_name && (
                                                <p className="text-xs text-destructive">{createForm.errors.first_name}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="last_name">Apellidos *</Label>
                                            <Input
                                                id="last_name"
                                                placeholder="Ej: Gómez Pérez"
                                                value={createForm.data.last_name}
                                                onChange={(e) => createForm.setData('last_name', e.target.value)}
                                                required
                                            />
                                            {createForm.errors.last_name && (
                                                <p className="text-xs text-destructive">{createForm.errors.last_name}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="student_id_number">Cédula / Carnet Institucional</Label>
                                        <Input
                                            id="student_id_number"
                                            placeholder="Ej: V-28123456"
                                            value={createForm.data.student_id_number}
                                            onChange={(e) => createForm.setData('student_id_number', e.target.value)}
                                        />
                                        {createForm.errors.student_id_number && (
                                            <p className="text-xs text-destructive">{createForm.errors.student_id_number}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="email">Correo Electrónico</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="estudiante@correo.com"
                                                value={createForm.data.email}
                                                onChange={(e) => createForm.setData('email', e.target.value)}
                                            />
                                            {createForm.errors.email && (
                                                <p className="text-xs text-destructive">{createForm.errors.email}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="phone">Teléfono</Label>
                                            <Input
                                                id="phone"
                                                placeholder="Ej: +58 412 1234567"
                                                value={createForm.data.phone}
                                                onChange={(e) => createForm.setData('phone', e.target.value)}
                                            />
                                            {createForm.errors.phone && (
                                                <p className="text-xs text-destructive">{createForm.errors.phone}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="notes">Observaciones / Notas Opcionales</Label>
                                        <Input
                                            id="notes"
                                            placeholder="Información adicional sobre el estudiante"
                                            value={createForm.data.notes}
                                            onChange={(e) => createForm.setData('notes', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={createForm.processing}>
                                            {createForm.processing ? 'Registrando...' : 'Matricular Estudiante'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Edit Student Dialog */}
                        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Editar Datos del Estudiante</DialogTitle>
                                    <DialogDescription>
                                        Modifica la información personal y académica del estudiante.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_first_name">Nombres *</Label>
                                            <Input
                                                id="edit_first_name"
                                                value={editForm.data.first_name}
                                                onChange={(e) => editForm.setData('first_name', e.target.value)}
                                                required
                                            />
                                            {editForm.errors.first_name && (
                                                <p className="text-xs text-destructive">{editForm.errors.first_name}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_last_name">Apellidos *</Label>
                                            <Input
                                                id="edit_last_name"
                                                value={editForm.data.last_name}
                                                onChange={(e) => editForm.setData('last_name', e.target.value)}
                                                required
                                            />
                                            {editForm.errors.last_name && (
                                                <p className="text-xs text-destructive">{editForm.errors.last_name}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit_student_id_number">Cédula / Carnet Institucional</Label>
                                        <Input
                                            id="edit_student_id_number"
                                            value={editForm.data.student_id_number}
                                            onChange={(e) => editForm.setData('student_id_number', e.target.value)}
                                        />
                                        {editForm.errors.student_id_number && (
                                            <p className="text-xs text-destructive">{editForm.errors.student_id_number}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_email">Correo Electrónico</Label>
                                            <Input
                                                id="edit_email"
                                                type="email"
                                                value={editForm.data.email}
                                                onChange={(e) => editForm.setData('email', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_phone">Teléfono</Label>
                                            <Input
                                                id="edit_phone"
                                                value={editForm.data.phone}
                                                onChange={(e) => editForm.setData('phone', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit_notes">Observaciones / Notas</Label>
                                        <Input
                                            id="edit_notes"
                                            value={editForm.data.notes}
                                            onChange={(e) => editForm.setData('notes', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editForm.data.is_active}
                                                onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                                className="rounded text-primary"
                                            />
                                            <span className="text-foreground font-medium">Estudiante Activo</span>
                                        </label>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setOpenEditDialog(false);
                                                setEditingStudent(null);
                                            }}
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
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, cédula o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs"
                        />
                    </div>

                    {isGlobalMode && institutions.length > 0 && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs text-muted-foreground">Sede:</span>
                            <select
                                value={selectedInstitutionId}
                                onChange={(e) => setSelectedInstitutionId(e.target.value)}
                                className="h-8 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">Todas las Sedes ({students.length})</option>
                                {institutions.map((inst) => (
                                    <option key={inst.id} value={String(inst.id)}>
                                        {inst.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Content */}
                {filteredStudents.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                        <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                        <p className="font-medium">No se encontraron estudiantes registrados.</p>
                        <p className="text-xs mt-1">
                            {students.length === 0
                                ? 'Matricula a los estudiantes de la institución para que puedan ser inscritos en los cursos.'
                                : 'Prueba cambiando los términos de búsqueda.'}
                        </p>
                        {students.length === 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="mt-4"
                                onClick={() => setOpenCreateDialog(true)}
                            >
                                <Plus className="h-4 w-4 mr-1.5" /> Matricular Primer Estudiante
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-muted/60 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[220px]">
                                        Estudiante
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[120px]">
                                        Cédula / Carnet
                                    </th>
                                    {isGlobalMode && (
                                        <th className="px-4 py-3 font-semibold text-foreground min-w-[140px]">
                                            Institución
                                        </th>
                                    )}
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[120px]">
                                        Contacto
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[100px]">
                                        Cursos
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[80px]">
                                        Estado
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground text-right min-w-[80px]">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-foreground">
                                                {student.first_name} {student.last_name}
                                            </div>
                                            {student.email && (
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <Mail className="h-3 w-3 shrink-0" /> {student.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {student.student_id_number ? (
                                                <span className="font-mono text-xs bg-muted/60 px-2 py-0.5 rounded">
                                                    {student.student_id_number}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/60">—</span>
                                            )}
                                        </td>
                                        {isGlobalMode && (
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                    <Building2 className="h-3 w-3" /> {student.institution?.name || 'Sede'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {student.phone ? (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3 shrink-0" /> {student.phone}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/60">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                <GraduationCap className="h-3 w-3" /> {student.courses_count ?? 0} curso(s)
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {student.is_active ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleStartEdit(student)}
                                                    title="Editar datos del estudiante"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDelete(student)}
                                                    title="Eliminar de la institución"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

StudentsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Estudiantes',
            href: '/students',
        },
    ],
};
