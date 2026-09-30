import { Link, usePage } from '@inertiajs/react';
import { BookMarked, BookOpen, Building2, FolderGit2, GraduationCap, LayoutGrid, Library, Users } from 'lucide-react';
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
        institutionContext?: { isSuperAdmin?: boolean };
    }>().props;
    const isSuperAdmin = institutionContext?.isSuperAdmin;

    const navItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        ...(isSuperAdmin
            ? [
                  {
                      title: 'Instituciones',
                      href: '/institutions',
                      icon: Building2,
                  },
              ]
            : []),
        {
            title: 'Cursos',
            href: '/courses',
            icon: GraduationCap,
        },
        {
            title: 'Docentes',
            href: '/teachers',
            icon: Users,
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
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
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
