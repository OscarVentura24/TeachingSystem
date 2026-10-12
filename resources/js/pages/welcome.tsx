import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    GraduationCap,
    LayoutGrid,
    Sparkles,
    Monitor,
    ShieldCheck,
    Building2,
    ArrowRight,
    LogIn,
    CheckCircle2,
    BookOpen,
    Users,
    Activity,
    Layers,
    Clock,
    School,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLogoIcon from '@/components/app-logo-icon';
import { dashboard, login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage<{ auth: { user?: { name: string; email: string } } }>().props;

    return (
        <>
            <Head title="H2O Teaching System - Plataforma de Gestión Docente y Acompañamiento en Laboratorio" />

            <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
                {/* 1. Header / Navigation */}
                <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-600 dark:bg-sky-500 text-white flex items-center justify-center shadow-xs">
                                <AppLogoIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <span className="font-bold text-lg tracking-tight text-foreground block leading-none">
                                    H2O <span className="text-sky-600 dark:text-sky-400">Teaching System</span>
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    v2.0 • EdTech & Lab Suite
                                </span>
                            </div>
                        </div>

                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <Link href={dashboard()}>
                                    <Button className="gap-2 font-medium shadow-sm">
                                        <span>Ir al Panel de Control</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <Link href={login()}>
                                    <Button className="gap-2 font-semibold shadow-sm px-5">
                                        <LogIn className="h-4 w-4" />
                                        <span>Iniciar Sesión</span>
                                    </Button>
                                </Link>
                            )}
                        </nav>
                    </div>
                </header>

                {/* 2. Hero Section */}
                <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b bg-gradient-to-b from-muted/30 via-background to-background">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                            {/* Version Pill */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/80 text-xs font-medium text-muted-foreground mb-6 shadow-xs">
                                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>Control de Avance Real en Aula y Laboratorios de Informática</span>
                            </div>

                            {/* Main Headline */}
                            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                                Gestión docente de precisión,{' '}
                                <span className="text-primary underline decoration-primary/30 decoration-wavy decoration-2">
                                    sin perder de vista
                                </span>{' '}
                                a ningún estudiante.
                            </h1>

                            {/* Subtitle */}
                            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                                Conecta asistencia, puestos de cómputo y temas impartidos en un flujo ágil.
                                Separa la explicación física del dominio demostrado y recibe recomendaciones
                                deterministas en tiempo real según los alumnos presentes.
                            </p>

                            {/* Strategic CTA Buttons */}
                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
                                {auth.user ? (
                                    <Link href={dashboard()} className="w-full sm:w-auto">
                                        <Button size="lg" className="w-full sm:w-auto gap-2.5 h-12 px-7 text-base font-semibold shadow-md">
                                            <span>Continuar como {auth.user.name}</span>
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <>
                                        <Link href={login()} className="w-full sm:w-auto">
                                            <Button size="lg" className="w-full sm:w-auto gap-2.5 h-12 px-8 text-base font-semibold shadow-md">
                                                <LogIn className="h-4 w-4" />
                                                <span>Acceder al Portal</span>
                                            </Button>
                                        </Link>
                                        <a href="#features" className="w-full sm:w-auto">
                                            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 text-sm">
                                                Conocer Módulos del Sistema
                                            </Button>
                                        </a>
                                    </>
                                )}
                            </div>

                            {/* Trust badges */}
                            <div className="mt-10 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Multi-Institucional Seguro
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Monitor className="h-4 w-4 text-primary" /> Asignación de Puestos PC
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Activity className="h-4 w-4 text-primary" /> Motor Determinista
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <LayoutGrid className="h-4 w-4 text-primary" /> Matriz Visual de Cobertura
                                </span>
                            </div>
                        </div>

                        {/* Interactive UI Showcase Mockup */}
                        <div className="mt-14 max-w-5xl mx-auto rounded-2xl border bg-card/60 shadow-xl p-4 sm:p-6 backdrop-blur-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    <div className="h-4 w-px bg-border mx-1" />
                                    <span className="text-xs font-semibold text-foreground">
                                        Programación I (Sección A) • Laboratorio Central
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Sesión en Curso
                                    </span>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        5 Alumnos Presentes
                                    </span>
                                </div>
                            </div>

                            {/* Mini Matrix Preview */}
                            <div className="overflow-x-auto rounded-lg border bg-background">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 text-muted-foreground border-b font-medium">
                                        <tr>
                                            <th className="py-2.5 px-3">Estudiante</th>
                                            <th className="py-2.5 px-3">Puesto</th>
                                            <th className="py-2.5 px-2 text-center">T1: Variables</th>
                                            <th className="py-2.5 px-2 text-center">T2: Condicionales</th>
                                            <th className="py-2.5 px-2 text-center">T3: Bucles For</th>
                                            <th className="py-2.5 px-2 text-center">T4: Arrays</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-foreground">
                                        <tr>
                                            <td className="py-2.5 px-3 font-medium">Valeria Morales</td>
                                            <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">PC-01</td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">Logrado</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">Logrado</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">Explicado</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">Pendiente</span></td>
                                        </tr>
                                        <tr>
                                            <td className="py-2.5 px-3 font-medium">Gabriel Navarro</td>
                                            <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">PC-02</td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">Logrado</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">Refuerzo</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">Pendiente</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">Pendiente</span></td>
                                        </tr>
                                        <tr>
                                            <td className="py-2.5 px-3 font-medium">Carlos Mendoza</td>
                                            <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">PC-03</td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">Logrado</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">Logrado</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">Explicado</span></td>
                                            <td className="py-2.5 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">Pendiente</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Live Suggestion Box Callout */}
                            <div className="mt-3 p-3 rounded-lg border bg-primary/5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-foreground">
                                        <strong>Recomendación para hoy:</strong> El tema <em>"Bucles For"</em> beneficia a 4 de los 5 alumnos presentes. 1 alumno requiere refuerzo en <em>"Condicionales"</em>.
                                    </span>
                                </div>
                                <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0 hidden sm:inline-block">
                                    Lógica Determinista
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Core Pillars / Features */}
                <section id="features" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded">
                            Pilares del Sistema
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-3">
                            Diseñado para el aula y laboratorio de computación
                        </h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Herramientas prácticas que resuelven los problemas reales de los grupos con ritmos de aprendizaje dispares.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Pillar 1 */}
                        <div className="rounded-xl border bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
                            <div>
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                                    <LayoutGrid className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-base text-foreground mb-2">
                                    Cobertura vs Aprendizaje
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Separación entre quién recibió la explicación física del tema y quién demostró dominio real, requiere refuerzo o está sin evaluar.
                                </p>
                            </div>
                            <div className="mt-5 pt-3 border-t text-[11px] font-medium text-primary">
                                Sin mezclar presencia con logro
                            </div>
                        </div>

                        {/* Pillar 2 */}
                        <div className="rounded-xl border bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
                            <div>
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-base text-foreground mb-2">
                                    Motor Sugeridor en Vivo
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Calcula qué tema beneficia a más alumnos en el aula considerando prerrequisitos cumplidos y qué estudiantes requieren recuperación.
                                </p>
                            </div>
                            <div className="mt-5 pt-3 border-t text-[11px] font-medium text-primary">
                                Decisión informada, no arbitraria
                            </div>
                        </div>

                        {/* Pillar 3 */}
                        <div className="rounded-xl border bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
                            <div>
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                                    <Monitor className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-base text-foreground mb-2">
                                    Control de Puestos de PC
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Asignación y registro del equipo que ocupa cada estudiante en el laboratorio, facilitando la detección de incidencias de hardware o software.
                                </p>
                            </div>
                            <div className="mt-5 pt-3 border-t text-[11px] font-medium text-primary">
                                Trazabilidad por estación de trabajo
                            </div>
                        </div>

                        {/* Pillar 4 */}
                        <div className="rounded-xl border bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
                            <div>
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-base text-foreground mb-2">
                                    Multi-Tenant Institucional
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Aislamiento completo de instituciones, períodos y asignaciones. Super Admin global, administradores de centro y profesores scoped.
                                </p>
                            </div>
                            <div className="mt-5 pt-3 border-t text-[11px] font-medium text-primary">
                                Jerarquía limpia de 3 niveles
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Strategic Bottom Callout */}
                <section className="border-t bg-muted/20 py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <School className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Acceso Directo al Sistema
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
                            Inicia sesión con tus credenciales docentes o institucionales para ingresar a tus grupos y laboratorios.
                        </p>

                        <div className="mt-6 flex justify-center">
                            {auth.user ? (
                                <Link href={dashboard()}>
                                    <Button size="lg" className="gap-2 font-semibold shadow-md px-8 h-12">
                                        <span>Ir al Panel de Control</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <Link href={login()}>
                                    <Button size="lg" className="gap-2.5 font-semibold shadow-md px-9 h-12 text-base">
                                        <LogIn className="h-5 w-5" />
                                        <span>Iniciar Sesión en H2O Teaching System</span>
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                {/* 5. Minimal Clean Footer */}
                <footer className="border-t py-6 bg-background">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <AppLogoIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                            <span>H2O Teaching System © {new Date().getFullYear()} — Plataforma de Gestión Académica</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Base de Datos PostgreSQL</span>
                            <span>•</span>
                            <span>Monolito Modular</span>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
