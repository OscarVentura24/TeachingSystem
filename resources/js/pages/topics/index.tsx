import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    Plus,
    Library,
    Search,
    BookOpen,
    GitFork,
    LayoutGrid,
    List,
    Pencil,
    Trash2,
    Globe,
    Building2,
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

interface SubjectItem {
    id: number;
    name: string;
    code?: string;
}

interface TopicItem {
    id: number;
    title: string;
    area: string;
    subject_id?: number;
    subject?: SubjectItem;
    unit_title?: string;
    short_summary?: string;
    description?: string;
    resources_notes?: string;
    estimated_minutes?: number;
    prerequisites: Array<{ id: number; title: string }>;
}

interface Props {
    topics: TopicItem[];
    subjects: SubjectItem[];
    areas: string[];
    isGlobalMode?: boolean;
}

export default function TopicsIndex({ topics, subjects, areas, isGlobalMode = false }: Props) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [openDialog, setOpenDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
    const [selectedArea, setSelectedArea] = useState<string>('all');
    const [search, setSearch] = useState('');

    const createForm = useForm({
        title: '',
        subject_id: '',
        area: '',
        unit_title: '',
        short_summary: '',
        description: '',
        resources_notes: '',
        estimated_minutes: '',
        prerequisite_ids: [] as number[],
    });

    const editForm = useForm({
        title: '',
        subject_id: '',
        area: '',
        unit_title: '',
        short_summary: '',
        description: '',
        resources_notes: '',
        estimated_minutes: '',
        prerequisite_ids: [] as number[],
    });

    const filteredTopics = topics.filter((t) => {
        const matchesArea =
            selectedArea === 'all' ||
            t.area === selectedArea ||
            (t.subject && t.subject.name === selectedArea);
        const matchesSearch =
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            (t.unit_title && t.unit_title.toLowerCase().includes(search.toLowerCase())) ||
            (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
            (t.area && t.area.toLowerCase().includes(search.toLowerCase()));
        return matchesArea && matchesSearch;
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/topics', {
            onSuccess: () => {
                setOpenDialog(false);
                createForm.reset();
            },
        });
    };

    const handleStartEdit = (topic: TopicItem) => {
        setEditingTopic(topic);
        editForm.setData({
            title: topic.title || '',
            subject_id: topic.subject_id ? String(topic.subject_id) : '',
            area: topic.area || '',
            unit_title: topic.unit_title || '',
            short_summary: topic.short_summary || '',
            description: topic.description || '',
            resources_notes: topic.resources_notes || '',
            estimated_minutes: topic.estimated_minutes ? String(topic.estimated_minutes) : '',
            prerequisite_ids: topic.prerequisites ? topic.prerequisites.map((p) => p.id) : [],
        });
        setOpenEditDialog(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTopic) return;

        editForm.put(`/topics/${editingTopic.id}`, {
            onSuccess: () => {
                setOpenEditDialog(false);
                setEditingTopic(null);
                editForm.reset();
            },
        });
    };

    const handleDelete = (topic: TopicItem) => {
        if (
            confirm(
                `¿Estás seguro de eliminar el tema "${topic.title}" del Banco Global?\n\nLos cursos que ya tengan este tema en su pensum conservarán su copia local histórica, pero ya no aparecerá disponible para nuevos cursos.`
            )
        ) {
            router.delete(`/topics/${topic.id}`);
        }
    };

    const toggleCreatePrerequisite = (id: number) => {
        createForm.setData(
            'prerequisite_ids',
            createForm.data.prerequisite_ids.includes(id)
                ? createForm.data.prerequisite_ids.filter((p) => p !== id)
                : [...createForm.data.prerequisite_ids, id]
        );
    };

    const toggleEditPrerequisite = (id: number) => {
        editForm.setData(
            'prerequisite_ids',
            editForm.data.prerequisite_ids.includes(id)
                ? editForm.data.prerequisite_ids.filter((p) => p !== id)
                : [...editForm.data.prerequisite_ids, id]
        );
    };

    const subjectOptions = subjects.map((sub) => ({
        value: sub.id,
        label: sub.name,
        subLabel: sub.code,
    }));

    return (
        <>
            <Head title="Banco Global de Temas - TeachingSystem" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Notice banner when viewing in institutional mode */}
                {!isGlobalMode && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <Building2 className="h-4 w-4 text-primary shrink-0" />
                            <span>
                                <strong>Catálogo Global (Modo Consulta):</strong> Estás explorando el Banco de Temas desde el contexto de tu institución para agregarlos a tus pensums. La creación y edición del catálogo maestro se gestiona exclusivamente desde la <strong>Plataforma Global</strong>.
                            </span>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {isGlobalMode ? 'Modo Super Admin' : 'Consulta Institucional'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Banco Global de Temas</h1>
                        <p className="text-sm text-muted-foreground">
                            Repositorio central de temas didácticos reutilizables con dependencias y prerrequisitos.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex items-center rounded-lg border bg-muted/40 p-1">
                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                className="h-7 w-8 p-0"
                                onClick={() => setViewMode('grid')}
                                title="Vista en Cuadrícula"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                className="h-7 w-8 p-0"
                                onClick={() => setViewMode('list')}
                                title="Vista en Lista"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Create Topic Dialog (Global Super Admin only) */}
                        {isGlobalMode && (
                            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" /> Nuevo Tema
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Crear Tema Didáctico</DialogTitle>
                                        <DialogDescription>
                                            Registra un nuevo tema para el banco global vinculándolo a una asignatura.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="create_title">Título del Tema *</Label>
                                            <Input
                                                id="create_title"
                                                placeholder="Ej: Programación Orientada a Objetos: Clases y Objetos"
                                                value={createForm.data.title}
                                                onChange={(e) => createForm.setData('title', e.target.value)}
                                                required
                                            />
                                            {createForm.errors.title && (
                                                <p className="text-xs text-destructive">{createForm.errors.title}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="create_subject_id">Asignatura *</Label>
                                                    <Link
                                                        href="/subjects"
                                                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <Plus className="h-2.5 w-2.5" /> Nueva
                                                    </Link>
                                                </div>

                                                {subjects.length > 0 ? (
                                                    <SearchableSelect
                                                        options={subjectOptions}
                                                        value={createForm.data.subject_id}
                                                        onChange={(sId) => {
                                                            createForm.setData('subject_id', sId);
                                                            const found = subjects.find((s) => s.id === Number(sId));
                                                            if (found) {
                                                                createForm.setData('area', found.name);
                                                            }
                                                        }}
                                                        placeholder="Buscar asignatura..."
                                                        searchPlaceholder="Buscar por nombre o código..."
                                                        required
                                                    />
                                                ) : (
                                                    <div className="space-y-1">
                                                        <Input
                                                            id="create_area"
                                                            placeholder="Ej: Programación Web"
                                                            value={createForm.data.area}
                                                            onChange={(e) => createForm.setData('area', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                )}
                                                {createForm.errors.subject_id && (
                                                    <p className="text-xs text-destructive">{createForm.errors.subject_id}</p>
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="create_unit_title">Unidad Sugerida</Label>
                                                <Input
                                                    id="create_unit_title"
                                                    placeholder="Ej: Unidad 2"
                                                    value={createForm.data.unit_title}
                                                    onChange={(e) => createForm.setData('unit_title', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="create_short_summary">Resumen Breve</Label>
                                            <Input
                                                id="create_short_summary"
                                                placeholder="Explicación en 1 o 2 oraciones"
                                                value={createForm.data.short_summary}
                                                onChange={(e) => createForm.setData('short_summary', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="create_description">Descripción Detallada y Contenido</Label>
                                            <textarea
                                                id="create_description"
                                                rows={3}
                                                value={createForm.data.description}
                                                onChange={(e) => createForm.setData('description', e.target.value)}
                                                placeholder="Detalles sobre lo que se explica en este tema..."
                                                className="w-full bg-background border rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="create_resources_notes">Recursos / Links / Material Didáctico</Label>
                                            <Input
                                                id="create_resources_notes"
                                                placeholder="Ej: Diapositivas, repositorio GitHub, ejercicios"
                                                value={createForm.data.resources_notes}
                                                onChange={(e) => createForm.setData('resources_notes', e.target.value)}
                                            />
                                        </div>

                                        {topics.length > 0 && (
                                            <div className="space-y-2 pt-2 border-t">
                                                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                    <GitFork className="h-3.5 w-3.5 text-primary" /> Prerrequisitos Opcionales
                                                </Label>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Selecciona qué temas deben dominarse antes de poder aprender este tema.
                                                </p>
                                                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-muted/30 rounded-lg border text-xs">
                                                    {topics.map((t) => (
                                                        <label
                                                            key={t.id}
                                                            className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={createForm.data.prerequisite_ids.includes(t.id)}
                                                                onChange={() => toggleCreatePrerequisite(t.id)}
                                                                className="rounded text-primary"
                                                            />
                                                            <span className="font-medium text-foreground">{t.title}</span>
                                                            <span className="text-[10px] text-muted-foreground">({t.area})</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                                                Cancelar
                                            </Button>
                                            <Button type="submit" disabled={createForm.processing}>
                                                Guardar Tema
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* Edit Topic Dialog (Global Super Admin only) */}
                        {isGlobalMode && (
                            <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Editar Tema Didáctico</DialogTitle>
                                        <DialogDescription>
                                            Modifica la información didáctica, asignatura y prerrequisitos del tema.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_title">Título del Tema *</Label>
                                            <Input
                                                id="edit_title"
                                                value={editForm.data.title}
                                                onChange={(e) => editForm.setData('title', e.target.value)}
                                                required
                                            />
                                            {editForm.errors.title && (
                                                <p className="text-xs text-destructive">{editForm.errors.title}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="edit_subject_id">Asignatura *</Label>
                                                    <Link
                                                        href="/subjects"
                                                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <Plus className="h-2.5 w-2.5" /> Nueva
                                                    </Link>
                                                </div>

                                                {subjects.length > 0 ? (
                                                    <SearchableSelect
                                                        options={subjectOptions}
                                                        value={editForm.data.subject_id}
                                                        onChange={(sId) => {
                                                            editForm.setData('subject_id', sId);
                                                            const found = subjects.find((s) => s.id === Number(sId));
                                                            if (found) {
                                                                editForm.setData('area', found.name);
                                                            }
                                                        }}
                                                        placeholder="Buscar asignatura..."
                                                        searchPlaceholder="Buscar por nombre o código..."
                                                        required
                                                    />
                                                ) : (
                                                    <Input
                                                        id="edit_area"
                                                        value={editForm.data.area}
                                                        onChange={(e) => editForm.setData('area', e.target.value)}
                                                        required
                                                    />
                                                )}
                                                {editForm.errors.subject_id && (
                                                    <p className="text-xs text-destructive">{editForm.errors.subject_id}</p>
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="edit_unit_title">Unidad Sugerida</Label>
                                                <Input
                                                    id="edit_unit_title"
                                                    placeholder="Ej: Unidad 2"
                                                    value={editForm.data.unit_title}
                                                    onChange={(e) => editForm.setData('unit_title', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_short_summary">Resumen Breve</Label>
                                            <Input
                                                id="edit_short_summary"
                                                value={editForm.data.short_summary}
                                                onChange={(e) => editForm.setData('short_summary', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_description">Descripción Detallada y Contenido</Label>
                                            <textarea
                                                id="edit_description"
                                                rows={3}
                                                value={editForm.data.description}
                                                onChange={(e) => editForm.setData('description', e.target.value)}
                                                className="w-full bg-background border rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_resources_notes">Recursos / Links / Material Didáctico</Label>
                                            <Input
                                                id="edit_resources_notes"
                                                value={editForm.data.resources_notes}
                                                onChange={(e) => editForm.setData('resources_notes', e.target.value)}
                                            />
                                        </div>

                                        {topics.filter((t) => t.id !== editingTopic?.id).length > 0 && (
                                            <div className="space-y-2 pt-2 border-t">
                                                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                    <GitFork className="h-3.5 w-3.5 text-primary" /> Prerrequisitos Opcionales
                                                </Label>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Selecciona qué temas deben dominarse antes de poder aprender este tema.
                                                </p>
                                                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-muted/30 rounded-lg border text-xs">
                                                    {topics
                                                        .filter((t) => t.id !== editingTopic?.id)
                                                        .map((t) => (
                                                            <label
                                                                key={t.id}
                                                                className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editForm.data.prerequisite_ids.includes(t.id)}
                                                                    onChange={() => toggleEditPrerequisite(t.id)}
                                                                    className="rounded text-primary"
                                                                />
                                                                <span className="font-medium text-foreground">{t.title}</span>
                                                                <span className="text-[10px] text-muted-foreground">({t.area})</span>
                                                            </label>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setOpenEditDialog(false);
                                                    setEditingTopic(null);
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
                        )}
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar en el banco de temas..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs"
                        />
                    </div>

                    <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                        <Button
                            size="sm"
                            variant={selectedArea === 'all' ? 'default' : 'outline'}
                            onClick={() => setSelectedArea('all')}
                            className="text-xs h-8"
                        >
                            Todas ({topics.length})
                        </Button>
                        {areas.map((area) => (
                            <Button
                                key={area}
                                size="sm"
                                variant={selectedArea === area ? 'default' : 'outline'}
                                onClick={() => setSelectedArea(area)}
                                className="text-xs h-8"
                            >
                                {area}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Content: Empty State */}
                {filteredTopics.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                        <Library className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                        <p className="font-medium">No se encontraron temas en el banco global.</p>
                        <p className="text-xs mt-1">El catálogo maestro aún no contiene temas registrados.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* View 1: Card Grid View */
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredTopics.map((topic) => (
                            <div
                                key={topic.id}
                                className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs hover:border-primary/40 transition-colors"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                {topic.subject?.name || topic.area}
                                            </span>
                                            {topic.unit_title && (
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {topic.unit_title}
                                                </span>
                                            )}
                                        </div>

                                        {isGlobalMode && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleStartEdit(topic)}
                                                    title="Editar tema"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDelete(topic)}
                                                    title="Eliminar tema"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="mt-2.5 text-base font-semibold text-foreground">
                                        {topic.title}
                                    </h3>

                                    {topic.short_summary && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {topic.short_summary}
                                        </p>
                                    )}

                                    {topic.description && (
                                        <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                                            {topic.description}
                                        </p>
                                    )}
                                </div>

                                {topic.prerequisites && topic.prerequisites.length > 0 && (
                                    <div className="mt-4 pt-3 border-t">
                                        <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                            <GitFork className="h-3 w-3" /> Requiere previamente:
                                        </span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {topic.prerequisites.map((p) => (
                                                <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                    {p.title}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    /* View 2: High-density List / Table View */
                    <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-muted/60 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[220px]">
                                        Título del Tema
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[140px]">
                                        Asignatura
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[110px]">
                                        Unidad
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground">
                                        Prerrequisitos
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground max-w-xs">
                                        Resumen
                                    </th>
                                    {isGlobalMode && (
                                        <th className="px-4 py-3 font-semibold text-foreground text-right min-w-[80px]">
                                            Acciones
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredTopics.map((topic) => (
                                    <tr key={topic.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            <span>{topic.title}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                {topic.subject?.name || topic.area}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {topic.unit_title || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {topic.prerequisites && topic.prerequisites.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {topic.prerequisites.map((p) => (
                                                        <span
                                                            key={p.id}
                                                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                                        >
                                                            <GitFork className="h-2.5 w-2.5 text-primary" /> {p.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/60 text-[11px]">Ninguno</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                                            {topic.short_summary || topic.description || '—'}
                                        </td>
                                        {isGlobalMode && (
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleStartEdit(topic)}
                                                        title="Editar tema"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDelete(topic)}
                                                        title="Eliminar tema"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
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

TopicsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Banco de Temas',
            href: '/topics',
        },
    ],
};
