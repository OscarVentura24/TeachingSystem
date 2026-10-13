import { Link, usePage, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BookMarked,
    BookOpen,
    Building2,
    FolderGit2,
    Globe,
    GraduationCap,
    LayoutGrid,
    Library,
    Users,
    UserCheck,
    History,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

interface InstitutionContextProps {
    current: { id: number; name: string; slug?: string; code?: string } | null;
    available: Array<{ id: number; name: string }>;
    isSuperAdmin: boolean;
    mode: 'institution' | 'global';
}

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { institutionContext } = usePage<{
        institutionContext?: InstitutionContextProps;
    }>().props;

    const isSuperAdmin = institutionContext?.isSuperAdmin ?? false;
    const currentInstitution = institutionContext?.current ?? null;
    const isGlobalMode = !currentInstitution && isSuperAdmin;

    // Navigation items strictly segregated by context
    const navItems: NavItem[] = isGlobalMode
        ? [
              {
                  title: 'Dashboard Global',
                  href: dashboard(),
                  icon: LayoutGrid,
              },
              {
                  title: 'Instituciones',
                  href: '/institutions',
                  icon: Building2,
              },
              {
                  title: 'Cursos Globales',
                  href: '/courses',
                  icon: GraduationCap,
              },
              {
                  title: 'Sesiones Globales',
                  href: '/sessions',
                  icon: History,
              },
              {
                  title: 'Docentes Globales',
                  href: '/teachers',
                  icon: Users,
              },
              {
                  title: 'Estudiantes Globales',
                  href: '/students',
                  icon: UserCheck,
              },
              {
                  title: 'Asignaturas',
                  href: '/subjects',
                  icon: BookMarked,
              },
              {
                  title: 'Banco de Temas',
                  href: '/topics',
                  icon: Library,
              },
          ]
        : [
              {
                  title: 'Dashboard',
                  href: dashboard(),
                  icon: LayoutGrid,
              },
              {
                  title: 'Cursos',
                  href: '/courses',
                  icon: GraduationCap,
              },
              {
                  title: 'Sesiones',
                  href: '/sessions',
                  icon: History,
              },
              {
                  title: 'Docentes',
                  href: '/teachers',
                  icon: Users,
              },
              {
                  title: 'Estudiantes',
                  href: '/students',
                  icon: UserCheck,
              },
              {
                  title: 'Banco de Temas',
                  href: '/topics',
                  icon: Library,
              },
          ];

    const handleExitToGlobal = () => {
        router.post('/institutions/switch', {
            institution_id: 'global',
        });
    };

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="border-b pb-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Institutional vs Global Context Indicator */}
                {currentInstitution ? (
                    <div className="mt-2 px-2 py-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border text-xs">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sidebar-foreground truncate">
                                    {currentInstitution.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                                    Panel Institucional
                                </p>
                            </div>
                        </div>

                        {isSuperAdmin && (
                            <button
                                type="button"
                                onClick={handleExitToGlobal}
                                className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-background hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground font-medium border shadow-xs transition-colors"
                            >
                                <ArrowLeft className="h-3 w-3" /> Salir a Plataforma Global
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="mt-2 px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-xs flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-primary text-[11px]">Plataforma Global</span>
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
