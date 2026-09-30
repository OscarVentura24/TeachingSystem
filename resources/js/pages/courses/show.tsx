import React, { useState } from 'react';
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

interface CourseTopic {
    id: number;
    title: string;
    unit_title?: string;
    description?: string;
    sort_order: number;
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
}

interface Teacher {
    id: number;
    name: string;
    email: string;
    pivot?: {
        is_primary: boolean;
    };
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
    canManageTeachers?: boolean;
}

export default function CourseShow({
    course,
    progressByStudent,
    globalTopics,
    availableTeachers = [],
    canManageTeachers = false,
}: Props) {
    const [activeTab, setActiveTab] = useState<'matrix' | 'pensum' | 'students' | 'sessions' | 'teachers'>('matrix');
    const [openAddTopicDialog, setOpenAddTopicDialog] = useState(false);
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
        title: '',
        unit_title: '',
        description: '',
    });

    // Form to create and enroll student
    const enrollStudentForm = useForm({
        first_name: '',
        last_name: '',
        student_id_number: '',
        preferred_workstation: '',
    });

    const handleSelectGlobalTopic = (topicId: string | number) => {
        const selected = globalTopics.find((t) => String(t.id) === String(topicId));
        if (selected) {
            addTopicForm.setData({
                topic_id: String(selected.id),
                title: selected.title,
                unit_title: selected.unit_title || '',
                description: selected.description || '',
            });
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
        enrollStudentForm.post(`/courses/${course.id}/enrollments/create-and-enroll`, {
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

    const handleRemoveStudent = (studentId: number, name: string) => {
        if (confirm(`¿Desmatricular a "${name}" de este curso?\n\nSus registros históricos en sesiones previas se conservarán.`)) {
            router.delete(`/courses/${course.id}/students/${studentId}`);
        }
    };

    return (
        <>
            <Head title={`${course.name} - TeachingSystem`} />

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
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-foreground">Temario del Curso (Pensum)</h3>
                                <p className="text-xs text-muted-foreground">
                                    Los temas seleccionados aquí forman el pensum ordenado de la asignatura.
                                </p>
                            </div>

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
                                        {globalTopics.length > 0 && (
                                            <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg border">
                                                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                                                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Cargar desde Banco Global
                                                </Label>
                                                <SearchableSelect
                                                    options={globalTopics.map((gt) => ({
                                                        value: gt.id,
                                                        label: gt.title,
                                                        subLabel: `[${gt.area}] ${gt.unit_title ? `• ${gt.unit_title}` : ''}`,
                                                    }))}
                                                    value={addTopicForm.data.topic_id}
                                                    onChange={handleSelectGlobalTopic}
                                                    placeholder="Buscar tema del banco global..."
                                                    searchPlaceholder="Buscar por título, área o unidad..."
                                                />
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
                        </div>

                        {course.course_topics.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p>No hay temas agregados al pensum todavía.</p>
                                <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpenAddTopicDialog(true)}>
                                    Agregar Primer Tema
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y rounded-xl border bg-card">
                                {course.course_topics.map((topic, index) => (
                                    <div key={topic.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                                        <div className="flex items-center gap-4">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <h4 className="text-sm font-semibold text-foreground">{topic.title}</h4>
                                                {topic.unit_title && (
                                                    <span className="text-xs text-muted-foreground block">{topic.unit_title}</span>
                                                )}
                                                {topic.description && (
                                                    <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{topic.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => handleRemoveTopicFromPensum(topic.id, topic.title)}
                                            title="Retirar tema del pensum"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
                                        <DialogTitle>Matricular Estudiante</DialogTitle>
                                        <DialogDescription>
                                            Registra los datos del estudiante para incorporarlo al curso.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleEnrollStudentSubmit} className="space-y-4 pt-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="first_name">Nombres *</Label>
                                                <Input
                                                    id="first_name"
                                                    value={enrollStudentForm.data.first_name}
                                                    onChange={(e) => enrollStudentForm.setData('first_name', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="last_name">Apellidos *</Label>
                                                <Input
                                                    id="last_name"
                                                    value={enrollStudentForm.data.last_name}
                                                    onChange={(e) => enrollStudentForm.setData('last_name', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="student_id_number">Cédula / Carnet Institucional</Label>
                                            <Input
                                                id="student_id_number"
                                                value={enrollStudentForm.data.student_id_number}
                                                onChange={(e) => enrollStudentForm.setData('student_id_number', e.target.value)}
                                                placeholder="Ej: V-28123456"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="preferred_workstation">Puesto / PC Preferida (Laboratorio)</Label>
                                            <Input
                                                id="preferred_workstation"
                                                value={enrollStudentForm.data.preferred_workstation}
                                                onChange={(e) => enrollStudentForm.setData('preferred_workstation', e.target.value)}
                                                placeholder="Ej: PC-01"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setOpenEnrollDialog(false)}>
                                                Cancelar
                                            </Button>
                                            <Button type="submit" disabled={enrollStudentForm.processing}>
                                                Matricular
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {course.students.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                                <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p>No hay alumnos matriculados todavía en este curso.</p>
                                <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpenEnrollDialog(true)}>
                                    Matricular Primer Estudiante
                                </Button>
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
