import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Plus, BookMarked, Layers, Search, Pencil, Trash2 } from 'lucide-react';
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

interface SubjectItem {
    id: number;
    name: string;
    code?: string;
    description?: string;
    topics_count: number;
}

interface Props {
    subjects: SubjectItem[];
}

export default function SubjectsIndex({ subjects }: Props) {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
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
    });

    const filteredSubjects = subjects.filter((s) => {
        const query = search.toLowerCase();
        return (
            s.name.toLowerCase().includes(query) ||
            (s.code && s.code.toLowerCase().includes(query)) ||
            (s.description && s.description.toLowerCase().includes(query))
        );
    });

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
        if (
            confirm(
                `¿Estás seguro de eliminar la asignatura "${subject.name}"? Los temas asociados conservarán sus datos y quedarán sin asignatura asignada.`
            )
        ) {
            router.delete(`/subjects/${subject.id}`);
        }
    };

    return (
        <>
            <Head title="Asignaturas - TeachingSystem" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Asignaturas</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona las materias y áreas de conocimiento para clasificar los temas del banco global.
                        </p>
                    </div>

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
                                        placeholder="Ej: PW-101"
                                        value={createForm.data.code}
                                        onChange={(e) => createForm.setData('code', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="create_description">Descripción / Alcance</Label>
                                    <Input
                                        id="create_description"
                                        placeholder="Breve resumen de la asignatura"
                                        value={createForm.data.description}
                                        onChange={(e) => createForm.setData('description', e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createForm.processing}>
                                        Guardar Asignatura
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Edit Subject Dialog */}
                <Dialog open={editingSubject !== null} onOpenChange={(open) => !open && setEditingSubject(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Editar Asignatura</DialogTitle>
                            <DialogDescription>
                                Modifica el nombre, código o descripción de la asignatura.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit_name">Nombre de la Asignatura *</Label>
                                <Input
                                    id="edit_name"
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
                                <Button type="button" variant="outline" onClick={() => setEditingSubject(null)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Actualizar
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Search Bar */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar asignatura..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 text-xs"
                    />
                </div>

                {filteredSubjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                        <BookMarked className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                        <p className="font-medium">No se encontraron asignaturas.</p>
                        <p className="text-xs mt-1">Crea una nueva asignatura para organizar tus temas didácticos.</p>
                        <Button size="sm" variant="outline" className="mt-4 gap-2" onClick={() => setOpenCreateDialog(true)}>
                            <Plus className="h-4 w-4" /> Crear Asignatura
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredSubjects.map((subject) => (
                            <div
                                key={subject.id}
                                className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors"
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

                                    {/* Action Buttons (Edit & Delete) */}
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
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
