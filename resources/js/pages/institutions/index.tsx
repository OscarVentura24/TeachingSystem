import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Building2,
    Plus,
    Pencil,
    Trash2,
    Search,
    GraduationCap,
    Users,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Calendar,
    Globe,
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

interface InstitutionItem {
    id: number;
    name: string;
    slug: string;
    code?: string;
    description?: string;
    is_active: boolean;
    courses_count: number;
    students_count: number;
    users_count: number;
    academic_periods_count: number;
}

interface Props {
    institutions: InstitutionItem[];
    activeInstitutionId: number | null;
    totalStats: {
        totalInstitutions: number;
        activeInstitutions: number;
        totalCourses: number;
        totalStudents: number;
    };
}

export default function InstitutionsIndex({ institutions, activeInstitutionId, totalStats }: Props) {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [editingInstitution, setEditingInstitution] = useState<InstitutionItem | null>(null);
    const [search, setSearch] = useState('');

    const createForm = useForm({
        name: '',
        code: '',
        description: '',
    });

    const editForm = useForm({
        name: '',
        code: '',
        description: '',
        is_active: true,
    });

    const filteredInstitutions = institutions.filter((inst) => {
        const query = search.toLowerCase();
        return (
            inst.name.toLowerCase().includes(query) ||
            (inst.code && inst.code.toLowerCase().includes(query)) ||
            (inst.description && inst.description.toLowerCase().includes(query))
        );
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/institutions', {
            onSuccess: () => {
                setOpenCreateDialog(false);
                createForm.reset();
            },
        });
    };

    const openEditModal = (inst: InstitutionItem) => {
        setEditingInstitution(inst);
        editForm.setData({
            name: inst.name,
            code: inst.code || '',
            description: inst.description || '',
            is_active: inst.is_active,
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingInstitution) return;

        editForm.put(`/institutions/${editingInstitution.id}`, {
            onSuccess: () => {
                setEditingInstitution(null);
                editForm.reset();
            },
        });
    };

    const handleDelete = (inst: InstitutionItem) => {
        const warning =
            inst.courses_count > 0 || inst.students_count > 0
                ? `La institución "${inst.name}" cuenta con ${inst.courses_count} cursos y ${inst.students_count} estudiantes registrados. Al eliminarla, se desactivará para proteger el historial académico. ¿Continuar?`
                : `¿Estás seguro de eliminar permanentemente la institución "${inst.name}"?`;

        if (confirm(warning)) {
            router.delete(`/institutions/${inst.id}`);
        }
    };

    const handleSwitchToInstitution = (instId: number) => {
        router.post('/institutions/switch', {
            institution_id: instId,
        });
    };

    return (
        <>
            <Head title="Instituciones - Super Admin Hub" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                                Plataforma Global
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Globe className="h-3 w-3" /> Modo Super Admin
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                            <Building2 className="h-6 w-6 text-primary" />
                            Gestión Global de Instituciones
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Supervisa todos los centros educativos, asigna accesos y gestiona la plataforma desde un solo lugar.
                        </p>
                    </div>

                    <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Nueva Institución
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Crear Nueva Institución</DialogTitle>
                                <DialogDescription>
                                    Registra un nuevo colegio, academia o universidad para aislar sus cursos y docentes.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="inst_name">Nombre de la Institución *</Label>
                                    <Input
                                        id="inst_name"
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                        placeholder="Ej: Colegio San Ignacio"
                                        required
                                    />
                                    {createForm.errors.name && (
                                        <p className="text-xs text-destructive">{createForm.errors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="inst_code">Código Institucional (Opcional)</Label>
                                    <Input
                                        id="inst_code"
                                        value={createForm.data.code}
                                        onChange={(e) => createForm.setData('code', e.target.value)}
                                        placeholder="Ej: CSI-VE"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="inst_desc">Descripción / Notas (Opcional)</Label>
                                    <Input
                                        id="inst_desc"
                                        value={createForm.data.description}
                                        onChange={(e) => createForm.setData('description', e.target.value)}
                                        placeholder="Ej: Sede Central / Campus Principal"
                                    />
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
                                        {createForm.processing ? 'Creando...' : 'Crear y Acceder'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Global Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Instituciones</span>
                            <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{totalStats.totalInstitutions}</p>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Instituciones Activas</span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-bold mt-2 text-emerald-600">{totalStats.activeInstitutions}</p>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Cursos</span>
                            <GraduationCap className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{totalStats.totalCourses}</p>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Estudiantes</span>
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{totalStats.totalStudents}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, código o descripción..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Institutions Grid */}
                {filteredInstitutions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/10">
                        <Building2 className="h-10 w-10 text-muted-foreground/60 mb-3" />
                        <h3 className="font-semibold text-lg text-foreground">No se encontraron instituciones</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1">
                            {search
                                ? 'No hay instituciones que coincidan con la búsqueda.'
                                : 'Comienza registrando la primera institución educativa del sistema.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredInstitutions.map((inst) => {
                            const isCurrent = activeInstitutionId === inst.id;
                            const initials = inst.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 3)
                                .join('')
                                .toUpperCase();

                            return (
                                <div
                                    key={inst.id}
                                    className={`rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between transition-all hover:border-primary/50 ${
                                        isCurrent ? 'ring-2 ring-primary/40 border-primary' : ''
                                    } ${!inst.is_active ? 'opacity-60 bg-muted/20' : ''}`}
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-foreground text-base line-clamp-1">
                                                        {inst.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {inst.code && (
                                                            <span className="text-[11px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                                                {inst.code}
                                                            </span>
                                                        )}
                                                        {isCurrent && (
                                                            <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                                Panel Activo
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                {inst.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" /> Activa
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                        <XCircle className="h-3 w-3" /> Inactiva
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {inst.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                                                {inst.description}
                                            </p>
                                        )}

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-3 gap-2 py-3 border-y bg-muted/20 rounded-md px-2 my-3 text-center">
                                            <div>
                                                <span className="text-base font-bold text-foreground block">
                                                    {inst.courses_count}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                                                    <GraduationCap className="h-3 w-3" /> Cursos
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-base font-bold text-foreground block">
                                                    {inst.students_count}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                                                    <Users className="h-3 w-3" /> Alumnos
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-base font-bold text-foreground block">
                                                    {inst.academic_periods_count}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                                                    <Calendar className="h-3 w-3" /> Períodos
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between gap-2 pt-3 mt-1 border-t">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-1 text-xs"
                                                onClick={() => openEditModal(inst)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" /> Editar
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                title="Eliminar / Desactivar"
                                                onClick={() => handleDelete(inst)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <Button
                                            variant={isCurrent ? 'secondary' : 'default'}
                                            size="sm"
                                            className="h-8 gap-1.5 text-xs font-medium"
                                            onClick={() => handleSwitchToInstitution(inst.id)}
                                        >
                                            <span>{isCurrent ? 'En Panel' : 'Acceder al Panel'}</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            {editingInstitution && (
                <Dialog open={!!editingInstitution} onOpenChange={(open) => !open && setEditingInstitution(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar Institución</DialogTitle>
                            <DialogDescription>
                                Modifica los datos o el estado de activación de esta sede educativa.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_inst_name">Nombre de la Institución *</Label>
                                <Input
                                    id="edit_inst_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    required
                                />
                                {editForm.errors.name && (
                                    <p className="text-xs text-destructive">{editForm.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_inst_code">Código Institucional</Label>
                                <Input
                                    id="edit_inst_code"
                                    value={editForm.data.code}
                                    onChange={(e) => editForm.setData('code', e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_inst_desc">Descripción / Notas</Label>
                                <Input
                                    id="edit_inst_desc"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5 pt-1">
                                <Label>Estado de la Institución</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={editForm.data.is_active ? 'default' : 'outline'}
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={() => editForm.setData('is_active', true)}
                                    >
                                        Activa
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!editForm.data.is_active ? 'destructive' : 'outline'}
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={() => editForm.setData('is_active', false)}
                                    >
                                        Inactiva
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingInstitution(null)}
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
