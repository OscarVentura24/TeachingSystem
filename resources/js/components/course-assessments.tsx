import React, { useState, useMemo } from 'react';
import { router, Link } from '@inertiajs/react';
import {
    Award,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Calendar,
    FileText,
    BookOpen,
    Users,
    Search,
    Calculator,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    student_id_number?: string;
}

interface CourseTopic {
    id: number;
    title: string;
    unit_title?: string;
    subtopics?: CourseTopic[];
}

interface AssessmentScore {
    id: number;
    assessment_id: number;
    student_id: number;
    score: string | number | null;
    status: 'present' | 'absent' | 'excused';
    feedback?: string;
}

interface Assessment {
    id: number;
    course_id: number;
    title: string;
    description?: string;
    assessment_type: 'exam' | 'practical' | 'project' | 'quiz';
    assessment_date: string;
    max_score: string | number;
    passing_score: string | number;
    weight_percentage?: string | number | null;
    auto_sync_mastery: boolean;
    topics?: CourseTopic[];
    scores?: AssessmentScore[];
    createdBy?: { id: number; name: string };
}

interface Props {
    courseId: number;
    assessments: Assessment[];
    students: Student[];
    courseTopics: CourseTopic[];
    readOnly?: boolean;
}

export function CourseAssessments({ courseId, assessments, students, courseTopics, readOnly = false }: Props) {
    const [viewMode, setViewMode] = useState<'gradebook' | 'list'>('gradebook');
    const [searchStudent, setSearchStudent] = useState('');
    const [openGradingDialog, setOpenGradingDialog] = useState(false);
    const [gradingAssessment, setGradingAssessment] = useState<Assessment | null>(null);
    const [deleteAssessmentConfirm, setDeleteAssessmentConfirm] = useState<Assessment | null>(null);

    // Form for grading
    const [gradingScores, setGradingScores] = useState<Record<number, { score: string; status: 'present' | 'absent' | 'excused'; feedback: string }>>({});
    const [isSavingScores, setIsSavingScores] = useState(false);

    // Open grading dialog
    const handleOpenGrading = (assessment: Assessment) => {
        setGradingAssessment(assessment);
        const initial: Record<number, { score: string; status: 'present' | 'absent' | 'excused'; feedback: string }> = {};

        const existingScoresMap = new Map<number, AssessmentScore>();
        if (assessment.scores) {
            assessment.scores.forEach((s) => existingScoresMap.set(s.student_id, s));
        }

        students.forEach((st) => {
            const ex = existingScoresMap.get(st.id);
            initial[st.id] = {
                score: ex && ex.score !== null ? String(ex.score) : '',
                status: ex ? ex.status : 'present',
                feedback: ex?.feedback || '',
            };
        });

        setGradingScores(initial);
        setOpenGradingDialog(true);
    };

    // Submit scores
    const handleSaveScores = () => {
        if (!gradingAssessment) return;
        setIsSavingScores(true);

        const payload = Object.entries(gradingScores).map(([studentIdStr, val]) => ({
            student_id: Number(studentIdStr),
            score: val.status === 'present' && val.score !== '' ? Number(val.score) : null,
            status: val.status,
            feedback: val.feedback || null,
        }));

        router.post(
            `/courses/${courseId}/assessments/${gradingAssessment.id}/scores`,
            { scores: payload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSavingScores(false);
                    setOpenGradingDialog(false);
                },
                onError: () => setIsSavingScores(false),
            }
        );
    };

    // Delete assessment
    const handleDeleteAssessment = () => {
        if (!deleteAssessmentConfirm) return;
        router.delete(`/courses/${courseId}/assessments/${deleteAssessmentConfirm.id}`, {
            onSuccess: () => setDeleteAssessmentConfirm(null),
        });
    };

    // Filter students for gradebook
    const filteredStudents = useMemo(() => {
        const q = searchStudent.toLowerCase().trim();
        if (!q) return students;
        return students.filter(
            (s) =>
                s.first_name.toLowerCase().includes(q) ||
                s.last_name.toLowerCase().includes(q) ||
                (s.student_id_number && s.student_id_number.toLowerCase().includes(q))
        );
    }, [students, searchStudent]);

    // Calculate global stats
    const stats = useMemo(() => {
        let totalScores = 0;
        let sumPercentages = 0;

        assessments.forEach((a) => {
            const max = Number(a.max_score);
            if (a.scores && max > 0) {
                a.scores.forEach((s) => {
                    if (s.status === 'present' && s.score !== null) {
                        sumPercentages += (Number(s.score) / max) * 100;
                        totalScores++;
                    }
                });
            }
        });

        const avgPercentage = totalScores > 0 ? Math.round(sumPercentages / totalScores) : 0;
        return {
            totalAssessments: assessments.length,
            gradedAssessments: assessments.filter((a) => a.scores && a.scores.some((s) => s.score !== null)).length,
            averagePercentage: avgPercentage,
        };
    }, [assessments]);

    // Student score lookup map: studentId -> assessmentId -> AssessmentScore
    const scoresMap = useMemo(() => {
        const map = new Map<number, Map<number, AssessmentScore>>();
        assessments.forEach((a) => {
            if (a.scores) {
                a.scores.forEach((s) => {
                    if (!map.has(s.student_id)) {
                        map.set(s.student_id, new Map());
                    }
                    map.get(s.student_id)!.set(a.id, s);
                });
            }
        });
        return map;
    }, [assessments]);

    const getAssessmentTypeLabel = (type: string) => {
        switch (type) {
            case 'exam':
                return { label: 'Examen Teórico', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' };
            case 'practical':
                return { label: 'Prueba Práctica (Lab)', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' };
            case 'project':
                return { label: 'Proyecto / Tarea', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' };
            case 'quiz':
                return { label: 'Quiz / Control', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' };
            default:
                return { label: type, color: 'bg-muted text-muted-foreground border-border' };
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-primary" /> Evaluaciones Creadas
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">{stats.totalAssessments}</span>
                        <span className="text-xs text-muted-foreground">
                            ({stats.gradedAssessments} calificadas)
                        </span>
                    </div>
                </div>

                <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Promedio General
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.averagePercentage}%
                        </span>
                        <span className="text-xs text-muted-foreground">desempeño grupal</span>
                    </div>
                </div>

                <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" /> Estudiantes Evaluados
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">{students.length}</span>
                        <span className="text-xs text-muted-foreground">alumnos en el curso</span>
                    </div>
                </div>
            </div>

            {/* Actions & Tab Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setViewMode('gradebook')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            viewMode === 'gradebook'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        Cuaderno de Calificaciones (Sábana)
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            viewMode === 'list'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        Lista de Evaluaciones ({assessments.length})
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {readOnly ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Award className="h-3.5 w-3.5" /> Modo de solo lectura
                        </span>
                    ) : (
                        <Link href={`/courses/${courseId}/assessments/create`}>
                            <Button size="sm" className="gap-1.5 text-xs">
                                <Plus className="h-3.5 w-3.5" /> Nueva Evaluación
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* View 1: Gradebook Matrix */}
            {viewMode === 'gradebook' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filtrar estudiante por nombre..."
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 text-xs bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Aprobado (&ge; 70%)
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-amber-500"></span> Refuerzo (&lt; 70%)
                            </span>
                        </div>
                    </div>

                    {assessments.length === 0 ? (
                        <div className="p-8 rounded-xl border border-dashed text-center text-muted-foreground space-y-2">
                            <Award className="h-8 w-8 mx-auto opacity-40" />
                            <p className="text-sm font-medium">Aún no hay evaluaciones registradas en este curso.</p>
                            <p className="text-xs">Crea tu primer examen o prueba práctica haciendo clic en "+ Nueva Evaluación".</p>
                        </div>
                    ) : (
                        <div className="relative max-h-[600px] overflow-auto rounded-xl border bg-card shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur border-b">
                                    <tr>
                                        <th className="sticky left-0 z-30 bg-muted/95 backdrop-blur px-4 py-3 font-semibold text-foreground min-w-[200px]">
                                            Estudiante ({filteredStudents.length})
                                        </th>
                                        {assessments.map((ass) => (
                                            <th key={ass.id} className="px-3 py-3 text-center min-w-[130px]">
                                                <div className="font-semibold text-foreground truncate max-w-[140px]" title={ass.title}>
                                                    {ass.title}
                                                </div>
                                                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-mono mt-0.5">
                                                    <span>Max: {Number(ass.max_score)}</span>
                                                    {ass.weight_percentage && (
                                                        <span className="bg-muted px-1 rounded">({Number(ass.weight_percentage)}%)</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenGrading(ass)}
                                                    className="mt-1 text-[10px] text-primary hover:underline font-medium block mx-auto"
                                                >
                                                    {readOnly ? 'Ver notas' : 'Calificar'}
                                                </button>
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 text-center min-w-[100px] font-semibold text-foreground">
                                            Promedio Final
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredStudents.map((st) => {
                                        const stMap = scoresMap.get(st.id);
                                        let studentSumPercentage = 0;
                                        let countEvaluated = 0;

                                        assessments.forEach((ass) => {
                                            const sc = stMap?.get(ass.id);
                                            const max = Number(ass.max_score);
                                            if (sc && sc.status === 'present' && sc.score !== null && max > 0) {
                                                studentSumPercentage += (Number(sc.score) / max) * 100;
                                                countEvaluated++;
                                            }
                                        });

                                        const avg = countEvaluated > 0 ? Math.round(studentSumPercentage / countEvaluated) : null;

                                        return (
                                            <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium text-foreground">
                                                    <div>
                                                        <span>{st.last_name}, {st.first_name}</span>
                                                        {st.student_id_number && (
                                                            <span className="text-[10px] text-muted-foreground font-mono block">
                                                                {st.student_id_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {assessments.map((ass) => {
                                                    const sc = stMap?.get(ass.id);
                                                    const max = Number(ass.max_score);
                                                    const passing = Number(ass.passing_score);

                                                    if (!sc || sc.score === null || sc.status !== 'present') {
                                                        return (
                                                            <td key={ass.id} className="px-3 py-2.5 text-center text-muted-foreground">
                                                                {sc?.status === 'absent' ? (
                                                                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                                                        Ausente
                                                                    </span>
                                                                ) : sc?.status === 'excused' ? (
                                                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                                        Justificado
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground/40 font-mono">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    }

                                                    const numScore = Number(sc.score);
                                                    const isPassing = numScore >= passing;
                                                    const isMastered = (numScore / max) * 100 >= 85;

                                                    return (
                                                        <td
                                                            key={ass.id}
                                                            className={`px-3 py-2.5 text-center font-mono font-semibold ${
                                                                isMastered
                                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                                    : isPassing
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                                            }`}
                                                            title={isMastered ? 'Dominado' : isPassing ? 'Aprobado' : 'Requiere Refuerzo'}
                                                        >
                                                            <span>{numScore}</span>
                                                        </td>
                                                    );
                                                })}

                                                {/* Average Column */}
                                                <td className="px-3 py-2.5 text-center font-mono font-bold">
                                                    {avg !== null ? (
                                                        <span
                                                            className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                                                                avg >= 85
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                    : avg >= 70
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                            }`}
                                                        >
                                                            {avg}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/40 font-normal text-xs">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* View 2: Detailed Assessment Cards */}
            {viewMode === 'list' && (
                <div className="space-y-4">
                    {assessments.length === 0 ? (
                        <div className="p-8 rounded-xl border border-dashed text-center text-muted-foreground space-y-2">
                            <p className="text-sm font-medium">No hay evaluaciones registradas.</p>
                            {!readOnly && (
                                <Link href={`/courses/${courseId}/assessments/create`}>
                                    <Button size="sm" variant="outline" className="text-xs">
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Crear Primera Evaluación
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {assessments.map((ass) => {
                                const typeBadge = getAssessmentTypeLabel(ass.assessment_type);
                                const gradedCount = ass.scores ? ass.scores.filter((s) => s.score !== null).length : 0;

                                return (
                                    <div key={ass.id} className="p-4 rounded-xl border bg-card shadow-sm space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${typeBadge.color} mb-1.5`}>
                                                    {typeBadge.label}
                                                </span>
                                                <h4 className="text-sm font-bold text-foreground">{ass.title}</h4>
                                                {ass.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {ass.description}
                                                    </p>
                                                )}
                                            </div>
                                            {!readOnly && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Link href={`/courses/${courseId}/assessments/${ass.id}/edit`}>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                            title="Editar evaluación"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setDeleteAssessmentConfirm(ass)}
                                                        title="Eliminar evaluación"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1 border-t">
                                            <span className="flex items-center gap-1 font-mono">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {ass.assessment_date}
                                            </span>
                                            <span className="font-mono">
                                                Escala: 0 a {Number(ass.max_score)} pts (Aprueba con &ge; {Number(ass.passing_score)})
                                            </span>
                                            {ass.weight_percentage && (
                                                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold">
                                                    Ponderación: {Number(ass.weight_percentage)}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Linked Topics */}
                                        {ass.topics && ass.topics.length > 0 && (
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                                    <BookOpen className="h-3 w-3" /> Temas Evaluados ({ass.topics.length})
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {ass.topics.map((t) => (
                                                        <span
                                                            key={t.id}
                                                            className="text-[10px] bg-muted/80 text-foreground px-2 py-0.5 rounded font-medium"
                                                        >
                                                            {t.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <span className="text-xs text-muted-foreground">
                                                Calificados: <strong className="text-foreground">{gradedCount}/{students.length}</strong>
                                            </span>
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenGrading(ass)}
                                                className="text-xs gap-1.5"
                                            >
                                                <Check className="h-3.5 w-3.5" /> {readOnly ? 'Ver Calificaciones' : 'Ingresar Calificaciones'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Bulk Grading Dialog */}
            <Dialog open={openGradingDialog} onOpenChange={setOpenGradingDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">
                            {readOnly ? 'Consultar Calificaciones: ' : 'Calificar: '} {gradingAssessment?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Escala de calificación: 0 a {gradingAssessment ? Number(gradingAssessment.max_score) : 100} pts (Aprobatoria: &ge; {gradingAssessment ? Number(gradingAssessment.passing_score) : 70}).
                            {readOnly && ' (Modo de solo lectura)'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[440px] overflow-y-auto space-y-2 py-3">
                        {students.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No hay estudiantes matriculados en este curso.</p>
                        ) : (
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 bg-muted/95 border-b z-10">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">Estudiante</th>
                                        <th className="px-3 py-2 font-semibold w-28">Estado</th>
                                        <th className="px-3 py-2 font-semibold w-28 text-center">Calificación</th>
                                        <th className="px-3 py-2 font-semibold w-28 text-center">Impacto</th>
                                        <th className="px-3 py-2 font-semibold">Feedback / Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {students.map((st) => {
                                        const row = gradingScores[st.id] || { score: '', status: 'present', feedback: '' };
                                        const numScore = row.score !== '' ? Number(row.score) : null;
                                        const maxScore = gradingAssessment ? Number(gradingAssessment.max_score) : 100;
                                        const passingScore = gradingAssessment ? Number(gradingAssessment.passing_score) : 70;

                                        const isPassing = numScore !== null && numScore >= passingScore;
                                        const isMastered = numScore !== null && (numScore / maxScore) * 100 >= 85;

                                        return (
                                            <tr key={st.id} className="hover:bg-muted/20">
                                                <td className="px-3 py-2 font-medium">
                                                    <span>{st.last_name}, {st.first_name}</span>
                                                    {st.student_id_number && (
                                                        <span className="text-[10px] text-muted-foreground font-mono block">
                                                            {st.student_id_number}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status Selector */}
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={row.status}
                                                        disabled={readOnly}
                                                        onChange={(e) =>
                                                            setGradingScores({
                                                                ...gradingScores,
                                                                [st.id]: { ...row, status: e.target.value as any },
                                                            })
                                                        }
                                                        className="w-full px-2 py-1 rounded border bg-background text-[11px] disabled:opacity-75 disabled:cursor-not-allowed"
                                                    >
                                                        <option value="present">Presente</option>
                                                        <option value="absent">Ausente</option>
                                                        <option value="excused">Justificado</option>
                                                    </select>
                                                </td>

                                                {/* Numeric Score Input */}
                                                <td className="px-3 py-2 text-center">
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        max={maxScore}
                                                        disabled={readOnly || row.status !== 'present'}
                                                        placeholder="0"
                                                        value={row.score}
                                                        onChange={(e) =>
                                                            setGradingScores({
                                                                ...gradingScores,
                                                                [st.id]: { ...row, score: e.target.value },
                                                            })
                                                        }
                                                        className="w-20 px-2 py-1 text-xs text-center font-mono font-bold rounded border bg-background focus:ring-1 focus:ring-primary disabled:opacity-75 disabled:cursor-not-allowed"
                                                    />
                                                </td>

                                                {/* Impact Indicator */}
                                                <td className="px-3 py-2 text-center">
                                                    {row.status !== 'present' ? (
                                                        <span className="text-[10px] text-muted-foreground">N/A</span>
                                                    ) : numScore === null ? (
                                                        <span className="text-[10px] text-muted-foreground/60">Sin nota</span>
                                                    ) : isMastered ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                                                            <CheckCircle2 className="h-3 w-3" /> Dominado
                                                        </span>
                                                    ) : isPassing ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                            <Check className="h-3 w-3" /> Aprobado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                                            <AlertTriangle className="h-3 w-3" /> Refuerzo
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Feedback Input */}
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Nota u observación..."
                                                        disabled={readOnly}
                                                        value={row.feedback}
                                                        onChange={(e) =>
                                                            setGradingScores({
                                                                ...gradingScores,
                                                                [st.id]: { ...row, feedback: e.target.value },
                                                            })
                                                        }
                                                        className="w-full px-2 py-1 text-[11px] rounded border bg-background disabled:opacity-75 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <DialogFooter>
                        {readOnly ? (
                            <Button type="button" size="sm" onClick={() => setOpenGradingDialog(false)}>
                                Cerrar
                            </Button>
                        ) : (
                            <>
                                <Button type="button" variant="outline" size="sm" onClick={() => setOpenGradingDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button type="button" size="sm" onClick={handleSaveScores} disabled={isSavingScores}>
                                    {isSavingScores ? 'Guardando...' : 'Guardar Calificaciones'}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Delete Confirmation */}
            <Dialog open={!!deleteAssessmentConfirm} onOpenChange={(open) => !open && setDeleteAssessmentConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">¿Eliminar evaluación?</DialogTitle>
                        <DialogDescription className="text-xs">
                            Se eliminará la evaluación "{deleteAssessmentConfirm?.title}" y todas las calificaciones asociadas. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setDeleteAssessmentConfirm(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDeleteAssessment}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
