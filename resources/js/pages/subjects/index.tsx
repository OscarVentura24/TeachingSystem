import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Plus, BookMarked, Layers, Search } from 'lucide-react';
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
    const [openDialog, setOpenDialog] = useState(false);
    const [search, setSearch] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/subjects', {
            onSuccess: () => {
                setOpenDialog(false);
                reset();
            },
        });
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

                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
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

                            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name">Nombre de la Asignatura *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej: Programación Web"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                    />
                                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="code">Código de Materia</Label>
                                    <Input
                                        id="code"
                                        placeholder="Ej: PW-101"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="description">Descripción / Alcance</Label>
                                    <Input
                                        id="description"
                                        placeholder="Breve resumen de la asignatura"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Guardar Asignatura
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

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
                        <p className="font-medium">No hay asignaturas registradas todavía.</p>
                        <p className="text-xs mt-1">Crea tu primera asignatura para organizar los temas de tus cursos.</p>
                        <Button size="sm" variant="outline" className="mt-4 gap-2" onClick={() => setOpenDialog(true)}>
                            <Plus className="h-4 w-4" /> Crear Asignatura
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredSubjects.map((subject) => (
                            <div
                                key={subject.id}
                                className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-base font-semibold text-foreground">
                                            {subject.name}
                                        </h3>
                                        {subject.code && (
                                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
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
