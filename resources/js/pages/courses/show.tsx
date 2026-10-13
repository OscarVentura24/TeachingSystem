import React, { useState, useMemo } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Play,
    Plus,
    LayoutGrid,
    BookOpen,
    Users,
    History,
    CheckCircle2,
    Computer,
    Sparkles,
    GraduationCap,
    Trash2,
    UserCheck,
    Pencil,
    CornerDownRight,
    Layers,
    FolderTree,
    ChevronUp,
    ChevronDown,
    Download,
    Search,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CoverageMatrix } from '@/components/coverage-matrix';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface CourseTopic {
    id: number;
    topic_id?: number | null;
    parent_id?: number | null;
    title: string;
    unit_title?: string;
    description?: string;
    sort_order: number;
    subtopics?: CourseTopic[];
}

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    student_id_number?: string;
    preferred_workstation?: string;
}

interface SessionItem {
    id: number;
    session_date: string;
    title?: string;
    status: 'draft' | 'completed' | 'cancelled';
    attendances: Array<{ id: number; student_id: number; workstation?: string }>;
    topics: Array<{ id: number; title: string }>;
}

interface GlobalTopic {
    id: number;
    title: string;
    area: string;
    unit_title?: string;
    description?: string;
    subtopics?: Array<{ id: number; title: string }>;
}

interface Teacher {
    id: number;
    name: string;
    email: string;
    pivot?: {
        is_primary: boolean;
    };
}

interface InstitutionStudentItem {
    id: number;
    institution_id: number;
    first_name: string;
    last_name: string;
    student_id_number?: string;
    email?: string;
}

interface Props {
    course: {
        id: number;
        name: string;
        section?: string;
        code?: string;
        institution: { id: number; name: string };
        academic_period?: { id: number; name: string };
        course_topics: CourseTopic[];
        students: Student[];
        sessions: SessionItem[];
        teachers: Teacher[];
    };
    progressByStudent: Record<number, any[]>;
    globalTopics: GlobalTopic[];
    availableTeachers?: Array<{ id: number; name: string; email: string }>;
    institutionStudents?: InstitutionStudentItem[];
    canManageTeachers?: boolean;
}

export default function CourseShow({
    course,
    progressByStudent,
    globalTopics,
    availableTeachers = [],
    institutionStudents = [],
    canManageTeachers = false,
}: Props) {
    const [activeTab, setActiveTab] = useState<'matrix' | 'pensum' | 'students' | 'sessions' | 'teachers'>('matrix');
    const [openAddTopicDialog, setOpenAddTopicDialog] = useState(false);
    const [openBulkImportDialog, setOpenBulkImportDialog] = useState(false);
    const [selectedBulkTopicIds, setSelectedBulkTopicIds] = useState<number[]>([]);
    const [bulkSearchQuery, setBulkSearchQuery] = useState('');
    const [isBulkImporting, setIsBulkImporting] = useState(false);
    const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
    const [openAddTeacherDialog, setOpenAddTeacherDialog] = useState(false);
    const [openEditCourseDialog, setOpenEditCourseDialog] = useState(false);

    // Form to edit course
    const editCourseForm = useForm({
        name: course.name,
        section: course.section || '',
        code: course.code || '',
        description: '',
    });

    // Form to assign teacher to course
    const addTeacherForm = useForm({
        user_id: '',
        is_primary: false,
    });

    // Form to add topic to course pensum
    const addTopicForm = useForm({
        topic_id: '',
        parent_id: '' as string | number,
        title: '',
        unit_title: '',
        description: '',
    });

    // Track topics already present in this course pensum to prevent duplicate additions
    const addedTopicIds = useMemo(() => {
        const ids = new Set<number>();
        course.course_topics.forEach((ct) => {
            if (ct.topic_id) ids.add(ct.topic_id);
            if (ct.subtopics) {
                ct.subtopics.forEach((sub) => {
                    if (sub.topic_id) ids.add(sub.topic_id);
                });
            }
        });
        return ids;
    }, [course.course_topics]);

    const addedTopicTitles = useMemo(() => {
        const titles = new Set<string>();
        course.course_topics.forEach((ct) => {
            titles.add(ct.title.trim().toLowerCase());
            if (ct.subtopics) {
                ct.subtopics.forEach((sub) => {
                    titles.add(sub.title.trim().toLowerCase());
                });
            }
        });
        return titles;
    }, [course.course_topics]);

    const availableGlobalTopics = useMemo(() => {
        return globalTopics.filter(
            (gt) => !addedTopicIds.has(gt.id) && !addedTopicTitles.has(gt.title.trim().toLowerCase())
        );
    }, [globalTopics, addedTopicIds, addedTopicTitles]);

    const filteredBulkTopics = useMemo(() => {
        if (!bulkSearchQuery.trim()) return availableGlobalTopics;
        const q = bulkSearchQuery.toLowerCase();
        return availableGlobalTopics.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                (t.area && t.area.toLowerCase().includes(q)) ||
                (t.unit_title && t.unit_title.toLowerCase().includes(q))
        );
    }, [availableGlobalTopics, bulkSearchQuery]);

    const handleToggleBulkSelectAll = () => {
        if (filteredBulkTopics.length === 0) return;
        const isAllSelected = filteredBulkTopics.every((t) => selectedBulkTopicIds.includes(t.id));
        if (isAllSelected) {
            const filteredSet = new Set(filteredBulkTopics.map((t) => t.id));
            setSelectedBulkTopicIds((prev) => prev.filter((id) => !filteredSet.has(id)));
        } else {
            const newSelection = new Set([...selectedBulkTopicIds, ...filteredBulkTopics.map((t) => t.id)]);
            setSelectedBulkTopicIds(Array.from(newSelection));
        }
    };

    const handleToggleBulkTopic = (id: number) => {
        setSelectedBulkTopicIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleBulkImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBulkTopicIds.length === 0) return;
        setIsBulkImporting(true);
        router.post(
            `/courses/${course.id}/topics/bulk-import`,
            { topic_ids: selectedBulkTopicIds },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenBulkImportDialog(false);
                    setSelectedBulkTopicIds([]);
                    setBulkSearchQuery('');
                },
                onFinish: () => {
                    setIsBulkImporting(false);
                },
            }
        );
    };

    const hasLinkedTopics = useMemo(() => {
        return course.course_topics.some((ct) => ct.topic_id !== null && ct.topic_id !== undefined);
    }, [course.course_topics]);

    const [isSyncingTopics, setIsSyncingTopics] = useState(false);
    const [syncingTopicId, setSyncingTopicId] = useState<number | null>(null);

    const handleSyncAllTopics = () => {
        if (!confirm('¿Deseas actualizar todos los temas vinculados con el Banco Global?\n\nSe actualizarán sus títulos, descripciones y nuevos subtemas, manteniendo intacto el orden actual del pensum.')) {
            return;
        }
        setIsSyncingTopics(true);
        router.post(
            `/courses/${course.id}/topics/sync`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsSyncingTopics(false),
            }
        );
    };

    const handleSyncSingleTopic = (topicId: number, title: string) => {
        if (!confirm(`¿Actualizar el tema "${title}" y sus subtemas con la información más reciente del Banco Global?\n\nEl orden en el pensum se mantendrá intacto.`)) {
            return;
        }
        setSyncingTopicId(topicId);
        router.post(
            `/courses/${course.id}/topics/${topicId}/sync`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncingTopicId(null),
            }
        );
    };

    const handleOpenAddSubtopic = (parentCourseTopic: CourseTopic) => {
        addTopicForm.reset();
        addTopicForm.setData({
            topic_id: '',
            parent_id: parentCourseTopic.id,
            title: '',
            unit_title: parentCourseTopic.unit_title || '',
            description: '',
        });
        setOpenAddTopicDialog(true);
    };

    // Form to enroll an existing institutional student into this course
    const enrollStudentForm = useForm({
        student_id: '',
        preferred_workstation: '',
    });

    const enrolledStudentIds = new Set(course.students.map((s) => s.id));
    const availableStudents = institutionStudents.filter((s) => !enrolledStudentIds.has(s.id));

    const studentSelectOptions = availableStudents.map((s) => ({
        value: s.id,
        label: `${s.last_name}, ${s.first_name}`,
        subLabel: s.student_id_number ? `Cédula: ${s.student_id_number}` : s.email || undefined,
    }));

    const handleSelectGlobalTopic = (topicId: string | number) => {
        const selected = globalTopics.find((t) => String(t.id) === String(topicId));
        if (selected) {
            addTopicForm.setData((prev) => ({
                ...prev,
                topic_id: String(selected.id),
                title: selected.title,
                unit_title: selected.unit_title || '',
                description: selected.description || '',
            }));
        } else {
            addTopicForm.setData('topic_id', '');
        }
    };

    const handleAddTopicSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addTopicForm.post(`/courses/${course.id}/topics`, {
            onSuccess: () => {
                setOpenAddTopicDialog(false);
                addTopicForm.reset();
            },
        });
    };

    const handleEnrollStudentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        enrollStudentForm.post(`/courses/${course.id}/enrollments`, {
            onSuccess: () => {
                setOpenEnrollDialog(false);
                enrollStudentForm.reset();
            },
        });
    };

    const handleAddTeacherSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addTeacherForm.post(`/courses/${course.id}/teachers`, {
            onSuccess: () => {
                setOpenAddTeacherDialog(false);
                addTeacherForm.reset();
            },
        });
    };

    const handleRemoveTeacher = (teacherId: number, teacherName: string) => {
        if (confirm(`¿Desvincular al docente "${teacherName}" de este curso?`)) {
            router.delete(`/courses/${course.id}/teachers/${teacherId}`);
        }
    };

    const handleEditCourseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        editCourseForm.put(`/courses/${course.id}`, {
            onSuccess: () => {
                setOpenEditCourseDialog(false);
            },
        });
    };

    const handleRemoveTopicFromPensum = (topicId: number, title: string) => {
        if (confirm(`¿Estás seguro de retirar el tema "${title}" del pensum de este curso?`)) {
            router.delete(`/courses/${course.id}/topics/${topicId}`);
        }
    };

    const handleReorderCourseSubtopics = (parentTopic: CourseTopic, currentIndex: number, direction: 'up' | 'down') => {
        if (!parentTopic.subtopics || parentTopic.subtopics.length <= 1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= parentTopic.subtopics.length) return;

        const newSubtopics = [...parentTopic.subtopics];
        const temp = newSubtopics[currentIndex];
        newSubtopics[currentIndex] = newSubtopics[targetIndex];
        newSubtopics[targetIndex] = temp;

        const topicIds = newSubtopics.map((s) => s.id);
        router.post(`/courses/${course.id}/topics/reorder`, {
            topic_ids: topicIds,
        }, {
            preserveScroll: true,
        });
    };

    const handleReorderCourseRootTopics = (currentIndex: number, direction: 'up' | 'down') => {
        if (course.course_topics.length <= 1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= course.course_topics.length) return;

        const newTopics = [...course.course_topics];
        const temp = newTopics[currentIndex];
        newTopics[currentIndex] = newTopics[targetIndex];
        newTopics[targetIndex] = temp;

        const topicIds = newTopics.map((t) => t.id);
        router.post(`/courses/${course.id}/topics/reorder`, {
            topic_ids: topicIds,
        }, {
            preserveScroll: true,
        });
    };

    const handleRemoveStudent = (studentId: number, name: string) => {
        if (confirm(`¿Desmatricular a "${name}" de este curso?\n\nSus registros históricos en sesiones previas se conservarán.`)) {
            router.delete(`/courses/${course.id}/students/${studentId}`);
        }
    };

    return (
        <>
            <Head title={`${course.name} - H2O Teaching System`} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link href="/courses" className="text-muted-foreground hover:text-foreground transition-colors">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {course.institution?.name}
                            </span>
                            {course.academic_period && (
                                <span className="text-xs text-muted-foreground">
                                    • {course.academic_period.name}
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {course.name} {course.section && <span className="font-normal text-muted-foreground">({course.section})</span>}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => setOpenEditCourseDialog(true)}
                        >
                            <Pencil className="h-4 w-4" /> Editar Curso
                        </Button>

                        <Link href={`/courses/${course.id}/sessions/create`}>
                            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                                <Play className="h-4 w-4 fill-white" /> Iniciar Sesión de Clase
                            </Button>
                        </Link>

                        {/* Edit Course Dialog */}
                        <Dialog open={openEditCourseDialog} onOpenChange={setOpenEditCourseDialog}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Editar Información del Curso</DialogTitle>
                                    <DialogDescription>
                                        Modifica el nombre, sección o código de este curso.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleEditCourseSubmit} className="space-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit_course_name">Nombre del Curso *</Label>
                                        <Input
                                            id="edit_course_name"
                                            autoFocus
                                            value={editCourseForm.data.name}
                                            onChange={(e) => editCourseForm.setData('name', e.target.value)}
                                            required
                                        />
                                        {editCourseForm.errors.name && (
                                            <p className="text-xs text-destructive">{editCourseForm.errors.name}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_course_section">Sección / Turno</Label>
                                            <Input
                                                id="edit_course_section"
                                                value={editCourseForm.data.section}
                                                onChange={(e) => editCourseForm.setData('section', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit_course_code">Código</Label>
                                            <Input
                                                id="edit_course_code"
                                                value={editCourseForm.data.code}
                                                onChange={(e) => editCourseForm.setData('code', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setOpenEditCourseDialog(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={editCourseForm.processing}>
                                            {editCourseForm.processing ? 'Actualizando...' : 'Guardar Cambios'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Tabs navigation */}
                <div className="flex border-b text-sm font-medium gap-6">
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'matrix'
                                ? 'border-primary text-primary font-semibold'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <LayoutGrid className="h-4 w-4" /> Matriz de Cobertura
                    </button>

                    <button
                        onClick={() => setActiveTab('pensum')}
                        className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'pensum'
                                ? 'border-primary text-primary font-semibold'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <BookOpen className="h-4 w-4" /> Pensum del Curso ({course.course_topics?.length || 0})
                    </button>

                    <button
                        onClick={() => setActiveTab('students')}
                        className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'students'
                                ? 'border-primary text-primary font-semibold'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Users className="h-4 w-4" /> Estudiantes ({course.students?.length || 0})
                    </button>

                    <button
                        onClick={() => setActiveTab('sessions')}
                        className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'sessions'
                                ? 'border-primary text-primary font-semibold'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <History className="h-4 w-4" /> Historial de Sesiones ({course.sessions?.length || 0})
                    </button>

                    <button
                        onClick={() => setActiveTab('teachers')}
                        className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'teachers'
                                ? 'border-primary text-primary font-semibold'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <GraduationCap className="h-4 w-4" /> Docentes ({course.teachers?.length || 0})
                    </button>
                </div>

                {/* Tab 1: Coverage Matrix */}
                {activeTab === 'matrix' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Monitorea el avance individual de cada estudiante tema por tema.
                            </p>
                        </div>
                        <CoverageMatrix
                            students={course.students || []}
                            topics={course.course_topics || []}
                            progressByStudent={progressByStudent}
                        />
                    </div>
                )}

                {/* Tab 2: Pensum Designer */}
                {activeTab === 'pensum' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-foreground">Temario del Curso (Pensum)</h3>
                                <p className="text-xs text-muted-foreground">
                                    Los temas seleccionados aquí forman el pensum ordenado de la asignatura.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {hasLinkedTopics && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        disabled={isSyncingTopics}
                                        onClick={handleSyncAllTopics}
                                        title="Actualizar temas y subtemas vinculados desde el Banco Global manteniendo intacto el orden del pensum"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isSyncingTopics ? 'animate-spin' : ''}`} />
                                        {isSyncingTopics ? 'Actualizando...' : 'Actualizar del Banco'}
                                    </Button>
                                )}

                                {availableGlobalTopics.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => {
                                            setSelectedBulkTopicIds(availableGlobalTopics.map((t) => t.id));
                                            setOpenBulkImportDialog(true);
                                        }}
                                    >
                                        <Download className="h-4 w-4" />
                                        Importar del Banco ({availableGlobalTopics.length})
                                    </Button>
                                )}

                                <Dialog open={openAddTopicDialog} onOpenChange={setOpenAddTopicDialog}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="gap-2">
                                            <Plus className="h-4 w-4" /> Agregar Tema al Pensum
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>Agregar Tema al Pensum</DialogTitle>
                                            <DialogDescription>
                                                Selecciona un tema existente del Banco Global o escribe uno nuevo.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <form onSubmit={handleAddTopicSubmit} className="space-y-4 pt-2">
                                            {availableGlobalTopics.length > 0 ? (
                                                <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg border">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs flex items-center gap-1.5">
                                                            <Sparkles className="h-3.5 w-3.5 text-primary" /> Cargar desde Banco Global
                                                        </Label>
                                                        <Button
                                                            type="button"
                                                            variant="link"
                                                            size="sm"
                                                            className="h-auto p-0 text-xs text-primary"
                                                            onClick={() => {
                                                                setOpenAddTopicDialog(false);
                                                                setSelectedBulkTopicIds(availableGlobalTopics.map((t) => t.id));
                                                                setOpenBulkImportDialog(true);
                                                            }}
                                                        >
                                                            Importar en lote ({availableGlobalTopics.length})
                                                        </Button>
                                                    </div>
                                                    <SearchableSelect
                                                        options={availableGlobalTopics.map((gt) => ({
                                                            value: gt.id,
                                                            label: gt.title,
                                                            subLabel: `[${gt.area}] ${gt.unit_title ? `• ${gt.unit_title}` : ''}${gt.subtopics && gt.subtopics.length > 0 ? ` (${gt.subtopics.length} subtemas)` : ''}`,
                                                        }))}
                                                        value={addTopicForm.data.topic_id}
                                                        onChange={handleSelectGlobalTopic}
                                                        placeholder="Buscar tema del banco global..."
                                                        searchPlaceholder="Buscar por título, área o unidad..."
                                                    />
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    <span>Todos los temas del Banco Global ya están presentes en el pensum de este curso. Puedes redactar un tema personalizado a continuación.</span>
                                                </div>
                                            )}

                                            {course.course_topics.length > 0 && (
                                                <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-dashed">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="parent_course_topic_id" className="text-xs font-semibold flex items-center gap-1.5">
                                                            <FolderTree className="h-3.5 w-3.5 text-primary" /> ¿Es un Subtema? (Opcional)
                                                        </Label>
                                                        {addTopicForm.data.parent_id && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-5 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                                                                onClick={() => addTopicForm.setData('parent_id', '')}
                                                            >
                                                                Tema Principal
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <select
                                                        id="parent_course_topic_id"
                                                        value={addTopicForm.data.parent_id}
                                                        onChange={(e) => {
                                                            const pId = e.target.value;
                                                            addTopicForm.setData('parent_id', pId);
                                                            if (pId) {
                                                                const parent = course.course_topics.find((ct) => String(ct.id) === String(pId));
                                                                if (parent?.unit_title && !addTopicForm.data.unit_title) {
                                                                    addTopicForm.setData('unit_title', parent.unit_title);
                                                                }
                                                            }
                                                        }}
                                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                                                    >
                                                        <option value="">Ninguno (Agregar como Tema Principal)</option>
                                                        {course.course_topics.map((ct) => (
                                                            <option key={ct.id} value={ct.id}>
                                                                {ct.title} {ct.unit_title ? `(${ct.unit_title})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <Label htmlFor="topic_title">Título del Tema *</Label>
                                                <Input
                                                    id="topic_title"
                                                    value={addTopicForm.data.title}
                                                    onChange={(e) => addTopicForm.setData('title', e.target.value)}
                                                    placeholder="Ej: Introducción a Algoritmos"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="unit_title">Unidad / Módulo</Label>
                                                <Input
                                                    id="unit_title"
                                                    value={addTopicForm.data.unit_title}
                                                    onChange={(e) => addTopicForm.setData('unit_title', e.target.value)}
                                                    placeholder="Ej: Unidad 1: Fundamentos"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="topic_desc">Descripción u Objetivos</Label>
                                                <Input
                                                    id="topic_desc"
                                                    value={addTopicForm.data.description}
                                                    onChange={(e) => addTopicForm.setData('description', e.target.value)}
                                                    placeholder="Breve detalle de lo que aprenderán"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button type="button" variant="outline" onClick={() => setOpenAddTopicDialog(false)}>
                                                    Cancelar
                                                </Button>
                                                <Button type="submit" disabled={addTopicForm.processing}>
                                                    Guardar en Pensum
                                                </Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>

                                {/* Bulk Import Dialog */}
                                <Dialog open={openBulkImportDialog} onOpenChange={setOpenBulkImportDialog}>
                                    <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <Download className="h-5 w-5 text-primary" />
                                                Importar Temas del Banco Global
                                            </DialogTitle>
                                            <DialogDescription>
                                                Selecciona uno, varios o todos los temas disponibles del banco para agregarlos automáticamente al pensum de este curso.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <form onSubmit={handleBulkImportSubmit} className="flex flex-col flex-1 min-h-0 space-y-4 pt-2">
                                            {/* Search and Selection Toolbar */}
                                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between pb-2 border-b">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="search"
                                                        placeholder="Filtrar por título, área o unidad..."
                                                        value={bulkSearchQuery}
                                                        onChange={(e) => setBulkSearchQuery(e.target.value)}
                                                        className="pl-8 text-xs h-9"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="text-xs h-9"
                                                        onClick={handleToggleBulkSelectAll}
                                                        disabled={filteredBulkTopics.length === 0}
                                                    >
                                                        {filteredBulkTopics.length > 0 &&
                                                        filteredBulkTopics.every((t) => selectedBulkTopicIds.includes(t.id))
                                                            ? 'Deseleccionar Filtrados'
                                                            : `Seleccionar Todos (${filteredBulkTopics.length})`}
                                                    </Button>
                                                    {selectedBulkTopicIds.length > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs h-9 text-muted-foreground hover:text-foreground"
                                                            onClick={() => setSelectedBulkTopicIds([])}
                                                        >
                                                            Limpiar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Topics List with scroll */}
                                            <div className="flex-1 overflow-y-auto space-y-2 max-h-[380px] pr-1">
                                                {filteredBulkTopics.length === 0 ? (
                                                    <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                                                        {bulkSearchQuery ? (
                                                            <p className="text-xs">No se encontraron temas disponibles con "{bulkSearchQuery}".</p>
                                                        ) : (
                                                            <p className="text-xs">No hay temas disponibles para importar.</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    filteredBulkTopics.map((topic) => {
                                                        const isSelected = selectedBulkTopicIds.includes(topic.id);
                                                        return (
                                                            <div
                                                                key={topic.id}
                                                                onClick={() => handleToggleBulkTopic(topic.id)}
                                                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                                    isSelected
                                                                        ? 'border-primary/50 bg-primary/5'
                                                                        : 'hover:bg-muted/30 border-border'
                                                                }`}
                                                            >
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => handleToggleBulkTopic(topic.id)}
                                                                    className="mt-0.5"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-xs font-semibold text-foreground">
                                                                            {topic.title}
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                                                            {topic.area}
                                                                        </Badge>
                                                                        {topic.unit_title && (
                                                                            <span className="text-[11px] text-muted-foreground">
                                                                                {topic.unit_title}
                                                                            </span>
                                                                        )}
                                                                        {topic.subtopics && topic.subtopics.length > 0 && (
                                                                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 gap-1">
                                                                                <Layers className="h-2.5 w-2.5" />
                                                                                {topic.subtopics.length} subtema(s)
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {topic.description && (
                                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                                                            {topic.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* Footer Summary & Actions */}
                                            <div className="flex items-center justify-between border-t pt-3">
                                                <span className="text-xs text-muted-foreground">
                                                    <strong className="text-foreground">{selectedBulkTopicIds.length}</strong> de{' '}
                                                    {availableGlobalTopics.length} tema(s) seleccionado(s)
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setOpenBulkImportDialog(false)}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        disabled={selectedBulkTopicIds.length === 0 || isBulkImporting}
                                                    >
                                                        {isBulkImporting ? 'Importando...' : `Importar ${selectedBulkTopicIds.length} Seleccionado(s)`}
                                                    </Button>
                                                </div>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        {course.course_topics.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p>No hay temas agregados al pensum todavía.</p>
                                <div className="flex items-center justify-center gap-2 mt-4">
                                    {availableGlobalTopics.length > 0 && (
                                        <Button
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => {
                                                setSelectedBulkTopicIds(availableGlobalTopics.map((t) => t.id));
                                                setOpenBulkImportDialog(true);
                                            }}
                                        >
                                            <Download className="h-4 w-4" /> Importar Todos del Banco ({availableGlobalTopics.length})
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => setOpenAddTopicDialog(true)}>
                                        Agregar Tema Manual
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y rounded-xl border bg-card">
                                {course.course_topics.map((topic, index) => (
                                    <div key={topic.id} className="p-4 hover:bg-muted/10 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground mt-0.5">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-semibold text-foreground">{topic.title}</h4>
                                                        {topic.subtopics && topic.subtopics.length > 0 && (
                                                            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <Layers className="h-2.5 w-2.5" /> {topic.subtopics.length} subtema(s)
                                                            </span>
                                                        )}
                                                    </div>
                                                    {topic.unit_title && (
                                                        <span className="text-xs text-muted-foreground block">{topic.unit_title}</span>
                                                    )}
                                                    {topic.description && (
                                                        <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{topic.description}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                                    disabled={index === 0}
                                                    onClick={() => handleReorderCourseRootTopics(index, 'up')}
                                                    title="Subir tema en el pensum"
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                                    disabled={index === course.course_topics.length - 1}
                                                    onClick={() => handleReorderCourseRootTopics(index, 'down')}
                                                    title="Bajar tema en el pensum"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                                                    onClick={() => handleOpenAddSubtopic(topic)}
                                                    title="Agregar subtema a este tema"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Subtema
                                                </Button>

                                                {topic.topic_id && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                                        disabled={syncingTopicId === topic.id}
                                                        onClick={() => handleSyncSingleTopic(topic.id, topic.title)}
                                                        title="Actualizar este tema y sus subtemas desde el Banco Global"
                                                    >
                                                        <RefreshCw className={`h-3.5 w-3.5 ${syncingTopicId === topic.id ? 'animate-spin' : ''}`} />
                                                    </Button>
                                                )}

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleRemoveTopicFromPensum(topic.id, topic.title)}
                                                    title="Retirar tema del pensum"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Nested Subtopics with Reordering */}
                                        {topic.subtopics && topic.subtopics.length > 0 && (
                                            <div className="ml-10 mt-3 pt-2.5 border-t border-dashed space-y-1.5">
                                                {topic.subtopics.map((sub, subIdx) => (
                                                    <div
                                                        key={sub.id}
                                                        className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30 hover:bg-muted/60 transition-colors text-xs"
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <CornerDownRight className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                                            <span className="font-mono text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border shrink-0">
                                                                {index + 1}.{subIdx + 1}
                                                            </span>
                                                            <span className="font-medium text-foreground truncate">{sub.title}</span>
                                                            {sub.description && (
                                                                <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                                                                    — {sub.description}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                                                disabled={subIdx === 0}
                                                                onClick={() => handleReorderCourseSubtopics(topic, subIdx, 'up')}
                                                                title="Subir subtema"
                                                            >
                                                                <ChevronUp className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                                                disabled={subIdx === topic.subtopics!.length - 1}
                                                                onClick={() => handleReorderCourseSubtopics(topic, subIdx, 'down')}
                                                                title="Bajar subtema"
                                                            >
                                                                <ChevronDown className="h-3 w-3" />
                                                            </Button>
                                                            {sub.topic_id && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary shrink-0"
                                                                    disabled={syncingTopicId === sub.id}
                                                                    onClick={() => handleSyncSingleTopic(sub.id, sub.title)}
                                                                    title="Actualizar subtema desde el Banco Global"
                                                                >
                                                                    <RefreshCw className={`h-3 w-3 ${syncingTopicId === sub.id ? 'animate-spin' : ''}`} />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0 ml-1"
                                                                onClick={() => handleRemoveTopicFromPensum(sub.id, sub.title)}
                                                                title="Retirar subtema"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 3: Students list */}
                {activeTab === 'students' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-foreground">Alumnos Matriculados</h3>
                                <p className="text-xs text-muted-foreground">
                                    Estudiantes asignados a esta sección y su puesto/PC preferido.
                                </p>
                            </div>

                            <Dialog open={openEnrollDialog} onOpenChange={setOpenEnrollDialog}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-2">
                                        <Plus className="h-4 w-4" /> Matricular Estudiante
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Matricular Estudiante en el Curso</DialogTitle>
                                        <DialogDescription>
                                            Selecciona a un estudiante previamente registrado por la institución para asignarlo a este curso.
                                        </DialogDescription>
                                    </DialogHeader>

                                    {availableStudents.length === 0 ? (
                                        <div className="py-4 space-y-3">
                                            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                                                <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                                                <p className="font-medium text-foreground">
                                                    {institutionStudents.length === 0
                                                        ? 'No hay estudiantes matriculados en la institución todavía.'
                                                        : 'Todos los estudiantes registrados en la institución ya están matriculados en este curso.'}
                                                </p>
                                                <p className="mt-1 text-muted-foreground">
                                                    Los estudiantes deben ser matriculados primero a nivel institucional para estar disponibles en los cursos.
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <Link
                                                    href="/students"
                                                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Ir al Padrón Institucional
                                                </Link>
                                                <Button type="button" variant="outline" size="sm" onClick={() => setOpenEnrollDialog(false)}>
                                                    Cerrar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleEnrollStudentSubmit} className="space-y-4 pt-2">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="student_id">Estudiante de la Institución *</Label>
                                                    <Link
                                                        href="/students"
                                                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <Plus className="h-3 w-3" /> Nuevo en Sede
                                                    </Link>
                                                </div>
                                                <SearchableSelect
                                                    options={studentSelectOptions}
                                                    value={enrollStudentForm.data.student_id}
                                                    onChange={(sId) => enrollStudentForm.setData('student_id', String(sId))}
                                                    placeholder="Buscar por apellido, nombre o cédula..."
                                                    searchPlaceholder="Escribe el nombre o cédula..."
                                                    required
                                                />
                                                {enrollStudentForm.errors.student_id && (
                                                    <p className="text-xs text-destructive">{enrollStudentForm.errors.student_id}</p>
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="preferred_workstation">Puesto / PC Preferida (Laboratorio)</Label>
                                                <Input
                                                    id="preferred_workstation"
                                                    value={enrollStudentForm.data.preferred_workstation}
                                                    onChange={(e) => enrollStudentForm.setData('preferred_workstation', e.target.value)}
                                                    placeholder="Ej: PC-01"
                                                />
                                                {enrollStudentForm.errors.preferred_workstation && (
                                                    <p className="text-xs text-destructive">{enrollStudentForm.errors.preferred_workstation}</p>
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button type="button" variant="outline" onClick={() => setOpenEnrollDialog(false)}>
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={enrollStudentForm.processing || !enrollStudentForm.data.student_id}
                                                >
                                                    {enrollStudentForm.processing ? 'Matriculando...' : 'Matricular en Curso'}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>

                        {course.students.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                                <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p className="font-medium text-foreground">No hay alumnos matriculados todavía en este curso.</p>
                                <p className="text-xs mt-1">
                                    Incorpora a los estudiantes matriculados previamente por la institución para iniciar el seguimiento pedagógico.
                                </p>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <Button size="sm" onClick={() => setOpenEnrollDialog(true)}>
                                        <Plus className="h-4 w-4 mr-1.5" /> Matricular Estudiante
                                    </Button>
                                    {institutionStudents.length === 0 && (
                                        <Link href="/students">
                                            <Button size="sm" variant="outline">
                                                <UserCheck className="h-4 w-4 mr-1.5" /> Padrón de Estudiantes
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-card overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-foreground">Nombre Completo</th>
                                            <th className="px-4 py-3 font-semibold text-foreground">Cédula/Carnet</th>
                                            <th className="px-4 py-3 font-semibold text-foreground">Puesto/PC Asignada</th>
                                            <th className="px-4 py-3 font-semibold text-foreground text-right min-w-[70px]">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {course.students.map((student) => (
                                            <tr key={student.id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {student.last_name}, {student.first_name}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground font-mono">
                                                    {student.student_id_number || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {student.preferred_workstation ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-foreground font-mono">
                                                            <Computer className="h-3 w-3" /> {student.preferred_workstation}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">Sin puesto fijo</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleRemoveStudent(student.id, `${student.first_name} ${student.last_name}`)}
                                                        title="Desmatricular estudiante"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 4: Sessions History */}
                {activeTab === 'sessions' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-foreground">Historial de Clases Dictadas</h3>
                                <p className="text-xs text-muted-foreground">
                                    Registro cronológico de sesiones de laboratorio y temas impartidos.
                                </p>
                            </div>

                            <Link href={`/courses/${course.id}/sessions/create`}>
                                <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Play className="h-3.5 w-3.5 fill-white" /> Iniciar Nueva Sesión
                                </Button>
                            </Link>
                        </div>

                        {course.sessions.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                                <History className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p>No se han registrado sesiones de clase aún.</p>
                            </div>
                        ) : (
                            <div className="divide-y rounded-xl border bg-card">
                                {course.sessions.map((session) => (
                                    <div key={session.id} className="p-4 hover:bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-foreground">
                                                    {session.title || 'Sesión de Clase'}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                                    session.status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                }`}>
                                                    {session.status === 'completed' ? 'Cerrada' : 'Borrador'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                                                <span>Fecha: {session.session_date}</span>
                                                <span>Asistencia: {session.attendances?.length || 0} alumnos</span>
                                            </div>

                                            {session.topics && session.topics.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {session.topics.map((t) => (
                                                        <span key={t.id} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                                            {t.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 5: Teachers / Staff */}
                {activeTab === 'teachers' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-base text-foreground">Equipo Docente del Curso</h3>
                                <p className="text-xs text-muted-foreground">
                                    Profesores autorizados para dictar sesiones, pasar asistencia y registrar el avance en este grupo.
                                </p>
                            </div>

                            {canManageTeachers && (
                                <Dialog open={openAddTeacherDialog} onOpenChange={setOpenAddTeacherDialog}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="gap-2">
                                            <Plus className="h-4 w-4" /> Asignar Docente
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Asignar Docente al Curso</DialogTitle>
                                            <DialogDescription>
                                                Selecciona un docente de {course.institution?.name} para vincularlo a este curso.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <form onSubmit={handleAddTeacherSubmit} className="space-y-4 pt-2">
                                            <div className="space-y-1.5">
                                                <Label>Docente *</Label>
                                                <SearchableSelect
                                                    options={availableTeachers
                                                        .filter((t) => !course.teachers?.some((ct) => ct.id === t.id))
                                                        .map((t) => ({
                                                            value: t.id,
                                                            label: t.name,
                                                            subLabel: t.email,
                                                        }))}
                                                    value={addTeacherForm.data.user_id}
                                                    onChange={(val) => addTeacherForm.setData('user_id', String(val))}
                                                    placeholder="Seleccionar profesor..."
                                                    searchPlaceholder="Buscar por nombre o correo..."
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="checkbox"
                                                    id="is_primary_checkbox"
                                                    checked={addTeacherForm.data.is_primary}
                                                    onChange={(e) => addTeacherForm.setData('is_primary', e.target.checked)}
                                                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <Label htmlFor="is_primary_checkbox" className="text-xs cursor-pointer">
                                                    Asignar como Docente Titular (Responsable principal)
                                                </Label>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setOpenAddTeacherDialog(false)}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={addTeacherForm.processing || !addTeacherForm.data.user_id}
                                                >
                                                    {addTeacherForm.processing ? 'Asignando...' : 'Asignar al Curso'}
                                                </Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>

                        {(!course.teachers || course.teachers.length === 0) ? (
                            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                                <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p>No hay docentes asignados formalmente a este curso.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {course.teachers.map((teacher) => {
                                    const isPrimary = teacher.pivot?.is_primary;
                                    const initials = teacher.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .slice(0, 2)
                                        .join('')
                                        .toUpperCase();

                                    return (
                                        <div
                                            key={teacher.id}
                                            className="rounded-lg border bg-card p-4 shadow-sm flex items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-sm text-foreground">
                                                            {teacher.name}
                                                        </span>
                                                        {isPrimary && (
                                                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                                                                Titular
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground block">
                                                        {teacher.email}
                                                    </span>
                                                </div>
                                            </div>

                                            {canManageTeachers && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                    title="Desvincular del curso"
                                                    onClick={() => handleRemoveTeacher(teacher.id, teacher.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

CourseShow.layout = {
    breadcrumbs: [
        {
            title: 'Cursos',
            href: '/courses',
        },
    ],
};
