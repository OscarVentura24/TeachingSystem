import React, { useState, useMemo } from 'react';
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
    Sparkles,
    Share2,
    Copy,
    ListFilter,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    CornerDownRight,
    Layers,
    FolderTree,
    ChevronUp,
    ChevronDown,
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
    parent_id?: number | null;
    sort_order?: number;
    parent?: { id: number; title: string };
    subtopics?: TopicItem[];
    subject_id?: number;
    subject?: SubjectItem;
    unit_title?: string;
    short_summary?: string;
    description?: string;
    resources_notes?: string;
    estimated_minutes?: number;
    is_global?: boolean;
    status?: string;
    institution_id?: number | null;
    institution?: { id: number; name: string };
    source_topic_id?: number | null;
    source_topic?: { id: number; title: string };
    prerequisites: Array<{ id: number; title: string }>;
}

interface ParentTopicOption {
    id: number;
    title: string;
    area: string;
    unit_title?: string;
    is_global?: boolean;
    institution_id?: number | null;
}

interface Props {
    topics: TopicItem[];
    parentTopics?: ParentTopicOption[];
    globalSuggestions?: TopicItem[];
    subjects: SubjectItem[];
    areas: string[];
    isGlobalMode?: boolean;
    activeInstitution?: { id: number; name: string } | null;
}

type TopicSortField = 'title' | 'area' | 'unit' | 'minutes' | 'scope';
type TopicSortDirection = 'asc' | 'desc';

export default function TopicsIndex({
    topics,
    parentTopics = [],
    globalSuggestions = [],
    subjects,
    areas,
    isGlobalMode = false,
    activeInstitution,
}: Props) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [openDialog, setOpenDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
    const [selectedArea, setSelectedArea] = useState<string>('all');
    const [filterScope, setFilterScope] = useState<'all' | 'global' | 'institution'>('all');
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<TopicSortField>('title');
    const [sortDirection, setSortDirection] = useState<TopicSortDirection>('asc');

    const createForm = useForm({
        title: '',
        parent_id: '' as string | number,
        source_topic_id: '' as string | number,
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
        parent_id: '' as string | number,
        subject_id: '',
        area: '',
        unit_title: '',
        short_summary: '',
        description: '',
        resources_notes: '',
        estimated_minutes: '',
        prerequisite_ids: [] as number[],
    });

    const handleSort = (field: TopicSortField) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleSortDropdownChange = (val: string) => {
        const parts = val.split('_');
        const dir = parts.pop() as TopicSortDirection;
        const field = parts.join('_') as TopicSortField;
        if (field && dir) {
            setSortField(field);
            setSortDirection(dir);
        }
    };

    const renderSortIcon = (field: TopicSortField) => {
        if (sortField !== field) {
            return (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
            );
        }
        return sortDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
        );
    };

    const filteredAndSortedTopics = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = topics.filter((t) => {
            const matchesArea =
                selectedArea === 'all' ||
                t.area === selectedArea ||
                (t.subject && t.subject.name === selectedArea);

            const matchesScope =
                filterScope === 'all' ||
                (filterScope === 'global' && t.is_global) ||
                (filterScope === 'institution' && (!t.is_global || t.institution_id !== null));

            const matchesSearch =
                !query ||
                t.title.toLowerCase().includes(query) ||
                (t.unit_title && t.unit_title.toLowerCase().includes(query)) ||
                (t.description && t.description.toLowerCase().includes(query)) ||
                (t.area && t.area.toLowerCase().includes(query)) ||
                (t.institution && t.institution.name.toLowerCase().includes(query)) ||
                (t.subtopics && t.subtopics.some((s) => s.title.toLowerCase().includes(query)));

            return matchesArea && matchesScope && matchesSearch;
        });

        return [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'title':
                    comparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
                    break;
                case 'area': {
                    const areaA = a.subject?.name || a.area || '';
                    const areaB = b.subject?.name || b.area || '';
                    comparison = areaA.localeCompare(areaB, 'es', { sensitivity: 'base' });
                    break;
                }
                case 'unit': {
                    const unitA = a.unit_title || '';
                    const unitB = b.unit_title || '';
                    comparison = unitA.localeCompare(unitB, 'es', { sensitivity: 'base' });
                    break;
                }
                case 'minutes':
                    comparison = (a.estimated_minutes || 0) - (b.estimated_minutes || 0);
                    break;
                case 'scope': {
                    const scopeVal = (item: TopicItem) => (item.is_global && !item.institution_id ? 2 : 1);
                    comparison = scopeVal(b) - scopeVal(a);
                    break;
                }
                default:
                    comparison = 0;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [topics, selectedArea, filterScope, search, sortField, sortDirection]);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/topics', {
            onSuccess: () => {
                setOpenDialog(false);
                createForm.reset();
            },
        });
    };

    const handleOpenCreateSubtopic = (parentTopic: TopicItem) => {
        createForm.reset();
        createForm.setData({
            title: '',
            parent_id: parentTopic.id,
            source_topic_id: '',
            subject_id: parentTopic.subject_id ? String(parentTopic.subject_id) : '',
            area: parentTopic.area,
            unit_title: parentTopic.unit_title || '',
            short_summary: '',
            description: '',
            resources_notes: '',
            estimated_minutes: '',
            prerequisite_ids: [],
        });
        setOpenDialog(true);
    };

    const handleStartEdit = (topic: TopicItem) => {
        setEditingTopic(topic);
        editForm.setData({
            title: topic.title || '',
            parent_id: topic.parent_id ? String(topic.parent_id) : '',
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
        const isGlobal = topic.is_global && !topic.institution_id;
        const msg = isGlobal
            ? `¿Estás seguro de eliminar el tema "${topic.title}" del Banco Global?\n\nLos cursos que ya tengan este tema en su pensum conservarán su copia local histórica, pero ya no aparecerá disponible para nuevos cursos.`
            : `¿Estás seguro de eliminar el tema institucional "${topic.title}"?\n\nSolo será eliminado del banco de temas de tu institución.`;

        if (confirm(msg)) {
            router.delete(`/topics/${topic.id}`);
        }
    };

    const handlePromote = (topic: TopicItem) => {
        if (
            confirm(
                `¿Habilitar el tema "${topic.title}" para el Banco Global?\n\nAl aprobarlo, todas las instituciones del sistema tendrán este tema disponible en su catálogo.`
            )
        ) {
            router.post(`/topics/${topic.id}/promote`);
        }
    };

    const handleForkGlobalTopic = (topic: TopicItem) => {
        createForm.setData({
            title: topic.title,
            source_topic_id: topic.id,
            subject_id: topic.subject_id ? String(topic.subject_id) : '',
            area: topic.area || '',
            unit_title: topic.unit_title || '',
            short_summary: topic.short_summary || '',
            description: topic.description || '',
            resources_notes: topic.resources_notes || '',
            estimated_minutes: topic.estimated_minutes ? String(topic.estimated_minutes) : '',
            prerequisite_ids: topic.prerequisites ? topic.prerequisites.map((p) => p.id) : [],
        });
        setOpenDialog(true);
    };

    const handleReorderSubtopics = (parentTopic: TopicItem, currentIndex: number, direction: 'up' | 'down') => {
        if (!parentTopic.subtopics || parentTopic.subtopics.length <= 1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= parentTopic.subtopics.length) return;

        const newSubtopics = [...parentTopic.subtopics];
        const temp = newSubtopics[currentIndex];
        newSubtopics[currentIndex] = newSubtopics[targetIndex];
        newSubtopics[targetIndex] = temp;

        const subtopicIds = newSubtopics.map((s) => s.id);
        router.post(`/topics/${parentTopic.id}/reorder-subtopics`, {
            subtopic_ids: subtopicIds,
        }, {
            preserveScroll: true,
        });
    };

    const handleSelectSuggestion = (val: string | number) => {
        if (!val) {
            createForm.setData('source_topic_id', '');
            return;
        }
        const s = globalSuggestions.find((item) => item.id === Number(val));
        if (s) {
            createForm.setData((prev) => ({
                ...prev,
                source_topic_id: s.id,
                title: s.title,
                subject_id: s.subject_id ? String(s.subject_id) : '',
                area: s.area || '',
                unit_title: s.unit_title || '',
                short_summary: s.short_summary || '',
                description: s.description || '',
                resources_notes: s.resources_notes || '',
                estimated_minutes: s.estimated_minutes ? String(s.estimated_minutes) : '',
                prerequisite_ids: s.prerequisites ? s.prerequisites.map((p) => p.id) : [],
            }));
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

    const suggestionOptions = globalSuggestions.map((s) => ({
        value: s.id,
        label: s.title,
        subLabel: s.subject?.name || s.area,
    }));

    return (
        <>
            <Head title="Banco de Temas - H2O Teaching System" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1.5">
                                {isGlobalMode ? (
                                    <>
                                        <Globe className="h-3 w-3" /> Plataforma Global (Super Admin)
                                    </>
                                ) : (
                                    <>
                                        <Building2 className="h-3 w-3" /> Sede: {activeInstitution?.name || 'Institucional'}
                                    </>
                                )}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Banco de Temas Didácticos</h1>
                        <p className="text-sm text-muted-foreground">
                            {isGlobalMode
                                ? 'Catálogo global de temas maestros y repositorio de temas propuestos por las sedes.'
                                : 'Banco de temas didácticos para la institución con catálogo global como sugerencias para pensums.'}
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

                        {/* Create Topic Dialog (Available for both Global Super Admin and Institutions) */}
                        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" /> Nuevo Tema
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>
                                        {isGlobalMode ? 'Crear Tema para el Banco Global' : 'Crear Tema Institucional'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {isGlobalMode
                                            ? 'Registra un nuevo tema didáctico oficial para el catálogo global del sistema.'
                                            : `Registra un tema para el banco de ${activeInstitution?.name || 'tu institución'}. Puedes usar una sugerencia global o crearlo desde cero.`}
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                                    {/* Suggestion Selector for Institutional Mode */}
                                    {!isGlobalMode && globalSuggestions.length > 0 && (
                                        <div className="rounded-lg border border-primary/20 bg-muted/30 p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Sugerencia del Catálogo Global
                                                </Label>
                                                {createForm.data.source_topic_id && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                                                        onClick={() => createForm.setData('source_topic_id', '')}
                                                    >
                                                        Desvincular
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                Selecciona un tema global para precargar la información didáctica. Si lo editas, se guardará como tema propio de tu institución.
                                            </p>
                                            <SearchableSelect
                                                options={suggestionOptions}
                                                value={createForm.data.source_topic_id}
                                                onChange={handleSelectSuggestion}
                                                placeholder="Seleccionar sugerencia global opcional..."
                                                searchPlaceholder="Buscar en el catálogo oficial..."
                                            />
                                            {createForm.data.source_topic_id && (
                                                <p className="text-[11px] text-primary flex items-center gap-1 font-medium">
                                                    <Globe className="h-3 w-3 shrink-0" /> Vinculado a tema global sugerido #{createForm.data.source_topic_id}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Optional Parent Topic Selection (1-level subtopics) */}
                                    {parentTopics.length > 0 && (
                                        <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="create_parent_id" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                                    <FolderTree className="h-3.5 w-3.5 text-primary" /> ¿Es un Subtema? (Opcional)
                                                </Label>
                                                {createForm.data.parent_id && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                                                        onClick={() => createForm.setData('parent_id', '')}
                                                    >
                                                        Crear como principal
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                Si es parte de un tema macro (ej: "Actualizar" dentro de "Menú Contextual"), selecciónalo aquí.
                                            </p>
                                            <select
                                                id="create_parent_id"
                                                value={createForm.data.parent_id}
                                                onChange={(e) => {
                                                    const pId = e.target.value;
                                                    createForm.setData('parent_id', pId);
                                                    if (pId) {
                                                        const p = parentTopics.find((pt) => String(pt.id) === String(pId));
                                                        if (p?.unit_title && !createForm.data.unit_title) {
                                                            createForm.setData('unit_title', p.unit_title);
                                                        }
                                                    }
                                                }}
                                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                                            >
                                                <option value="">Ninguno (Tema Principal)</option>
                                                {parentTopics.map((pt) => (
                                                    <option key={pt.id} value={pt.id}>
                                                        {pt.title} ({pt.area})
                                                    </option>
                                                ))}
                                            </select>
                                            {createForm.errors.parent_id && (
                                                <p className="text-xs text-destructive">{createForm.errors.parent_id}</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label htmlFor="create_title">Título del Tema *</Label>
                                        <Input
                                            id="create_title"
                                            autoFocus
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
                                                {isGlobalMode && (
                                                    <Link
                                                        href="/subjects"
                                                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <Plus className="h-2.5 w-2.5" /> Nueva
                                                    </Link>
                                                )}
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
                                            placeholder="Explicación didáctica resumida"
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
                                            placeholder="Detalles sobre los conceptos explicados en este tema..."
                                            className="w-full bg-background border rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="create_resources_notes">Recursos / Links / Material Didáctico</Label>
                                        <Input
                                            id="create_resources_notes"
                                            placeholder="Ej: Guías, diapositivas, ejercicios recomendados"
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
                                                Selecciona qué temas deben dominarse antes de aprender este tema.
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
                                            {createForm.processing ? 'Guardando...' : 'Guardar Tema'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Edit Topic Dialog */}
                        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Editar Tema Didáctico</DialogTitle>
                                    <DialogDescription>
                                        Modifica la información didáctica, asignatura y prerrequisitos del tema.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                                    {/* Optional Parent Topic Selection (1-level subtopics) */}
                                    {parentTopics.filter((pt) => pt.id !== editingTopic?.id).length > 0 && (
                                        <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                                            <Label htmlFor="edit_parent_id" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                                <FolderTree className="h-3.5 w-3.5 text-primary" /> Tema Padre (Jerarquía de 1 nivel)
                                            </Label>
                                            <select
                                                id="edit_parent_id"
                                                value={editForm.data.parent_id}
                                                onChange={(e) => editForm.setData('parent_id', e.target.value)}
                                                disabled={Boolean(editingTopic?.subtopics && editingTopic.subtopics.length > 0)}
                                                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50"
                                            >
                                                <option value="">Ninguno (Tema Principal)</option>
                                                {parentTopics
                                                    .filter((pt) => pt.id !== editingTopic?.id)
                                                    .map((pt) => (
                                                        <option key={pt.id} value={pt.id}>
                                                            {pt.title} ({pt.area})
                                                        </option>
                                                    ))}
                                            </select>
                                            {editingTopic?.subtopics && editingTopic.subtopics.length > 0 && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    Este tema contiene {editingTopic.subtopics.length} subtema(s), por lo que actúa como tema principal.
                                                </p>
                                            )}
                                            {editForm.errors.parent_id && (
                                                <p className="text-xs text-destructive">{editForm.errors.parent_id}</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit_title">Título del Tema *</Label>
                                        <Input
                                            id="edit_title"
                                            autoFocus
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
                                            <Label htmlFor="edit_subject_id">Asignatura *</Label>
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
                                                Selecciona qué temas deben dominarse antes de aprender este tema.
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
                    </div>
                </div>

                {/* Scope filter, Sorting and Search Bar */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                    <div className="flex flex-1 flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                autoFocus
                                placeholder="Buscar por título, área o unidad..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 text-xs"
                            />
                        </div>

                        {/* Scope Toggle (Todos / Oficiales / Institucionales) */}
                        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 text-xs">
                            <button
                                type="button"
                                className={`px-2.5 py-1 rounded-md transition-colors ${filterScope === 'all' ? 'bg-background font-semibold shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setFilterScope('all')}
                            >
                                Todos ({topics.length})
                            </button>
                            <button
                                type="button"
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${filterScope === 'global' ? 'bg-background font-semibold shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setFilterScope('global')}
                            >
                                <Globe className="h-3 w-3 text-blue-500" /> Catálogo Global
                            </button>
                            <button
                                type="button"
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${filterScope === 'institution' ? 'bg-background font-semibold shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setFilterScope('institution')}
                            >
                                <Building2 className="h-3 w-3 text-emerald-500" /> Institucionales
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                        {/* Area filter */}
                        <div className="flex flex-wrap gap-1">
                            <Button
                                size="sm"
                                variant={selectedArea === 'all' ? 'default' : 'outline'}
                                onClick={() => setSelectedArea('all')}
                                className="text-xs h-8 px-2.5"
                            >
                                Todas las áreas
                            </Button>
                            {areas.map((area) => (
                                <Button
                                    key={area}
                                    size="sm"
                                    variant={selectedArea === area ? 'default' : 'outline'}
                                    onClick={() => setSelectedArea(area)}
                                    className="text-xs h-8 px-2.5"
                                >
                                    {area}
                                </Button>
                            ))}
                        </div>

                        {/* Sort Selector */}
                        <div className="flex items-center gap-1.5">
                            <ListFilter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">Ordenar:</span>
                            <select
                                value={`${sortField}_${sortDirection}`}
                                onChange={(e) => handleSortDropdownChange(e.target.value)}
                                className="h-8 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="title_asc">Título (A → Z)</option>
                                <option value="title_desc">Título (Z → A)</option>
                                <option value="area_asc">Asignatura (A → Z)</option>
                                <option value="area_desc">Asignatura (Z → A)</option>
                                <option value="unit_asc">Unidad (A → Z)</option>
                                <option value="unit_desc">Unidad (Z → A)</option>
                                <option value="minutes_desc">Duración (Mayor tiempo)</option>
                                <option value="minutes_asc">Duración (Menor tiempo)</option>
                                <option value="scope_asc">Origen (Oficiales primero)</option>
                            </select>
                        </div>

                        <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded-md border border-border/40 whitespace-nowrap">
                            {filteredAndSortedTopics.length} {filteredAndSortedTopics.length === 1 ? 'tema' : 'temas'}
                        </span>
                    </div>
                </div>

                {/* Content: Empty State */}
                {filteredAndSortedTopics.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                        <Library className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                        <p className="font-medium">No se encontraron temas en el banco con los filtros actuales.</p>
                        <p className="text-xs mt-1">Crea un nuevo tema o ajusta tus términos de búsqueda o filtros.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* View 1: Card Grid View */
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredAndSortedTopics.map((topic) => {
                            const isGlobalMaster = Boolean(topic.is_global && !topic.institution_id);
                            const isOwnInstitutional = Boolean(
                                topic.institution_id &&
                                activeInstitution &&
                                topic.institution_id === activeInstitution.id
                            );
                            const canEdit = isGlobalMode ? isGlobalMaster : isOwnInstitutional;
                            const canDelete = isGlobalMode ? isGlobalMaster : isOwnInstitutional;
                            const canPromote = Boolean(isGlobalMode && !topic.is_global && topic.institution_id);
                            const canFork = Boolean(!isGlobalMode && topic.is_global);

                            return (
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

                                                {topic.is_global && !topic.institution_id && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                                        <Globe className="h-3 w-3" /> Oficial
                                                    </span>
                                                )}

                                                {topic.institution_id && !topic.is_global && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <Building2 className="h-3 w-3" /> Sede{topic.institution?.name && isGlobalMode ? ` (${topic.institution.name})` : ''}
                                                    </span>
                                                )}

                                                {topic.institution_id && topic.is_global && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                                        <Globe className="h-3 w-3" /> Aprobado Global{topic.institution?.name ? ` (${topic.institution.name})` : ''}
                                                    </span>
                                                )}

                                                {topic.unit_title && (
                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                        {topic.unit_title}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {canFork && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleForkGlobalTopic(topic)}
                                                        title="Adoptar como tema institucional de mi sede"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {canPromote && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                                        onClick={() => handlePromote(topic)}
                                                        title="Habilitar este tema para todas las instituciones"
                                                    >
                                                        <Share2 className="h-3 w-3" /> Aprobar Global
                                                    </Button>
                                                )}
                                                {canEdit && (
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
                                                )}
                                                {canDelete && (
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
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="mt-2.5 text-base font-semibold text-foreground">
                                            {topic.title}
                                        </h3>

                                        {topic.source_topic && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                                <Sparkles className="h-2.5 w-2.5 text-primary" /> Sugerencia base: {topic.source_topic.title}
                                            </p>
                                        )}

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

                                        {/* Subtopics Section */}
                                        {topic.subtopics && topic.subtopics.length > 0 ? (
                                            <div className="mt-3 pt-2.5 border-t border-dashed">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                                        <Layers className="h-3.5 w-3.5 text-primary" /> Subtemas ({topic.subtopics.length}):
                                                    </span>
                                                    {canEdit && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10 gap-1"
                                                            onClick={() => handleOpenCreateSubtopic(topic)}
                                                            title="Agregar subtema a este tema"
                                                        >
                                                            <Plus className="h-3 w-3" /> Subtema
                                                        </Button>
                                                    )}
                                                </div>
                                                <ul className="space-y-1">
                                                    {topic.subtopics.map((sub, sIdx) => (
                                                        <li
                                                            key={sub.id}
                                                            className="text-xs text-muted-foreground flex items-center justify-between group/sub py-0.5 px-1 rounded hover:bg-muted/40 hover:text-foreground transition-colors"
                                                        >
                                                            <span className="flex items-center gap-1.5 truncate">
                                                                <CornerDownRight className="h-3 w-3 text-primary/60 shrink-0" />
                                                                <span className="font-mono text-[9px] text-muted-foreground/80 bg-background px-1 py-0.5 rounded border shrink-0">
                                                                    {sIdx + 1}
                                                                </span>
                                                                <span className="truncate">{sub.title}</span>
                                                            </span>
                                                            {canEdit && (
                                                                <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                                                        disabled={sIdx === 0}
                                                                        onClick={() => handleReorderSubtopics(topic, sIdx, 'up')}
                                                                        title="Subir subtema"
                                                                    >
                                                                        <ChevronUp className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                                                        disabled={sIdx === topic.subtopics!.length - 1}
                                                                        onClick={() => handleReorderSubtopics(topic, sIdx, 'down')}
                                                                        title="Bajar subtema"
                                                                    >
                                                                        <ChevronDown className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                                                        onClick={() => handleStartEdit(sub)}
                                                                        title="Editar subtema"
                                                                    >
                                                                        <Pencil className="h-2.5 w-2.5" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                                                        onClick={() => handleDelete(sub)}
                                                                        title="Eliminar subtema"
                                                                    >
                                                                        <Trash2 className="h-2.5 w-2.5" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            canEdit && (
                                                <div className="mt-3 pt-2 border-t border-dashed flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-primary gap-1"
                                                        onClick={() => handleOpenCreateSubtopic(topic)}
                                                        title="Agregar subtema"
                                                    >
                                                        <Plus className="h-3 w-3" /> Agregar Subtema
                                                    </Button>
                                                </div>
                                            )
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
                            );
                        })}
                    </div>
                ) : (
                    /* View 2: High-density List / Table View */
                    <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-muted/60 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[220px]">
                                        <button
                                            type="button"
                                            onClick={() => handleSort('title')}
                                            className="flex items-center gap-1.5 hover:text-primary transition-colors group cursor-pointer text-left"
                                            title="Ordenar por título"
                                        >
                                            <span>Título del Tema</span>
                                            {renderSortIcon('title')}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[130px]">
                                        <button
                                            type="button"
                                            onClick={() => handleSort('scope')}
                                            className="flex items-center gap-1.5 hover:text-primary transition-colors group cursor-pointer text-left"
                                            title="Ordenar por origen"
                                        >
                                            <span>Origen</span>
                                            {renderSortIcon('scope')}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[140px]">
                                        <button
                                            type="button"
                                            onClick={() => handleSort('area')}
                                            className="flex items-center gap-1.5 hover:text-primary transition-colors group cursor-pointer text-left"
                                            title="Ordenar por asignatura"
                                        >
                                            <span>Asignatura</span>
                                            {renderSortIcon('area')}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground min-w-[100px]">
                                        <button
                                            type="button"
                                            onClick={() => handleSort('unit')}
                                            className="flex items-center gap-1.5 hover:text-primary transition-colors group cursor-pointer text-left"
                                            title="Ordenar por unidad"
                                        >
                                            <span>Unidad</span>
                                            {renderSortIcon('unit')}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground">
                                        Prerrequisitos
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground max-w-xs">
                                        Resumen
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-foreground text-right min-w-[100px]">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredAndSortedTopics.map((topic) => {
                                    const isGlobalMaster = Boolean(topic.is_global && !topic.institution_id);
                                    const isOwnInstitutional = Boolean(
                                        topic.institution_id &&
                                        activeInstitution &&
                                        topic.institution_id === activeInstitution.id
                                    );
                                    const canEdit = isGlobalMode ? isGlobalMaster : isOwnInstitutional;
                                    const canDelete = isGlobalMode ? isGlobalMaster : isOwnInstitutional;
                                    const canPromote = Boolean(isGlobalMode && !topic.is_global && topic.institution_id);
                                    const canFork = Boolean(!isGlobalMode && topic.is_global);

                                    return (
                                        <tr key={topic.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-foreground">
                                                <div className="font-semibold">{topic.title}</div>
                                                {topic.subtopics && topic.subtopics.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                        <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                                            {topic.subtopics.length} subtema(s):
                                                        </span>
                                                        {topic.subtopics.map((sub, sIdx) => (
                                                            <span
                                                                key={sub.id}
                                                                className="text-[10px] text-muted-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/40 hover:bg-muted/70 group/tabsub transition-colors"
                                                            >
                                                                <CornerDownRight className="h-2.5 w-2.5 text-primary" />
                                                                <span className="font-mono text-[9px] text-muted-foreground/80 font-bold">{sIdx + 1}.</span>
                                                                <span>{sub.title}</span>
                                                                {canEdit && (
                                                                    <span className="inline-flex items-center gap-0.5 ml-0.5 opacity-0 group-hover/tabsub:opacity-100 transition-opacity">
                                                                        <button
                                                                            type="button"
                                                                            disabled={sIdx === 0}
                                                                            onClick={(e) => { e.stopPropagation(); handleReorderSubtopics(topic, sIdx, 'up'); }}
                                                                            className="p-0.5 hover:text-foreground disabled:opacity-20"
                                                                            title="Subir subtema"
                                                                        >
                                                                            <ChevronUp className="h-2.5 w-2.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={sIdx === topic.subtopics!.length - 1}
                                                                            onClick={(e) => { e.stopPropagation(); handleReorderSubtopics(topic, sIdx, 'down'); }}
                                                                            className="p-0.5 hover:text-foreground disabled:opacity-20"
                                                                            title="Bajar subtema"
                                                                        >
                                                                            <ChevronDown className="h-2.5 w-2.5" />
                                                                        </button>
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {topic.source_topic && (
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Sparkles className="h-2.5 w-2.5 text-primary" /> Base: {topic.source_topic.title}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {topic.is_global && !topic.institution_id && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                                        <Globe className="h-3 w-3" /> Oficial
                                                    </span>
                                                )}
                                                {topic.institution_id && !topic.is_global && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <Building2 className="h-3 w-3" /> {topic.institution?.name ? topic.institution.name : 'Sede'}
                                                    </span>
                                                )}
                                                {topic.institution_id && topic.is_global && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                                        <Globe className="h-3 w-3" /> Global Aprobado
                                                    </span>
                                                )}
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
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canFork && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleForkGlobalTopic(topic)}
                                                            title="Adoptar como tema institucional de mi sede"
                                                        >
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {canPromote && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                                            onClick={() => handlePromote(topic)}
                                                            title="Aprobar para el Banco Global"
                                                        >
                                                            <Share2 className="h-3 w-3" /> Aprobar
                                                        </Button>
                                                    )}
                                                    {canEdit && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                                            onClick={() => handleOpenCreateSubtopic(topic)}
                                                            title="Agregar subtema a este tema"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {canEdit && (
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
                                                    )}
                                                    {canDelete && (
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
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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
