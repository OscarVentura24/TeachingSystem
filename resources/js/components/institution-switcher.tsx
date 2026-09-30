import React from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import {
    Building2,
    Check,
    ChevronDown,
    Globe,
    Plus,
    Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InstitutionItem {
    id: number;
    name: string;
    slug?: string;
    code?: string;
}

interface InstitutionContextProps {
    current: InstitutionItem | null;
    available: InstitutionItem[];
    isSuperAdmin: boolean;
    mode: 'institution' | 'global';
}

export function InstitutionSwitcher() {
    const { institutionContext } = usePage<{
        institutionContext?: InstitutionContextProps;
    }>().props;

    if (!institutionContext) {
        return null;
    }

    const { current, available, isSuperAdmin } = institutionContext;

    const handleSwitch = (institutionId: number | 'global') => {
        router.post('/institutions/switch', {
            institution_id: institutionId,
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 border-dashed bg-background/50 hover:bg-accent text-xs font-normal max-w-[240px]"
                >
                    {current ? (
                        <>
                            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate font-medium text-foreground">{current.name}</span>
                        </>
                    ) : (
                        <>
                            <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate font-medium text-foreground">Vista Global</span>
                        </>
                    )}
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                    Contexto de Trabajo
                </DropdownMenuLabel>

                {isSuperAdmin && (
                    <DropdownMenuItem
                        onClick={() => handleSwitch('global')}
                        className="gap-2 text-xs py-2 cursor-pointer font-medium"
                    >
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="flex-1">Vista Global (Super Admin)</span>
                        {!current && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <div className="max-h-48 overflow-y-auto">
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground px-2 py-1">
                        Instituciones ({available.length})
                    </DropdownMenuLabel>

                    {available.map((inst) => {
                        const isCurrent = current?.id === inst.id;
                        return (
                            <DropdownMenuItem
                                key={inst.id}
                                onClick={() => handleSwitch(inst.id)}
                                className={`gap-2 text-xs py-2 cursor-pointer ${
                                    isCurrent ? 'bg-primary/10 text-primary font-semibold' : ''
                                }`}
                            >
                                <Building2 className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                <span className="flex-1 truncate">{inst.name}</span>
                                {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </DropdownMenuItem>
                        );
                    })}
                </div>

                {isSuperAdmin && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link
                                href="/institutions"
                                className="gap-2 text-xs py-2 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                                <Settings className="h-3.5 w-3.5" />
                                <span>Administrar Instituciones</span>
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
