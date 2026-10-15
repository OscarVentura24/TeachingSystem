import React, { useState, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    Calendar,
    Building2,
    BookOpen,
    Users,
    Search,
    Check,
    ChevronDown,
    ChevronRight,
    Sparkles,
    FolderTree,
    Percent,
    SlidersHorizontal,
    FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface CourseTopic {
    id: number;
    title: string;
    unit_title?: string;
    description?: string;
    sort_order: number;
    parent_id?: number | null;
    subtopics?: CourseTopic[];
}

interface Course {
    id: number;
    name: string;
    section?: string;
    institution: { id: number; name: string };
    academic_period?: { id: number; name: string };
    students?: Array<{ id: number; first_name: string; last_name: string }>;
}

interface Props {
    course: Course;
    courseTopics: CourseTopic[];
}

export default function AssessmentCreate({ course, courseTopics }: Props) {
    const today = new Date().toISOString().split('T')[0];

    const form = useForm({
        title: '',
        description: '',
        assessment_type: 'exam' as 'exam' | 'practical' | 'project' | 'quiz',
        assessment_date: today,
        max_score: 100,
        passing_score: 70,
        weight_percentage: '' as string | number,
        auto_sync_mastery: true,
        topic_ids: [] as number[],
    });

    const [topicSearch, setTopicSearch] = useState('');
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

    // Group topics by unit
    const groupedTopics = useMemo(() => {
        const groupsMap = new Map<string, CourseTopic[]>();

        courseTopics.forEach((topic) => {
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
    }, [courseTopics]);

    // Filter topics by search query
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
                        t.subtopics?.some((st) => st.title.toLowerCase().includes(q))
                );

                return {
                    unitTitle,
                    topics: matchingTopics,
                };
            })
            .filter((g) => g.topics.length > 0);
    }, [groupedTopics, topicSearch]);

    // All available topic and subtopic IDs
    const allTopicIds = useMemo(() => {
        const ids: number[] = [];
        courseTopics.forEach((t) => {
            ids.push(t.id);
            if (t.subtopics) {
                t.subtopics.forEach((st) => ids.push(st.id));
            }
        });
        return ids;
    }, [courseTopics]);

    // Toggle unit collapse
    const toggleUnitCollapse = (unitTitle: string) => {
        setCollapsedUnits((prev) => ({
            ...prev,
            [unitTitle]: !prev[unitTitle],
        }));
    };

    // Toggle single topic ID
    const toggleTopic = (id: number) => {
        const current = form.data.topic_ids;
        if (current.includes(id)) {
            form.setData('topic_ids', current.filter((tId) => tId !== id));
        } else {
            form.setData('topic_ids', [...current, id]);
        }
    };

    // Toggle root topic with all its subtopics
    const toggleTopicWithSubtopics = (topic: CourseTopic) => {
        const current = form.data.topic_ids;
        const relatedIds = [topic.id, ...(topic.subtopics?.map((st) => st.id) || [])];
        const allChecked = relatedIds.every((id) => current.includes(id));

        if (allChecked) {
            form.setData('topic_ids', current.filter((id) => !relatedIds.includes(id)));
        } else {
            form.setData('topic_ids', Array.from(new Set([...current, ...relatedIds])));
        }
    };

    // Toggle entire unit topics
    const toggleUnit = (unitTopics: CourseTopic[]) => {
        const unitIds: number[] = [];
        unitTopics.forEach((t) => {
            unitIds.push(t.id);
            t.subtopics?.forEach((st) => unitIds.push(st.id));
        });

        const current = form.data.topic_ids;
        const allChecked = unitIds.every((id) => current.includes(id));

        if (allChecked) {
            form.setData('topic_ids', current.filter((id) => !unitIds.includes(id)));
        } else {
            form.setData('topic_ids', Array.from(new Set([...current, ...unitIds])));
        }
    };

    const selectAll = () => {
        form.setData('topic_ids', allTopicIds);
    };

    const clearAll = () => {
        form.setData('topic_ids', []);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/courses/${course.id}/assessments`);
    };

    const passingPercent = Math.round((Number(form.data.passing_score) / Math.max(1, Number(form.data.max_score))) * 100);

    return (
        <>
            <Head title={`Nueva Evaluación - ${course.name}`} />

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-32">
                {/* Header & Breadcrumb */}
                <div className="flex flex-col gap-4 border-b pb-6">
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/courses/${course.id}?tab=grades`}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-muted"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Volver a {course.name} (Evaluaciones)</span>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                                    <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Nueva Evaluación
                                </h1>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
                                Configura los parámetros de la prueba, escala de calificación, ponderación y selecciona los temas evaluados para {course.name}.
                            </p>
                        </div>

                        {/* Context Badges */}
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
                            <div className="bg-muted/60 border rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-bold text-foreground">
                                    {course.students?.length || 0}
                                </span>
                                <span className="text-muted-foreground">alumnos</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN: Evaluation Parameters (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Card 1: Datos de la Prueba */}
                            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
                                <div className="flex items-center gap-2 border-b pb-3">
                                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Datos de la Prueba
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="title" className="text-xs font-semibold">
                                            Título de la Evaluación <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="title"
                                            placeholder="Ej: Examen Parcial de Hardware o Práctica 1"
                                            value={form.data.title}
                                            onChange={(e) => form.setData('title', e.target.value)}
                                            className="text-xs h-9"
                                            required
                                        />
                                        {form.errors.title && (
                                            <p className="text-[11px] text-destructive">{form.errors.title}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="assessment_type" className="text-xs font-semibold">
                                                Tipo de Prueba <span className="text-destructive">*</span>
                                            </Label>
                                            <select
                                                id="assessment_type"
                                                value={form.data.assessment_type}
                                                onChange={(e) => form.setData('assessment_type', e.target.value as any)}
                                                className="w-full px-3 py-2 rounded-lg border bg-background text-xs h-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            >
                                                <option value="exam">Examen Teórico</option>
                                                <option value="practical">Prueba Práctica (Lab)</option>
                                                <option value="project">Proyecto / Tarea</option>
                                                <option value="quiz">Quiz / Control Corto</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="assessment_date" className="text-xs font-semibold">
                                                Fecha de Ejecución <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="assessment_date"
                                                type="date"
                                                value={form.data.assessment_date}
                                                onChange={(e) => form.setData('assessment_date', e.target.value)}
                                                className="text-xs h-9"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="description" className="text-xs font-semibold">
                                            Descripción u Orientaciones (Opcional)
                                        </Label>
                                        <textarea
                                            id="description"
                                            rows={2}
                                            placeholder="Instrucciones para los estudiantes, materiales permitidos, etc."
                                            value={form.data.description}
                                            onChange={(e) => form.setData('description', e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Calificación y Ponderación */}
                            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
                                <div className="flex items-center gap-2 border-b pb-3">
                                    <SlidersHorizontal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Escala de Calificación
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="max_score" className="text-xs font-semibold">
                                                Nota Máxima <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="max_score"
                                                type="number"
                                                min="1"
                                                max="999"
                                                step="0.5"
                                                value={form.data.max_score}
                                                onChange={(e) => form.setData('max_score', Number(e.target.value))}
                                                className="text-xs h-9 font-medium"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="passing_score" className="text-xs font-semibold">
                                                Aprobatoria <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="passing_score"
                                                type="number"
                                                min="0"
                                                max={form.data.max_score}
                                                step="0.5"
                                                value={form.data.passing_score}
                                                onChange={(e) => form.setData('passing_score', Number(e.target.value))}
                                                className="text-xs h-9 font-medium"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="weight_percentage" className="text-xs font-semibold">
                                                Ponderación (%)
                                            </Label>
                                            <Input
                                                id="weight_percentage"
                                                type="number"
                                                min="0"
                                                max="100"
                                                placeholder="Ej: 20"
                                                value={form.data.weight_percentage}
                                                onChange={(e) => form.setData('weight_percentage', e.target.value)}
                                                className="text-xs h-9 font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Visual scale indicator */}
                                    <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">Exigencia mínima requerida:</span>
                                            <span className="font-bold text-foreground">
                                                {form.data.passing_score} / {form.data.max_score} pts ({passingPercent}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-amber-500/20 h-2 rounded-full overflow-hidden flex">
                                            <div
                                                className="bg-amber-500 h-full"
                                                style={{ width: `${Math.min(100, passingPercent)}%` }}
                                            />
                                            <div
                                                className="bg-emerald-500 h-full flex-1"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                                            <span className="flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                0 a {Number(form.data.passing_score) - 0.1} (Refuerzo)
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                {form.data.passing_score} a {form.data.max_score} (Aprobado)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Sincronización Pedagógica */}
                            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-3.5">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <Checkbox
                                        checked={form.data.auto_sync_mastery}
                                        onCheckedChange={(checked) => form.setData('auto_sync_mastery', !!checked)}
                                        className="mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <span className="font-semibold text-xs text-foreground block flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                            Sincronizar automáticamente el progreso pedagógico
                                        </span>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Al calificar, los alumnos con nota igual o mayor a <strong>{form.data.passing_score} pts</strong> acreditarán automáticamente los temas evaluados en la <strong>Matriz de Cobertura</strong>. Quienes obtengan menos pasarán a <strong>Refuerzo Requerido</strong>.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Pensum Topics Selection (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                                            <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-semibold text-foreground">
                                                Temas del Pensum a Evaluar
                                            </h2>
                                            <span className="text-xs text-muted-foreground">
                                                Selecciona las unidades o temas que formarán parte de la evaluación.
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick Selection Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={selectAll}
                                        >
                                            Seleccionar Todos
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-muted-foreground"
                                            onClick={clearAll}
                                        >
                                            Limpiar
                                        </Button>
                                    </div>
                                </div>

                                {/* Search Filter */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar tema o unidad en el pensum..."
                                        value={topicSearch}
                                        onChange={(e) => setTopicSearch(e.target.value)}
                                        className="pl-9 text-xs h-9 bg-background"
                                    />
                                </div>

                                {/* Topics Tree by Units */}
                                {courseTopics.length === 0 ? (
                                    <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-2">
                                        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                        <p>El curso aún no tiene temas cargados en su pensum.</p>
                                    </div>
                                ) : filteredGroupedTopics.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                                        No hay temas que coincidan con &ldquo;{topicSearch}&rdquo;.
                                    </div>
                                ) : (
                                    <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
                                        {filteredGroupedTopics.map(({ unitTitle, topics }) => {
                                            const isCollapsed = !!collapsedUnits[unitTitle];
                                            const unitAllIds: number[] = [];
                                            topics.forEach((t) => {
                                                unitAllIds.push(t.id);
                                                t.subtopics?.forEach((st) => unitAllIds.push(st.id));
                                            });

                                            const allUnitChecked = unitAllIds.length > 0 && unitAllIds.every((id) =>
                                                form.data.topic_ids.includes(id)
                                            );
                                            const someUnitChecked =
                                                !allUnitChecked && unitAllIds.some((id) => form.data.topic_ids.includes(id));

                                            return (
                                                <div
                                                    key={unitTitle}
                                                    className="border rounded-xl overflow-hidden bg-background shadow-2xs"
                                                >
                                                    {/* Unit Header */}
                                                    <div className="bg-muted/40 px-3.5 py-2.5 flex items-center justify-between border-b gap-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <Checkbox
                                                                checked={allUnitChecked || (someUnitChecked ? 'indeterminate' : false)}
                                                                onCheckedChange={() => toggleUnit(topics)}
                                                            />
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

                                                        <Badge variant="secondary" className="text-[10px] py-0 px-2 h-5 shrink-0">
                                                            {topics.length} {topics.length === 1 ? 'tema' : 'temas'}
                                                        </Badge>
                                                    </div>

                                                    {/* Topics inside unit */}
                                                    {!isCollapsed && (
                                                        <div className="divide-y divide-border/60">
                                                            {topics.map((topic) => {
                                                                const isTopicChecked = form.data.topic_ids.includes(topic.id);
                                                                const subtopicIds = topic.subtopics?.map((st) => st.id) || [];
                                                                const allSubChecked = subtopicIds.length > 0 && subtopicIds.every((id) =>
                                                                    form.data.topic_ids.includes(id)
                                                                );

                                                                return (
                                                                    <div
                                                                        key={topic.id}
                                                                        className={`p-3 space-y-2 transition-colors ${
                                                                            isTopicChecked ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : 'hover:bg-muted/20'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                                                <Checkbox
                                                                                    checked={isTopicChecked}
                                                                                    onCheckedChange={() => toggleTopic(topic.id)}
                                                                                    className="mt-0.5"
                                                                                />
                                                                                <div className="space-y-0.5 min-w-0">
                                                                                    <span
                                                                                        onClick={() => toggleTopicWithSubtopics(topic)}
                                                                                        className="text-xs font-semibold text-foreground cursor-pointer hover:text-indigo-600 transition-colors block"
                                                                                    >
                                                                                        {topic.title}
                                                                                    </span>
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

                                                                        {/* Nested Subtopics with Individual Checkboxes */}
                                                                        {topic.subtopics && topic.subtopics.length > 0 && (
                                                                            <div className="ml-6 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800/60 space-y-1.5 pt-1">
                                                                                {topic.subtopics.map((sub) => {
                                                                                    const isSubChecked = form.data.topic_ids.includes(sub.id);
                                                                                    return (
                                                                                        <label
                                                                                            key={sub.id}
                                                                                            className="flex items-center gap-2 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                                                                        >
                                                                                            <Checkbox
                                                                                                checked={isSubChecked}
                                                                                                onCheckedChange={() => toggleTopic(sub.id)}
                                                                                                className="h-3.5 w-3.5"
                                                                                            />
                                                                                            <span>{sub.title}</span>
                                                                                        </label>
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
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* STICKY BOTTOM BAR */}
                    <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t shadow-lg px-4 sm:px-6 lg:px-8 py-3.5">
                        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                                    <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <span>
                                        {form.data.title ? (
                                            <>
                                                Evaluación: <strong className="text-foreground">{form.data.title}</strong> •{' '}
                                            </>
                                        ) : null}
                                        <strong className="text-foreground">{form.data.topic_ids.length} temas</strong> seleccionados •{' '}
                                        Nota de pase: <strong className="text-foreground">{form.data.passing_score} / {form.data.max_score} pts</strong> ({passingPercent}%).
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 justify-end shrink-0">
                                <Link href={`/courses/${course.id}?tab=grades`}>
                                    <Button type="button" variant="outline" size="sm" disabled={form.processing}>
                                        Cancelar
                                    </Button>
                                </Link>

                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={form.processing || !form.data.title.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-xs"
                                >
                                    <Award className="h-4 w-4" />
                                    {form.processing ? 'Creando...' : 'Crear Evaluación'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
