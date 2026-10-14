import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle2,
    Lock,
    Trash2,
} from 'lucide-react';

export type ConfirmVariant = 'destructive' | 'warning' | 'default' | 'primary' | 'success';

export interface ConfirmOptions {
    title: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: React.ReactNode;
    isLoading?: boolean;
    onConfirm?: () => void;
}

export interface ConfirmDialogProps extends ConfirmOptions {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'default',
    icon,
    isLoading = false,
    onConfirm,
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onOpenChange(false);
    };

    const renderIcon = () => {
        if (icon) return icon;

        switch (variant) {
            case 'destructive':
                return <Trash2 className="h-5 w-5 text-destructive" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            default:
                return <Info className="h-5 w-5 text-primary" />;
        }
    };

    const getIconContainerClass = () => {
        switch (variant) {
            case 'destructive':
                return 'bg-destructive/10 text-destructive border border-destructive/20';
            case 'warning':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
            case 'success':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
            default:
                return 'bg-primary/10 text-primary border border-primary/20';
        }
    };

    const getConfirmButtonVariant = () => {
        if (variant === 'destructive') return 'destructive';
        return 'default';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="gap-3 sm:gap-4">
                    <div className="flex items-start gap-3">
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getIconContainerClass()}`}
                        >
                            {renderIcon()}
                        </div>
                        <div className="space-y-1 text-left">
                            <DialogTitle className="text-base font-semibold leading-tight text-foreground">
                                {title}
                            </DialogTitle>
                            {description && (
                                <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1 whitespace-pre-line">
                                    {description}
                                </DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        variant={getConfirmButtonVariant()}
                        className={
                            variant === 'warning'
                                ? 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700'
                                : ''
                        }
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function useConfirmDialog() {
    const [config, setConfig] = useState<ConfirmOptions & { open: boolean }>({
        open: false,
        title: '',
    });

    const confirm = (options: ConfirmOptions) => {
        setConfig({
            open: true,
            ...options,
        });
    };

    const close = () => {
        setConfig((prev) => ({ ...prev, open: false }));
    };

    const ConfirmDialogComponent = () => (
        <ConfirmDialog
            open={config.open}
            onOpenChange={(open) => setConfig((prev) => ({ ...prev, open }))}
            title={config.title}
            description={config.description}
            confirmText={config.confirmText}
            cancelText={config.cancelText}
            variant={config.variant}
            icon={config.icon}
            isLoading={config.isLoading}
            onConfirm={config.onConfirm}
        />
    );

    return {
        confirm,
        close,
        ConfirmDialogComponent,
    };
}
