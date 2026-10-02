// utils.ts
import type { ModelParameter } from '../shared/types';

export const formatMetric = (value: number | null | undefined, digits = 3): string =>
    value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);

export function formatDuration(minutes: number | null | undefined): string {
    if (minutes == null || !Number.isFinite(minutes)) return '—';
    const total = Math.max(0, Math.round(minutes));
    if (total < 60) return `${total}m`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatDate(iso: string, withTime = false): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

export const formatNumber = (value: number): string => value.toLocaleString();

export const formatLearningRate = (value: number): string => value.toExponential(1);

export function formatParameterValue(param: Pick<ModelParameter, 'name' | 'type' | 'scale'>, value: unknown): string {
    if (typeof value === 'boolean') return value ? 'On' : 'Off';
    if (typeof value === 'number') {
        if (param.scale === 'log') return formatLearningRate(value);
        if (param.type === 'range') return value.toFixed(2);
        return String(value);
    }
    return String(value ?? '—');
}

export function downloadFile(filename: string, content: string, type = 'text/csv'): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export function toCsv(rows: (string | number)[][]): string {
    return rows
        .map(row => row.map(cell => {
            const text = String(cell);
            return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        }).join(','))
        .join('\n');
}
