import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';

export interface SelectOption {
    value: string | number;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: SelectOption[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
    required?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'No se encontraron resultados.',
    disabled = false,
    className = '',
    required = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Selected option
    const selectedOption = options.find(
        (opt) => String(opt.value) === String(value)
    );

    // Filter options
    const filteredOptions = options.filter((opt) => {
        const query = search.toLowerCase();
        return (
            opt.label.toLowerCase().includes(query) ||
            (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
        );
    });

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Hidden native input for form validation if required */}
            {required && (
                <input
                    type="text"
                    tabIndex={-1}
                    value={value || ''}
                    required={required}
                    onChange={() => {}}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                />
            )}

            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm bg-background border rounded-md text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    disabled
                        ? 'opacity-50 cursor-not-allowed bg-muted'
                        : 'hover:bg-muted/30 cursor-pointer'
                }`}
            >
                <span className={`block truncate ${!selectedOption ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                    {selectedOption && !disabled && (
                        <span
                            onClick={handleClear}
                            className="hover:text-foreground p-0.5 rounded cursor-pointer"
                            title="Limpiar selección"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    )}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </div>
            </button>

            {/* Dropdown Popup */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg text-popover-foreground animate-in fade-in-0 zoom-in-95">
                    {/* Search Input */}
                    <div className="flex items-center border-b px-2.5 py-1.5 gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full text-xs bg-transparent border-0 p-0 focus:outline-none focus:ring-0 text-foreground"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Options List */}
                    <div className="max-h-56 overflow-y-auto p-1 text-xs">
                        {filteredOptions.length === 0 ? (
                            <div className="py-4 text-center text-muted-foreground">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = String(option.value) === String(value);

                                return (
                                    <div
                                        key={String(option.value)}
                                        onClick={() => handleSelect(option.value)}
                                        className={`flex items-center justify-between px-2.5 py-2 rounded cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground font-medium'
                                                : 'hover:bg-muted text-foreground'
                                        }`}
                                    >
                                        <div className="flex flex-col truncate pr-2">
                                            <span className="truncate">{option.label}</span>
                                            {option.subLabel && (
                                                <span
                                                    className={`text-[10px] truncate ${
                                                        isSelected
                                                            ? 'text-primary-foreground/80'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {option.subLabel}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <Check className="h-3.5 w-3.5 shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
