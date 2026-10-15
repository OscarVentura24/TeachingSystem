import React, { useState, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    Copy,
    Sparkles,
    BookOpen,
    Layers,
    Search,
    CheckCircle2,
    Calendar,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Check,
    Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

export interface CandidateCourseItem {
    id: number;
    name: string;
    code?: string;
    section?: string;
    academic_period?: {
        id: number;
        name: string;
        is_current: boolean;
    } | null;
    topics_count: number;
    root_topics_count: number;
    units_count: number;
    units: string[];
    is_recommended: boolean;
    match_reason?: string | null;
    score: number;
    topics_tree: Array<{
        id: number;
        title: string;
        unit_title?: string;
        description?: string;
        subtopics_count: number;
        subtopics: Array<{
            id: number;
            title: string;
            unit_title?: string;
        }>;
    }>;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentCourse: {
        id: number;
        name: string;
        code?: string;
        section?: string;
        course_topics?: any[];
    };
    candidateCourses: CandidateCourseItem[];
}

export function ClonePensumDialog({
    open,
    onOpenChange,
    currentCourse,
    candidateCourses = [],
}: Props) {
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(() => {
        // Default to first recommended course if available, or first course
        if (candidateCourses.length > 0) {
            const recommended = candidateCourses.find((c) => c.is_recommended);
            return recommended ? recommended.id : candidateCourses[0].id;
        }
        return null;
    });

    const [searchCourse, setSearchCourse] = useState('');
    const [mode, setMode] = useState<'merge' | 'replace' | 'selected'>('merge');
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

    const currentTopicsCount = currentCourse.course_topics?.length ?? 0;

    // Filter candidate courses
    const filteredCandidateCourses = useMemo(() => {
        if (!searchCourse.trim()) return candidateCourses;
        const q = searchCourse.toLowerCase().trim();
        return candidateCourses.filter((c) => {
            const nameMatch = c.name.toLowerCase().includes(q);
            const codeMatch = c.code ? c.code.toLowerCase().includes(q) : false;
            const sectionMatch = c.section ? c.section.toLowerCase().includes(q) : false;
            const periodMatch = c.academic_period ? c.academic_period.name.toLowerCase().includes(q) : false;
            return nameMatch || codeMatch || sectionMatch || periodMatch;
        });
    }, [candidateCourses, searchCourse]);

    // Active selected source course
    const selectedCourse = useMemo(() => {
        return candidateCourses.find((c) => c.id === selectedCourseId) || null;
    }, [candidateCourses, selectedCourseId]);

    // Group selected course topics by unit
    const sourceTopicsByUnit = useMemo(() => {
        if (!selectedCourse) return {};
        const groups: Record<string, typeof selectedCourse.topics_tree> = {};

        selectedCourse.topics_tree.forEach((topic) => {
            const unit = topic.unit_title || 'Temas Generales';
            if (!groups[unit]) {
                groups[unit] = [];
            }
            groups[unit].push(topic);
        });

        return groups;
    }, [selectedCourse]);

    // Select/deselect topic in 'selected' mode
    const toggleTopicSelection = (id: number) => {
        setSelectedTopicIds((prev) =>
            prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
        );
    };

    const toggleAllTopicsInUnit = (unitTopics: CandidateCourseItem['topics_tree']) => {
        const topicIds = unitTopics.map((t) => t.id);
        const allSelected = topicIds.every((id) => selectedTopicIds.includes(id));

        if (allSelected) {
            setSelectedTopicIds((prev) => prev.filter((id) => !topicIds.includes(id)));
        } else {
            setSelectedTopicIds((prev) => Array.from(new Set([...prev, ...topicIds])));
        }
    };

    const toggleUnitExpansion = (unit: string) => {
        setExpandedUnits((prev) => ({
            ...prev,
            [unit]: !prev[unit],
        }));
    };

    const handleSelectCourse = (id: number) => {
        setSelectedCourseId(id);
        const course = candidateCourses.find((c) => c.id === id);
        if (course) {
            // Default select all topics of the newly chosen course
            setSelectedTopicIds(course.topics_tree.map((t) => t.id));
        }
    };

    // Calculate count of topics to be imported
    const totalToImportCount = useMemo(() => {
        if (!selectedCourse) return 0;
        if (mode === 'selected') {
            const selectedRoots = selectedCourse.topics_tree.filter((t) =>
                selectedTopicIds.includes(t.id)
            );
            const subCount = selectedRoots.reduce((acc, t) => acc + t.subtopics_count, 0);
            return selectedRoots.length + subCount;
        }
        return selectedCourse.topics_count;
    }, [selectedCourse, mode, selectedTopicIds]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;

        if (mode === 'replace' && currentTopicsCount > 0) {
            confirm({
                title: '¿Reemplazar todo el pensum actual?',
                description: `Se eliminarán los ${currentTopicsCount} temas existentes en este curso y se sustituirán por los ${totalToImportCount} temas de "${selectedCourse.name}". Esta acción no se puede deshacer.`,
                confirmText: 'Reemplazar Pensum',
                variant: 'destructive',
                onConfirm: () => executeClone(),
            });
            return;
        }

        executeClone();
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const executeClone = () => {
        if (!selectedCourse) return;

        setIsSubmitting(true);
        router.post(
            `/courses/${currentCourse.id}/clone-pensum`,
            {
                source_course_id: selectedCourse.id,
                mode,
                selected_topic_ids: mode === 'selected' ? selectedTopicIds : [],
            },
            {
                onSuccess: () => {
                    setIsSubmitting(false);
                    onOpenChange(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Duplicar Pensum de Otro Curso
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Copia la estructura de temas, unidades y subtemas de un curso existente a{' '}
                        <strong className="text-foreground">{currentCourse.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {candidateCourses.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="font-medium text-foreground">No hay otros cursos con pensum disponible</p>
                        <p>
                            Para duplicar un pensum, primero debes tener al menos otro curso en la institución con temas registrados.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-5 pt-3 overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
                            {/* Left Column: Source Course Selector */}
                            <div className="md:col-span-5 flex flex-col min-h-0 space-y-3 border-r pr-0 md:pr-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                        <span>1. Selecciona el Curso de Referencia</span>
                                        <span className="text-[10px] text-muted-foreground font-normal">
                                            {filteredCandidateCourses.length} disponible{filteredCandidateCourses.length === 1 ? '' : 's'}
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por materia, código o período..."
                                            value={searchCourse}
                                            onChange={(e) => setSearchCourse(e.target.value)}
                                            className="h-8 pl-8 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                    {filteredCandidateCourses.map((candidate) => {
                                        const isSelected = candidate.id === selectedCourseId;
                                        return (
                                            <div
                                                key={candidate.id}
                                                onClick={() => handleSelectCourse(candidate.id)}
                                                className={`p-3 rounded-xl border text-left cursor-pointer transition-all select-none space-y-1.5 ${
                                                    isSelected
                                                        ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                                                        : 'bg-muted/10 border-border/70 hover:bg-muted/25'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-1">
                                                    <h4 className="font-semibold text-xs text-foreground leading-tight">
                                                        {candidate.name}
                                                    </h4>
                                                    {candidate.section && (
                                                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                                                            {candidate.section}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    {candidate.academic_period && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                                            {candidate.academic_period.name}
                                                        </span>
                                                    )}
                                                    {candidate.code && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="font-mono">{candidate.code}</span>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <BookOpen className="h-3 w-3" />
                                                        <strong>{candidate.topics_count}</strong> temas ({candidate.units_count} unidades)
                                                    </span>

                                                    {candidate.is_recommended && (
                                                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 gap-1 text-[9px] px-1.5 py-0">
                                                            <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
                                                            {candidate.match_reason || 'Recomendado'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Column: Pensum Preview & Strategy */}
                            <div className="md:col-span-7 flex flex-col min-h-0 space-y-4 pl-0 md:pl-1">
                                {/* Mode Selection */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-foreground">
                                        2. Modo de Importación del Pensum
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMode('merge')}
                                            className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between select-none ${
                                                mode === 'merge'
                                                    ? 'bg-primary/5 border-primary font-semibold ring-1 ring-primary/20 text-foreground'
                                                    : 'bg-muted/15 border-border/70 hover:bg-muted/30 text-muted-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 text-foreground">
                                                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                                <span>Fusión Inteligente</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-normal font-normal">
                                                Anexa solo temas nuevos sin duplicar los ya presentes.
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setMode('replace')}
                                            className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between select-none ${
                                                mode === 'replace'
                                                    ? 'bg-destructive/5 border-destructive font-semibold ring-1 ring-destructive/20 text-foreground'
                                                    : 'bg-muted/15 border-border/70 hover:bg-muted/30 text-muted-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 text-destructive">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                <span>Reemplazar Todo</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-normal font-normal">
                                                Sustituye todo el pensum actual por el de referencia.
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMode('selected');
                                                if (selectedCourse && selectedTopicIds.length === 0) {
                                                    setSelectedTopicIds(selectedCourse.topics_tree.map((t) => t.id));
                                                }
                                            }}
                                            className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between select-none ${
                                                mode === 'selected'
                                                    ? 'bg-primary/5 border-primary font-semibold ring-1 ring-primary/20 text-foreground'
                                                    : 'bg-muted/15 border-border/70 hover:bg-muted/30 text-muted-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 text-foreground">
                                                <Filter className="h-3.5 w-3.5 text-blue-500" />
                                                <span>Seleccionar Temas</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-normal font-normal">
                                                Elige manualmente qué unidades o temas copiar.
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {/* Interactive Preview Tree */}
                                <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">
                                            3. Vista Previa del Contenido ({selectedCourse?.topics_count ?? 0} temas)
                                        </span>
                                        {mode === 'selected' && selectedCourse && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allIds = selectedCourse.topics_tree.map((t) => t.id);
                                                    if (selectedTopicIds.length === allIds.length) {
                                                        setSelectedTopicIds([]);
                                                    } else {
                                                        setSelectedTopicIds(allIds);
                                                    }
                                                }}
                                                className="text-[11px] text-primary hover:underline"
                                            >
                                                {selectedTopicIds.length === selectedCourse.topics_tree.length
                                                    ? 'Deseleccionar todos'
                                                    : 'Seleccionar todos'}
                                            </button>
                                        )}
                                    </div>

                                    {!selectedCourse ? (
                                        <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl bg-muted/10">
                                            Selecciona un curso en la columna izquierda para ver su pensum.
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto border rounded-xl divide-y bg-card pr-1 max-h-[300px]">
                                            {Object.entries(sourceTopicsByUnit).map(([unit, unitTopics]) => {
                                                const isExpanded = expandedUnits[unit] ?? true;
                                                const unitTopicIds = unitTopics.map((t) => t.id);
                                                const isAllUnitSelected = unitTopicIds.every((id) =>
                                                    selectedTopicIds.includes(id)
                                                );

                                                return (
                                                    <div key={unit} className="p-2.5 space-y-1.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                {mode === 'selected' && (
                                                                    <Checkbox
                                                                        checked={isAllUnitSelected}
                                                                        onCheckedChange={() => toggleAllTopicsInUnit(unitTopics)}
                                                                        className="h-3.5 w-3.5"
                                                                    />
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleUnitExpansion(unit)}
                                                                    className="font-bold text-xs text-foreground flex items-center gap-1.5 hover:text-primary transition-colors text-left"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                    ) : (
                                                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                    )}
                                                                    <span>{unit}</span>
                                                                </button>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                {unitTopics.length} tema(s)
                                                            </span>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="pl-6 space-y-1 border-l-2 ml-2">
                                                                {unitTopics.map((topic) => {
                                                                    const isTopicSelected = selectedTopicIds.includes(topic.id);

                                                                    return (
                                                                        <div
                                                                            key={topic.id}
                                                                            className={`p-1.5 rounded-md flex items-start gap-2 text-xs transition-colors ${
                                                                                mode === 'selected'
                                                                                    ? isTopicSelected
                                                                                        ? 'bg-primary/5 text-foreground'
                                                                                        : 'opacity-60 text-muted-foreground'
                                                                                    : 'text-foreground'
                                                                            }`}
                                                                        >
                                                                            {mode === 'selected' && (
                                                                                <Checkbox
                                                                                    checked={isTopicSelected}
                                                                                    onCheckedChange={() =>
                                                                                        toggleTopicSelection(topic.id)
                                                                                    }
                                                                                    className="h-3.5 w-3.5 mt-0.5"
                                                                                />
                                                                            )}
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="font-medium truncate">
                                                                                        {topic.title}
                                                                                    </span>
                                                                                    {topic.subtopics_count > 0 && (
                                                                                        <span className="text-[9px] bg-muted px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                                                                                            +{topic.subtopics_count} subtemas
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                            <div className="text-xs text-muted-foreground">
                                {selectedCourse ? (
                                    <span>
                                        Se transferirán{' '}
                                        <strong className="text-foreground">{totalToImportCount} temas y subtemas</strong>{' '}
                                        hacia este curso.
                                    </span>
                                ) : (
                                    <span>Selecciona un curso de referencia.</span>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        isSubmitting ||
                                        !selectedCourse ||
                                        (mode === 'selected' && selectedTopicIds.length === 0)
                                    }
                                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                >
                                    <Copy className="h-4 w-4" />
                                    {isSubmitting ? 'Duplicando Pensum...' : 'Duplicar Pensum al Curso'}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}

                <ConfirmDialogComponent />
            </DialogContent>
        </Dialog>
    );
}
