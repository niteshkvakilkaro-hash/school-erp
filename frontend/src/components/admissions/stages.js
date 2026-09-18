/** Admission stages - label, badge tone aur pipeline me dot ka rang. */
export const STAGES = {
    enquiry: { label: 'Enquiry', tone: 'secondary', dot: 'bg-slate-400' },
    applied: { label: 'Applied', tone: 'default', dot: 'bg-blue-500' },
    interview: { label: 'Interview', tone: 'warning', dot: 'bg-amber-500' },
    approved: { label: 'Approved', tone: 'success', dot: 'bg-emerald-500' },
    admitted: { label: 'Admitted', tone: 'success', dot: 'bg-primary' },
    rejected: { label: 'Rejected', tone: 'danger', dot: 'bg-red-500' },
    withdrawn: { label: 'Withdrawn', tone: 'muted', dot: 'bg-zinc-400' },
};

export const PIPELINE = ['enquiry', 'applied', 'interview', 'approved', 'admitted'];
export const CLOSED = ['rejected', 'withdrawn'];

export const SOURCES = {
    'walk-in': 'Walk-in',
    phone: 'Phone call',
    website: 'Website',
    referral: 'Referral',
    social: 'Social media',
    other: 'Other',
};

/** Stage badalne wale button par kya likha ho. */
export const ACTION_LABEL = {
    enquiry: 'Reopen',
    applied: 'Form mila',
    interview: 'Interview schedule',
    approved: 'Approve',
    rejected: 'Reject',
    withdrawn: 'Withdrawn',
};

export function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** <input type="datetime-local"> ke liye local time string. */
export function toDateTimeInput(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function ageFrom(dob) {
    if (!dob) return null;
    const b = new Date(dob);
    const now = new Date();
    let y = now.getFullYear() - b.getFullYear();
    if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) y--;
    return y;
}
