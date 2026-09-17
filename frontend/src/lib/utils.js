import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function initials(name = '') {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}

export function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** yyyy-mm-dd - <input type="date"> isi format me value leta hai */
export function toDateInput(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
}

export function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '-';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(Number(value));
}

export function fullName(student) {
    if (!student) return '';
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
}

export const titleCase = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
