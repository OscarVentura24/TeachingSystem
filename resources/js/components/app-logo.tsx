import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;
    const displayName = (name as string) || 'H2O Teaching System';

    return (
        <div className="flex items-center gap-2.5">
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sky-600 dark:bg-sky-500 text-white shadow-xs shrink-0">
                <AppLogoIcon className="size-6 text-white" />
            </div>
            <div className="grid flex-1 text-left leading-none">
                <span className="truncate text-sm font-bold tracking-tight text-foreground">
                    {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase mt-0.5">
                    EdTech &amp; Lab Suite
                </span>
            </div>
        </div>
    );
}
