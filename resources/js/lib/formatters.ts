/**
 * Format an ISO or YYYY-MM-DD date string into a natural Spanish format.
 * Example: "13 de octubre de 2026"
 */
export function formatNaturalDate(dateString?: string | null): string {
    if (!dateString) return '—';
    const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const parts = datePart.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return dateString;

    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

/**
 * Format an ISO or YYYY-MM-DD date string into a natural Spanish format with weekday capitalized.
 * Example: "Martes, 13 de octubre de 2026"
 */
export function formatNaturalDateWithDay(dateString?: string | null): string {
    if (!dateString) return '—';
    const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const parts = datePart.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return dateString;

    const date = new Date(year, month - 1, day);
    const formatted = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
