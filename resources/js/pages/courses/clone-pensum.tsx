import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Sparkles,
    Copy,
    RotateCcw,
    CheckSquare,
    Layers,
    Search,
    Check,
    AlertCircle,
    Calendar,
    Building2,
    BookOpen,
    ChevronRight,
    ChevronDown,
    ArrowUpRight,
    ArrowDownLeft,
    FolderTree,
    Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

export interface CourseTopicItem {
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
}

export interface CandidateCourseItem {
    id: number;
    name: string;
    code?: string;
    section?: string;
    academic_period?: {
        id: number;
        name: string;
        is_current?: boolean;
    };
    topics_count: number;
    root_topics_count: number;
    units_count: number;
    units: string[];
    is_recommended: boolean;
    match_reason?: string;
    score: number;
    topics_tree: CourseTopicItem[];
}

export interface CandidateTargetCourseItem {
    id: number;
    name: string;
    code?: string;
    section?: string;
    academic_period?: {
        id: number;
        name: string;
        is_current?: boolean;
    };
    topics_count: number;
    is_same_period: boolean;
    existing_titles: string[];
}

interface TargetCourse {
    id: number;
    name: string;
    code?: string;
    section?: string;
    institution: {
        id: number;
        name: string;
    };
    academic_period?: {
        id: number;
        name: string;
        is_current?: boolean;
        is_closed?: boolean;
    };
    course_topics: Array<{
        id: number;
        title: string;
        unit_title?: string;
        description?: string;
        subtopics?: Array<{ id: number; title: string }>;
    }>;
}

interface Props {
    course: TargetCourse;
    candidateSourceCourses?: CandidateCourseItem[];
    candidateTargetCourses?: CandidateTargetCourseItem[];
    defaultDirection?: 'export' | 'import';
}

type DuplicationMode = 'merge' | 'replace' | 'selected';

export default function ClonePensumPage({
    course,
    candidateSourceCourses = [],
    candidateTargetCourses = [],
    defaultDirection = 'export',
}: Props) {
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    // Direction: 'export' (Duplicate this course's syllabus to another course) or 'import' (Pull syllabus from another course into this course)
    const [direction, setDirection] = useState<'export' | 'import'>(defaultDirection);

    // Selected Target Course (in Export mode)
    const [selectedTargetId, setSelectedTargetId] = useState<number | null>(() => {
        return candidateTargetCourses.length > 0 ? candidateTargetCourses[0].id : null;
    });

    // Selected Source Course (in Import mode)
    const [selectedSourceId, setSelectedSourceId] = useState<number | null>(() => {
        return candidateSourceCourses.length > 0 ? candidateSourceCourses[0].id : null;
    });

    const [mode, setMode] = useState<DuplicationMode>('merge');
    const [courseSearch, setCourseSearch] = useState('');
    const [topicSearch, setTopicSearch] = useState('');
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});
    const [processing, setProcessing] = useState(false);

    // Active candidate target course in export mode
    const activeTargetCourse = useMemo(() => {
        return candidateTargetCourses.find((c) => c.id === selectedTargetId) || null;
    }, [candidateTargetCourses, selectedTargetId]);

    // Active candidate source course in import mode
    const activeSourceCourse = useMemo(() => {
        return candidateSourceCourses.find((c) => c.id === selectedSourceId) || null;
    }, [candidateSourceCourses, selectedSourceId]);

    // Current course's topics formatted as tree
    const currentCourseTree: CourseTopicItem[] = useMemo(() => {
        return (course.course_topics || []).map((t) => ({
            id: t.id,
            title: t.title,
            unit_title: t.unit_title,
            description: t.description,
            subtopics_count: t.subtopics?.length || 0,
            subtopics: (t.subtopics || []).map((st) => ({
                id: st.id,
                title: st.title,
                unit_title: t.unit_title,
            })),
        }));
    }, [course.course_topics]);

    // Topics tree to preview:
    // In export mode: we are duplicating FROM this course -> topics to preview are currentCourseTree
    // In import mode: we are copying FROM activeSourceCourse -> topics to preview are activeSourceCourse.topics_tree
    const previewTopicsTree: CourseTopicItem[] = useMemo(() => {
        if (direction === 'export') {
            return currentCourseTree;
        } else {
            return activeSourceCourse ? activeSourceCourse.topics_tree : [];
        }
    }, [direction, currentCourseTree, activeSourceCourse]);

    // Titles already in the receiving course (for duplicate detection in merge mode)
    const receiverTitlesNormalized = useMemo(() => {
        const set = new Set<string>();
        if (direction === 'export') {
            activeTargetCourse?.existing_titles?.forEach((t) => {
                if (t) set.add(t.trim().toLowerCase());
            });
        } else {
            course.course_topics?.forEach((ct) => {
                if (ct.title) set.add(ct.title.trim().toLowerCase());
                ct.subtopics?.forEach((st) => {
                    if (st.title) set.add(st.title.trim().toLowerCase());
                });
            });
        }
        return set;
    }, [direction, activeTargetCourse, course.course_topics]);

    // Reset topic selection when source or direction changes
    useEffect(() => {
        if (previewTopicsTree.length > 0) {
            setSelectedTopicIds(previewTopicsTree.map((t) => t.id));
        } else {
            setSelectedTopicIds([]);
        }
    }, [direction, selectedSourceId, previewTopicsTree.length]);

    // Filter candidate target courses (in export mode)
    const filteredTargetCandidates = useMemo(() => {
        if (!courseSearch.trim()) return candidateTargetCourses;
        const q = courseSearch.toLowerCase();
        return candidateTargetCourses.filter((c) => {
            return (
                c.name.toLowerCase().includes(q) ||
                (c.code && c.code.toLowerCase().includes(q)) ||
                (c.section && c.section.toLowerCase().includes(q)) ||
                (c.academic_period && c.academic_period.name.toLowerCase().includes(q))
            );
        });
    }, [candidateTargetCourses, courseSearch]);

    // Filter candidate source courses (in import mode)
    const filteredSourceCandidates = useMemo(() => {
        if (!courseSearch.trim()) return candidateSourceCourses;
        const q = courseSearch.toLowerCase();
        return candidateSourceCourses.filter((c) => {
            return (
                c.name.toLowerCase().includes(q) ||
                (c.code && c.code.toLowerCase().includes(q)) ||
                (c.section && c.section.toLowerCase().includes(q)) ||
                (c.academic_period && c.academic_period.name.toLowerCase().includes(q))
            );
        });
    }, [candidateSourceCourses, courseSearch]);

    // Group preview topics by unit
    const groupedTopics = useMemo(() => {
        const groupsMap = new Map<string, CourseTopicItem[]>();

        previewTopicsTree.forEach((topic) => {
            const unit = topic.unit_title?.trim() || 'Temas Generales (Sin Unidad)';
            if (!groupsMap.has(unit)) {
                groupsMap.set(unit, []);
            }
            groupsMap.get(unit)!.push(topic);
        });

        return Array.from(groupsMap.entries()).map(([unitTitle, topics]) => ({
            unitTitle,
            topics,
        }));
    }, [previewTopicsTree]);

    // Filter grouped topics by search
    const filteredGroupedTopics = useMemo(() => {
        if (!topicSearch.trim()) return groupedTopics;
        const q = topicSearch.toLowerCase();

        return groupedTopics
            .map(({ unitTitle, topics }) => {
                const matchesUnit = unitTitle.toLowerCase().includes(q);
                const matchingTopics = topics.filter(
                    (t) =>
                        matchesUnit ||
                        t.title.toLowerCase().includes(q) ||
                        (t.description && t.description.toLowerCase().includes(q)) ||
                        t.subtopics.some((st) => st.title.toLowerCase().includes(q))
                );

                return {
                    unitTitle,
                    topics: matchingTopics,
                };
            })
            .filter((g) => g.topics.length > 0);
    }, [groupedTopics, topicSearch]);

    const toggleUnitCollapse = (unitTitle: string) => {
        setCollapsedUnits((prev) => ({
            ...prev,
            [unitTitle]: !prev[unitTitle],
        }));
    };

    const toggleTopicSelection = (topicId: number) => {
        setSelectedTopicIds((prev) =>
            prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
        );
    };

    const toggleUnitSelection = (unitTopics: CourseTopicItem[]) => {
        const unitIds = unitTopics.map((t) => t.id);
        const allSelected = unitIds.every((id) => selectedTopicIds.includes(id));

        if (allSelected) {
            setSelectedTopicIds((prev) => prev.filter((id) => !unitIds.includes(id)));
        } else {
            setSelectedTopicIds((prev) => Array.from(new Set([...prev, ...unitIds])));
        }
    };

    const handleSelectAll = (select: boolean) => {
        if (select) {
            setSelectedTopicIds(previewTopicsTree.map((t) => t.id));
        } else {
            setSelectedTopicIds([]);
        }
    };

    // Calculate transfer numbers
    const transferSummary = useMemo(() => {
        let rootsToCopy: CourseTopicItem[] = [];

        if (mode === 'selected') {
            rootsToCopy = previewTopicsTree.filter((t) => selectedTopicIds.includes(t.id));
        } else {
            rootsToCopy = previewTopicsTree;
        }

        const roots = rootsToCopy.length;
        const subtopics = rootsToCopy.reduce((acc, t) => acc + (t.subtopics?.length || 0), 0);
        const total = roots + subtopics;

        let willSkip = 0;
        let willAdd = 0;

        if (mode === 'merge') {
            rootsToCopy.forEach((t) => {
                const isExisting = receiverTitlesNormalized.has(t.title.trim().toLowerCase());
                if (isExisting) {
                    willSkip++;
                } else {
                    willAdd++;
                }
            });
        }

        return { roots, subtopics, total, willSkip, willAdd };
    }, [mode, previewTopicsTree, selectedTopicIds, receiverTitlesNormalized]);

    // Execution
    const executeDuplication = () => {
        setProcessing(true);

        const payload: Record<string, any> = {
            direction,
            mode,
            selected_topic_ids: mode === 'selected' ? selectedTopicIds : [],
        };

        if (direction === 'export') {
            payload.target_course_id = selectedTargetId;
        } else {
            payload.source_course_id = selectedSourceId;
        }

        router.post(`/courses/${course.id}/clone-pensum`, payload, {
            onFinish: () => setProcessing(false),
        });
    };

    const handleConfirmSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (direction === 'export' && !selectedTargetId) return;
        if (direction === 'import' && !selectedSourceId) return;

        if (mode === 'replace') {
            const receiverName = direction === 'export' ? activeTargetCourse?.name : course.name;
            const receiverCount = direction === 'export' ? activeTargetCourse?.topics_count || 0 : course.course_topics?.length || 0;
            const sourceName = direction === 'export' ? course.name : activeSourceCourse?.name;

            confirm({
                title: '¿Reemplazar completamente el pensum actual?',
                description: `Se eliminarán los ${receiverCount} temas actuales de "${receiverName}" y se sustituirán por el pensum de "${sourceName}". Esta acción no se puede deshacer.`,
                confirmText: 'Sí, Reemplazar Pensum',
                variant: 'destructive',
                onConfirm: executeDuplication,
            });
            return;
        }

        executeDuplication();
    };

    const currentCourseTopicCount = course.course_topics?.length || 0;

    return (
        <>
            <Head title={`Duplicar Pensum - ${course.name}`} />

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-32">
                {/* Header & Back Link */}
                <div className="flex flex-col gap-4 border-b pb-6">
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/courses/${course.id}?tab=pensum`}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-muted"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Volver a {course.name} (Pensum)</span>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                                    <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Duplicar y Fusionar Pensum
                                </h1>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
                                {direction === 'export' ? (
                                    <>
                                        Duplica la estructura de temas de <strong className="text-foreground">{course.name}</strong> hacia otro curso de la institución (por ejemplo: <strong>4to Curso</strong>, <strong>5to Curso</strong>, etc.).
                                    </>
                                ) : (
                                    <>
                                        Importa temas y unidades desde otro curso hacia <strong className="text-foreground">{course.name}</strong> de forma inteligente.
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Current Course Context Badges */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <div className="bg-muted/60 border rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">{course.institution?.name}</span>
                            </div>
                            {course.academic_period && (
                                <div className="bg-muted/60 border rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Período:</span>
                                    <span className="font-semibold text-foreground">{course.academic_period.name}</span>
                                </div>
                            )}
                            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                                <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-muted-foreground">Temas en este curso:</span>
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                    {currentCourseTopicCount}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* DIRECTION SWITCHER TABS */}
                    <div className="pt-2">
                        <div className="inline-flex p-1 bg-muted/80 border rounded-xl gap-1">
                            <button
                                type="button"
                                onClick={() => setDirection('export')}
                                className={`py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                                    direction === 'export'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ArrowUpRight className={`h-4 w-4 ${direction === 'export' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                                <span>Duplicar hacia otro curso (Exportar)</span>
                                {currentCourseTopicCount > 0 && (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 ml-1">
                                        {currentCourseTopicCount} temas
                                    </Badge>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setDirection('import')}
                                className={`py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                                    direction === 'import'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ArrowDownLeft className={`h-4 w-4 ${direction === 'import' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                                <span>Importar desde otro curso (Traer)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <form onSubmit={handleConfirmSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN: Course Selector & Duplication Mode (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* STEP 1: Selecciona el curso */}
                            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                            1
                                        </span>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            {direction === 'export'
                                                ? 'Selecciona el Curso Destino'
                                                : 'Selecciona el Curso de Referencia (Origen)'}
                                        </h2>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {direction === 'export'
                                            ? `${candidateTargetCourses.length} ${candidateTargetCourses.length === 1 ? 'disponible' : 'disponibles'}`
                                            : `${candidateSourceCourses.length} ${candidateSourceCourses.length === 1 ? 'disponible' : 'disponibles'}`}
                                    </span>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    {direction === 'export'
                                        ? `Elige qué curso recibirá la estructura de temas desde "${course.name}".`
                                        : `Elige de qué curso deseas traer la estructura hacia "${course.name}".`}
                                </p>

                                {/* Search Filter */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar curso por materia, sección o período..."
                                        value={courseSearch}
                                        onChange={(e) => setCourseSearch(e.target.value)}
                                        className="pl-9 text-xs h-9 bg-background"
                                    />
                                </div>

                                {/* List of courses */}
                                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                                    {direction === 'export' ? (
                                        filteredTargetCandidates.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                                                No se encontraron cursos destino que coincidan con &ldquo;{courseSearch}&rdquo;
                                            </div>
                                        ) : (
                                            filteredTargetCandidates.map((candidate) => {
                                                const isSelected = candidate.id === selectedTargetId;
                                                return (
                                                    <div
                                                        key={candidate.id}
                                                        onClick={() => setSelectedTargetId(candidate.id)}
                                                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-600/30'
                                                                : 'hover:border-foreground/30 hover:bg-muted/40 bg-card'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="space-y-1 min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-semibold text-sm text-foreground truncate">
                                                                        {candidate.name}
                                                                    </span>
                                                                    {candidate.section && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[10px] py-0 px-1.5 h-4 font-mono font-medium"
                                                                        >
                                                                            {candidate.section}
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                    {candidate.academic_period && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Calendar className="h-3 w-3" />
                                                                            {candidate.academic_period.name}
                                                                        </span>
                                                                    )}
                                                                    <span>•</span>
                                                                    <span>
                                                                        {candidate.topics_count === 0 ? (
                                                                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                                                0 temas (Vacío)
                                                                            </span>
                                                                        ) : (
                                                                            <span>{candidate.topics_count} temas actuales</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                                {isSelected ? (
                                                                    <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                                                        <Check className="h-3 w-3 stroke-[2.5]" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-5 w-5 rounded-full border border-muted-foreground/30" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )
                                    ) : (
                                        filteredSourceCandidates.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                                                No se encontraron cursos de referencia que coincidan con &ldquo;{courseSearch}&rdquo;
                                            </div>
                                        ) : (
                                            filteredSourceCandidates.map((candidate) => {
                                                const isSelected = candidate.id === selectedSourceId;
                                                return (
                                                    <div
                                                        key={candidate.id}
                                                        onClick={() => setSelectedSourceId(candidate.id)}
                                                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-600/30'
                                                                : 'hover:border-foreground/30 hover:bg-muted/40 bg-card'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="space-y-1 min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-semibold text-sm text-foreground truncate">
                                                                        {candidate.name}
                                                                    </span>
                                                                    {candidate.section && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[10px] py-0 px-1.5 h-4 font-mono font-medium"
                                                                        >
                                                                            {candidate.section}
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                    {candidate.academic_period && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Calendar className="h-3 w-3" />
                                                                            {candidate.academic_period.name}
                                                                        </span>
                                                                    )}
                                                                    <span>•</span>
                                                                    <span>
                                                                        <strong>{candidate.topics_count}</strong> temas
                                                                        {candidate.units_count > 0 &&
                                                                            ` (${candidate.units_count} unidades)`}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                                {isSelected ? (
                                                                    <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                                                        <Check className="h-3 w-3 stroke-[2.5]" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-5 w-5 rounded-full border border-muted-foreground/30" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {candidate.is_recommended && (
                                                            <div className="mt-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                                                                <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                                                                <span>{candidate.match_reason || 'Recomendado para este curso'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )
                                    )}
                                </div>
                            </div>

                            {/* STEP 2: Modo de Duplicación */}
                            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-3.5">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        2
                                    </span>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Modo de Importación / Duplicación
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5">
                                    {/* Option 1: Merge */}
                                    <div
                                        onClick={() => setMode('merge')}
                                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                                            mode === 'merge'
                                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-600/30'
                                                : 'hover:border-foreground/30 hover:bg-muted/40 bg-card'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                                    <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                    Fusión Inteligente
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[9px] py-0 px-1.5 h-4 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                                                >
                                                    Recomendado
                                                </Badge>
                                            </div>
                                            {mode === 'merge' && (
                                                <div className="h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                                    <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            Anexa solo los temas y unidades que aún no existan en el curso destino.
                                            Detecta títulos idénticos para <strong>evitar temas duplicados</strong> y conserva los temas actuales intactos.
                                        </p>
                                    </div>

                                    {/* Option 2: Replace */}
                                    <div
                                        onClick={() => setMode('replace')}
                                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                                            mode === 'replace'
                                                ? 'border-destructive bg-destructive/5 ring-1 ring-destructive/30'
                                                : 'hover:border-foreground/30 hover:bg-muted/40 bg-card'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-semibold text-xs text-destructive flex items-center gap-1.5">
                                                <RotateCcw className="h-4 w-4 text-destructive" />
                                                Reemplazar Todo
                                            </span>
                                            {mode === 'replace' && (
                                                <div className="h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center">
                                                    <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            {direction === 'export' ? (
                                                <>
                                                    Limpia el pensum actual de{' '}
                                                    <strong>{activeTargetCourse?.name || 'curso destino'}</strong> (
                                                    {activeTargetCourse?.topics_count || 0} temas) y lo sustituye por el pensum de este curso.
                                                </>
                                            ) : (
                                                <>
                                                    Elimina por completo los{' '}
                                                    <strong>{currentCourseTopicCount} temas actuales</strong> de este curso y los sustituye por los del curso seleccionado.
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    {/* Option 3: Selected */}
                                    <div
                                        onClick={() => setMode('selected')}
                                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                                            mode === 'selected'
                                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-600/30'
                                                : 'hover:border-foreground/30 hover:bg-muted/40 bg-card'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                                <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                Selección Manual de Temas
                                            </span>
                                            {mode === 'selected' && (
                                                <div className="h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                                    <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            Elige manualmente con casillas qué unidades o temas específicos deseas transferir desde la vista previa.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Full-width Pensum Tree Preview & Topic Browser (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                            3
                                        </span>
                                        <div>
                                            <h2 className="text-sm font-semibold text-foreground">
                                                {direction === 'export'
                                                    ? 'Temas a Duplicar hacia el Destino'
                                                    : 'Vista Previa del Curso de Origen'}
                                            </h2>
                                            <span className="text-xs text-muted-foreground">
                                                {direction === 'export' ? (
                                                    <>
                                                        Pensum de: <strong className="text-foreground">{course.name}</strong> ({previewTopicsTree.length} temas principales)
                                                    </>
                                                ) : (
                                                    activeSourceCourse && (
                                                        <>
                                                            Pensum de: <strong className="text-foreground">{activeSourceCourse.name}</strong> ({activeSourceCourse.topics_count} temas)
                                                        </>
                                                    )
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Selection Actions in 'selected' mode */}
                                    {mode === 'selected' && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => handleSelectAll(true)}
                                            >
                                                Seleccionar Todos
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-muted-foreground"
                                                onClick={() => handleSelectAll(false)}
                                            >
                                                Limpiar
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Preview Topic Search */}
                                <div className="relative">
                                    <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Filtrar temas de la vista previa..."
                                        value={topicSearch}
                                        onChange={(e) => setTopicSearch(e.target.value)}
                                        className="pl-9 text-xs h-9 bg-background"
                                    />
                                </div>

                                {/* Topic Tree by Units */}
                                {previewTopicsTree.length === 0 ? (
                                    <div className="py-16 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-2">
                                        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                        <p>
                                            {direction === 'export'
                                                ? `El curso actual "${course.name}" no tiene temas cargados todavía para duplicar.`
                                                : 'Selecciona un curso de referencia de la izquierda para explorar sus temas.'}
                                        </p>
                                    </div>
                                ) : filteredGroupedTopics.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                                        No hay temas que coincidan con &ldquo;{topicSearch}&rdquo;.
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                                        {filteredGroupedTopics.map(({ unitTitle, topics }) => {
                                            const isCollapsed = !!collapsedUnits[unitTitle];
                                            const unitTopicIds = topics.map((t) => t.id);
                                            const allUnitSelected = unitTopicIds.every((id) =>
                                                selectedTopicIds.includes(id)
                                            );
                                            const someUnitSelected =
                                                !allUnitSelected &&
                                                unitTopicIds.some((id) => selectedTopicIds.includes(id));

                                            return (
                                                <div
                                                    key={unitTitle}
                                                    className="border rounded-xl overflow-hidden bg-background shadow-2xs"
                                                >
                                                    {/* Unit Header */}
                                                    <div className="bg-muted/40 px-3.5 py-2.5 flex items-center justify-between border-b gap-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {mode === 'selected' && (
                                                                <Checkbox
                                                                    checked={allUnitSelected || (someUnitSelected ? 'indeterminate' : false)}
                                                                    onCheckedChange={() => toggleUnitSelection(topics)}
                                                                    className="mr-1"
                                                                />
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleUnitCollapse(unitTitle)}
                                                                className="flex items-center gap-1.5 font-semibold text-xs text-foreground hover:text-indigo-600 text-left transition-colors"
                                                            >
                                                                {isCollapsed ? (
                                                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                )}
                                                                <span className="truncate">{unitTitle}</span>
                                                            </button>
                                                        </div>

                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] py-0 px-2 h-5 shrink-0"
                                                        >
                                                            {topics.length} {topics.length === 1 ? 'tema' : 'temas'}
                                                        </Badge>
                                                    </div>

                                                    {/* Unit Topics */}
                                                    {!isCollapsed && (
                                                        <div className="divide-y divide-border/60">
                                                            {topics.map((topic) => {
                                                                const isTopicSelected = selectedTopicIds.includes(topic.id);
                                                                const isAlreadyInReceiver = receiverTitlesNormalized.has(
                                                                    topic.title.trim().toLowerCase()
                                                                );

                                                                return (
                                                                    <div
                                                                        key={topic.id}
                                                                        className={`p-3 space-y-1.5 transition-colors ${
                                                                            mode === 'selected' && isTopicSelected
                                                                                ? 'bg-indigo-50/20 dark:bg-indigo-950/10'
                                                                                : 'hover:bg-muted/20'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                                                {mode === 'selected' && (
                                                                                    <Checkbox
                                                                                        checked={isTopicSelected}
                                                                                        onCheckedChange={() =>
                                                                                            toggleTopicSelection(topic.id)
                                                                                        }
                                                                                        className="mt-0.5"
                                                                                    />
                                                                                )}
                                                                                <div className="space-y-0.5 min-w-0">
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        <span className="text-xs font-semibold text-foreground">
                                                                                            {topic.title}
                                                                                        </span>
                                                                                        {mode === 'merge' && (
                                                                                            isAlreadyInReceiver ? (
                                                                                                <Badge
                                                                                                    variant="outline"
                                                                                                    className="text-[9px] py-0 px-1.5 h-4 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 font-medium"
                                                                                                >
                                                                                                    Ya presente en destino (se omite)
                                                                                                </Badge>
                                                                                            ) : (
                                                                                                <Badge
                                                                                                    variant="outline"
                                                                                                    className="text-[9px] py-0 px-1.5 h-4 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 font-medium"
                                                                                                >
                                                                                                    Nuevo
                                                                                                </Badge>
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                    {topic.description && (
                                                                                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                                                            {topic.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {topic.subtopics && topic.subtopics.length > 0 && (
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="text-[10px] py-0 px-1.5 h-4.5 gap-1 shrink-0 font-medium"
                                                                                >
                                                                                    <FolderTree className="h-3 w-3 text-muted-foreground" />
                                                                                    {topic.subtopics.length} subtema(s)
                                                                                </Badge>
                                                                            )}
                                                                        </div>

                                                                        {/* Nested Subtopics */}
                                                                        {topic.subtopics && topic.subtopics.length > 0 && (
                                                                            <div className="ml-6 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800/60 space-y-1 pt-1">
                                                                                {topic.subtopics.map((sub) => (
                                                                                    <div
                                                                                        key={sub.id}
                                                                                        className="text-[11px] text-muted-foreground flex items-center gap-1.5"
                                                                                    >
                                                                                        <span className="h-1 w-1 rounded-full bg-indigo-400 shrink-0" />
                                                                                        <span>{sub.title}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
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

                    {/* STICKY BOTTOM BAR: Summary and Actions */}
                    <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t shadow-lg px-4 sm:px-6 lg:px-8 py-3.5">
                        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Summary text */}
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    {direction === 'export' ? (
                                        activeTargetCourse ? (
                                            mode === 'replace' ? (
                                                <span className="text-destructive font-medium">
                                                    ⚠️ Se reemplazarán los <strong>{activeTargetCourse.topics_count} temas actuales</strong> de {activeTargetCourse.name} por los <strong>{transferSummary.total} temas</strong> de {course.name}.
                                                </span>
                                            ) : mode === 'merge' ? (
                                                <span>
                                                    Se transferirán los temas de <strong className="text-foreground">{course.name}</strong> hacia <strong className="text-foreground">{activeTargetCourse.name}</strong> ({transferSummary.willSkip > 0 ? `${transferSummary.willSkip} temas omitidos por estar ya presentes` : 'sin duplicados'}).
                                                </span>
                                            ) : (
                                                <span>
                                                    Se copiarán <strong className="text-foreground">{transferSummary.roots} tema(s)</strong> seleccionados de <strong className="text-foreground">{course.name}</strong> hacia <strong className="text-foreground">{activeTargetCourse.name}</strong>.
                                                </span>
                                            )
                                        ) : (
                                            <span>Selecciona un curso destino para continuar.</span>
                                        )
                                    ) : (
                                        activeSourceCourse ? (
                                            mode === 'replace' ? (
                                                <span className="text-destructive font-medium">
                                                    ⚠️ Se reemplazarán los <strong>{currentCourseTopicCount} temas actuales</strong> por los <strong>{transferSummary.total} temas</strong> de {activeSourceCourse.name}.
                                                </span>
                                            ) : mode === 'merge' ? (
                                                <span>
                                                    Se transferirán hacia <strong className="text-foreground">{course.name}</strong> los temas de <strong className="text-foreground">{activeSourceCourse.name}</strong> ({transferSummary.willSkip > 0 ? `${transferSummary.willSkip} temas omitidos por estar ya presentes` : 'sin duplicados'}).
                                                </span>
                                            ) : (
                                                <span>
                                                    Se copiarán <strong className="text-foreground">{transferSummary.roots} tema(s)</strong> seleccionados hacia <strong className="text-foreground">{course.name}</strong>.
                                                </span>
                                            )
                                        ) : (
                                            <span>Selecciona un curso de referencia para continuar.</span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2.5 justify-end shrink-0">
                                <Link href={`/courses/${course.id}?tab=pensum`}>
                                    <Button type="button" variant="outline" size="sm" disabled={processing}>
                                        Cancelar
                                    </Button>
                                </Link>

                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={
                                        (direction === 'export' && !selectedTargetId) ||
                                        (direction === 'import' && !selectedSourceId) ||
                                        processing ||
                                        transferSummary.total === 0 ||
                                        (mode === 'selected' && selectedTopicIds.length === 0)
                                    }
                                    className={
                                        mode === 'replace'
                                            ? 'bg-destructive hover:bg-destructive/90 text-white gap-2 font-semibold shadow-xs'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-xs'
                                    }
                                >
                                    <Copy className="h-4 w-4" />
                                    {processing ? (
                                        'Duplicando...'
                                    ) : direction === 'export' ? (
                                        mode === 'replace'
                                            ? `Reemplazar Pensum en ${activeTargetCourse?.name || 'Destino'}`
                                            : `Duplicar Pensum hacia ${activeTargetCourse?.name || 'Destino'}`
                                    ) : (
                                        mode === 'replace'
                                            ? 'Reemplazar Pensum en este Curso'
                                            : `Importar Pensum a ${course.name}`
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {ConfirmDialogComponent}
        </>
    );
}
