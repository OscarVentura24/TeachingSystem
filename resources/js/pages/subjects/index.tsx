import React, { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Plus, BookMarked, Layers, Search, Pencil, Trash2, Building2, ListFilter } from 'lucide-react';
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
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

interface SubjectItem {
    id: number;
    name: string;
    code?: string;
    description?: string;
    topics_count: number;
}

interface Props {
    subjects: SubjectItem[];
    isGlobalMode?: boolean;
}

type SubjectSortField = 'name' | 'code' | 'topics_count';
type SubjectSortDirection = 'asc' | 'desc';

export default function SubjectsIndex({ subjects, isGlobalMode = false }: Props) {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SubjectSortField>('name');
    const [sortDirection, setSortDirection] = useState<SubjectSortDirection>('asc');
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    const createForm = useForm({
        name: '',
        code: '',
        description: '',
    });

    const editForm = useForm({
        name: '',
        code: '',
        description: '',
    });

    const handleSortDropdownChange = (val: string) => {
        const parts = val.split('_');
        const dir = parts.pop() as SubjectSortDirection;
        const field = parts.join('_') as SubjectSortField;
        if (field && dir) {
            setSortField(field);
            setSortDirection(dir);
        }
    };

    const filteredAndSortedSubjects = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = subjects.filter((s) => {
            if (!query) return true;
            return (
                s.name.toLowerCase().includes(query) ||
                (s.code && s.code.toLowerCase().includes(query)) ||
                (s.description && s.description.toLowerCase().includes(query))
            );
        });

        return [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
                    break;
                case 'code': {
                    const codeA = a.code || '';
                    const codeB = b.code || '';
                    comparison = codeA.localeCompare(codeB, 'es', { sensitivity: 'base' });
                    break;
                }
                case 'topics_count':
                    comparison = (a.topics_count || 0) - (b.topics_count || 0);
                    break;
                default:
                    comparison = 0;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [subjects, search, sortField, sortDirection]);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/subjects', {
            onSuccess: () => {
                setOpenCreateDialog(false);
                createForm.reset();
            },
        });
    };

    const handleStartEdit = (subject: SubjectItem) => {
        setEditingSubject(subject);
        editForm.setData({
            name: subject.name,
            code: subject.code || '',
            description: subject.description || '',
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSubject) return;

        editForm.put(`/subjects/${editingSubject.id}`, {
            onSuccess: () => {
                setEditingSubject(null);
                editForm.reset();
            },
        });
    };

    const handleDelete = (subject: SubjectItem) => {
        confirm({
            title: `¿Eliminar la asignatura "${subject.name}"?`,
            description: 'Los temas asociados conservarán sus datos y quedarán sin asignatura asignada.',
            confirmText: 'Eliminar Asignatura',
            variant: 'destructive',
            onConfirm: () => router.delete(`/subjects/${subject.id}`),
        });
    };

    return (
        <>
            <Head title="Asignaturas - H2O Teaching System" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {!isGlobalMode && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <Building2 className="h-4 w-4 text-primary shrink-0" />
                            <span>
                                <strong>Catálogo Global de Asignaturas:</strong> Estás en modo institucional. Las asignaturas son el índice general de áreas curriculares de la plataforma. Su creación y edición se gestiona exclusivamente desde la <strong>Plataforma Global (Super Admin)</strong>.
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {isGlobalMode ? 'Modo Super Admin' : 'Consulta Institucional'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Asignaturas</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona las materias y áreas de conocimiento para clasificar los temas del banco global.
                        </p>
                    </div>

                    {isGlobalMode && (
                        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" /> Nueva Asignatura
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Crear Asignatura</DialogTitle>
                                    <DialogDescription>
                                        Registra una nueva materia o área de conocimiento.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="create_name">Nombre de la Asignatura *</Label>
                                        <Input
                                            id="create_name"
                                            autoFocus
                                            placeholder="Ej: Programación Web"
                                            value={createForm.data.name}
                                            onChange={(e) => createForm.setData('name', e.target.value)}
                                            required
                                        />
                                        {createForm.errors.name && (
                                            <p className="text-xs text-destructive">{createForm.errors.name}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="create_code">Código de Materia</Label>
                                        <Input
                                            id="create_code"
                                            placeholder="Ej: PROG-WEB"
                                            value={createForm.data.code}
                                            onChange={(e) => createForm.setData('code', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="create_description">Descripción</Label>
                                        <Input
                                            id="create_description"
                                            placeholder="Breve detalle del contenido formativo"
                                            value={createForm.data.description}
                                            onChange={(e) => createForm.setData('description', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setOpenCreateDialog(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={createForm.processing}>
                                            Guardar Asignatura
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Edit Subject Dialog */}
                {isGlobalMode && (
                    <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Editar Asignatura</DialogTitle>
                                <DialogDescription>
                                    Modifica el nombre o código de la asignatura.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_name">Nombre de la Asignatura *</Label>
                                    <Input
                                        id="edit_name"
                                        autoFocus
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        required
                                    />
                                    {editForm.errors.name && (
                                        <p className="text-xs text-destructive">{editForm.errors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_code">Código de Materia</Label>
                                    <Input
                                        id="edit_code"
                                        value={editForm.data.code}
                                        onChange={(e) => editForm.setData('code', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_description">Descripción</Label>
                                    <Input
                                        id="edit_description"
                                        value={editForm.data.description}
                                        onChange={(e) => editForm.setData('description', e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingSubject(null)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={editForm.processing}>
                                        Actualizar
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Search & Sort Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            placeholder="Buscar por nombre o código..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <ListFilter className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Ordenar por:</span>
                        <select
                            value={`${sortField}_${sortDirection}`}
                            onChange={(e) => handleSortDropdownChange(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                        >
                            <option value="name_asc">Nombre (A - Z)</option>
                            <option value="name_desc">Nombre (Z - A)</option>
                            <option value="code_asc">Código (A - Z)</option>
                            <option value="topics_count_desc">Más temas primero</option>
                            <option value="topics_count_asc">Menos temas primero</option>
                        </select>
                    </div>
                </div>

                {filteredAndSortedSubjects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
                        <BookMarked className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                        <h3 className="text-base font-semibold text-foreground">No se encontraron asignaturas</h3>
                        <p className="text-xs mt-1">Crea asignaturas para estructurar los temas didácticos.</p>
                        {isGlobalMode && (
                            <Button size="sm" variant="outline" className="mt-4 gap-2" onClick={() => setOpenCreateDialog(true)}>
                                <Plus className="h-4 w-4" /> Crear Asignatura
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredAndSortedSubjects.map((subject) => (
                            <div
                                key={subject.id}
                                className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs hover:border-primary/40 transition-colors"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-base font-semibold text-foreground">
                                            {subject.name}
                                        </h3>
                                        {subject.code && (
                                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                                {subject.code}
                                            </span>
                                        )}
                                    </div>

                                    {subject.description && (
                                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                            {subject.description}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Layers className="h-3.5 w-3.5 text-primary" /> {subject.topics_count} tema(s) en el banco
                                    </span>

                                    {/* Action Buttons (Edit & Delete, Global Super Admin only) */}
                                    {isGlobalMode && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                onClick={() => handleStartEdit(subject)}
                                                title="Editar Asignatura"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(subject)}
                                                title="Eliminar Asignatura"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Custom Confirmation Dialog */}
                <ConfirmDialogComponent />
            </div>
        </>
    );
}

SubjectsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Asignaturas',
            href: '/subjects',
        },
    ],
};
