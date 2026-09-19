import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const SHOW_MAX = 300;
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

// Excel me "=..." formula na ban jaye (CSV injection) - aage ' laga dete hain
const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
};

function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Stat({ label, value, tone }) {
    const tones = {
        brand: 'bg-accent text-accent-foreground',
        red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        muted: 'bg-muted text-foreground',
    };
    return (
        <div className={cn('rounded-xl px-4 py-3', tones[tone])}>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs opacity-80">{label}</p>
        </div>
    );
}

export function ImportStudentsModal({ open, onClose, onImported }) {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [parentLogins, setParentLogins] = useState(true);
    const [skipErrors, setSkipErrors] = useState(false);
    const [step, setStep] = useState('pick'); // pick | preview | done
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [filter, setFilter] = useState('errors');
    const [busy, setBusy] = useState(false);

    const reset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setSkipErrors(false);
        setStep('pick');
        if (fileRef.current) fileRef.current.value = '';
    };
    const close = () => {
        if (busy) return;
        const imported = step === 'done';
        reset();
        onClose(imported);
    };

    const template = async () => {
        try {
            const { data } = await api.get('/students/import/template', { responseType: 'blob' });
            downloadBlob(data, 'students-import-template.xlsx');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const form = (extra = {}) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('createParentLogins', String(parentLogins));
        for (const [k, v] of Object.entries(extra)) fd.append(k, String(v));
        return fd;
    };

    const runPreview = async () => {
        if (!file) return toast.error('Pehle file chuniye');
        setBusy(true);
        try {
            const { data } = await api.post('/students/import/preview', form(), MULTIPART);
            setPreview(data.data);
            setFilter(data.data.summary.errors ? 'errors' : 'all');
            setStep('preview');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const runImport = async () => {
        setBusy(true);
        try {
            const { data } = await api.post('/students/import', form({ skipErrors }), MULTIPART);
            setResult(data.data);
            setStep('done');
            toast.success(data.message);
            onImported?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const downloadLogins = () => {
        const lines = [['Parent', 'Login email', 'Password', 'Mobile', 'Bachche'].map(cell).join(',')];
        for (const c of result.credentials) lines.push([c.name, c.email, c.password, c.phone, c.students].map(cell).join(','));
        downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'parent-logins.csv');
    };

    const s = preview?.summary;
    const rows = (preview?.rows || []).filter((r) => (filter === 'errors' ? r.errors.length : filter === 'warnings' ? r.warnings.length : true));
    const canImport = s && s.ready > 0 && (s.errors === 0 || skipErrors);

    let footer = null;
    if (step === 'pick') {
        footer = (
            <>
                <Button variant="outline" onClick={close}>
                    Cancel
                </Button>
                <Button onClick={runPreview} disabled={!file || busy}>
                    <Upload /> {busy ? 'Jaanch rahe hain...' : 'Preview'}
                </Button>
            </>
        );
    } else if (step === 'preview') {
        footer = (
            <>
                <Button variant="outline" onClick={reset} disabled={busy}>
                    Dusri file
                </Button>
                <Button onClick={runImport} disabled={!canImport || busy}>
                    <CheckCircle2 /> {busy ? 'Import ho raha hai...' : s.ready + ' students import kariye'}
                </Button>
            </>
        );
    } else {
        footer = <Button onClick={close}>Ho gaya</Button>;
    }

    return (
        <Modal
            open={open}
            onOpenChange={(v) => !v && close()}
            title="Excel se students"
            description="Ek saath poori class / school - pehle preview, phir import"
            size="lg"
            footer={footer}
        >
            {step === 'pick' ? (
                <div className="space-y-5">
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center">
                        <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
                        <div className="flex-1 text-sm">
                            <p className="font-medium text-foreground">Template download kariye</p>
                            <p className="text-muted-foreground">Aapke school ki classes / sections ke saath. Apni purani Excel bhi chalegi (Name, Class, Mobile...).</p>
                        </div>
                        <Button variant="outline" onClick={template}>
                            <Download /> Template
                        </Button>
                    </div>

                    <label
                        htmlFor="import-file"
                        className={cn(
                            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors',
                            file ? 'border-primary bg-accent/50' : 'border-border hover:border-primary/50'
                        )}
                    >
                        <Upload className="h-7 w-7 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{file ? file.name : '.xlsx ya .csv file chuniye'}</span>
                        <span className="text-xs text-muted-foreground">{file ? Math.ceil(file.size / 1024) + ' KB' : 'Ek baar me 2000 students tak, 5 MB'}</span>
                        <input
                            id="import-file"
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.csv"
                            className="sr-only"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                    </label>

                    <label className="flex items-start gap-3 text-sm">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={parentLogins} onChange={(e) => setParentLogins(e.target.checked)} />
                        <span>
                            <span className="font-medium text-foreground">Parents ka app login bhi banaiye</span>
                            <span className="block text-muted-foreground">
                                Ek mobile = ek login (bhai-behen ek hi login me). Password ki list import ke baad milegi; parent "Password bhool gaye" se OTP ke zariye khud bhi bana sakte hain.
                            </span>
                        </span>
                    </label>
                </div>
            ) : null}

            {step === 'preview' && s ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Kul rows" value={s.total} tone="muted" />
                        <Stat label="Import ke liye taiyaar" value={s.ready} tone="brand" />
                        <Stat label="Galti wali" value={s.errors} tone={s.errors ? 'red' : 'muted'} />
                        <Stat label="Dhyan dijiye" value={s.warnings} tone={s.warnings ? 'amber' : 'muted'} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {s.autoAdmissionNo ? s.autoAdmissionNo + ' ko admission no apne aap milega. ' : ''}
                        {parentLogins ? s.parentsNew + ' naye parent login banenge' + (s.parentsLinked ? ', ' + s.parentsLinked + ' pehle se maujood parent se judenge' : '') + '.' : 'Parent login nahi banenge.'}
                    </p>
                    {preview.unknownColumns?.length ? (
                        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                            Ye columns chhod diye (pehchaan nahi aaye): {preview.unknownColumns.join(', ')}
                        </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                        {[
                            ['errors', 'Galti (' + s.errors + ')'],
                            ['warnings', 'Chetavni (' + s.warnings + ')'],
                            ['all', 'Sab (' + s.total + ')'],
                        ].map(([k, l]) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => setFilter(k)}
                                className={cn(
                                    'rounded-full border px-3 py-1.5 text-sm font-medium',
                                    filter === k ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    <TableWrap className="max-h-[40vh] overflow-auto">
                        <Table>
                            <THead>
                                <TR>
                                    <TH className="w-16">Row</TH>
                                    <TH>Student</TH>
                                    <TH>Class</TH>
                                    <TH>Mobile</TH>
                                    <TH>Jaanch</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {!rows.length ? (
                                    <EmptyRow colSpan={5}>{filter === 'errors' ? 'Koi galti nahi' : 'Kuch nahi'}</EmptyRow>
                                ) : (
                                    rows.slice(0, SHOW_MAX).map((r) => (
                                        <TR key={r.row}>
                                            <TD className="font-mono text-xs text-muted-foreground">{r.row}</TD>
                                            <TD>
                                                <p className="text-sm font-medium text-foreground">{r.name || '-'}</p>
                                                <p className="text-xs text-muted-foreground">{r.admissionNo || 'auto'}{r.fatherName ? ' · ' + r.fatherName : ''}</p>
                                            </TD>
                                            <TD className="text-sm text-foreground">
                                                {r.className || '-'}
                                                {r.sectionName ? ' - ' + r.sectionName : ''}
                                            </TD>
                                            <TD className="font-mono text-xs text-foreground">{r.guardianPhone || '-'}</TD>
                                            <TD className="max-w-xs">
                                                {r.errors.map((e) => (
                                                    <p key={e} className="flex gap-1 text-xs text-destructive">
                                                        <XCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {e}
                                                    </p>
                                                ))}
                                                {r.warnings.map((w) => (
                                                    <p key={w} className="flex gap-1 text-xs text-amber-700 dark:text-amber-300">
                                                        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> {w}
                                                    </p>
                                                ))}
                                                {!r.errors.length && !r.warnings.length ? <Badge variant="success">Theek</Badge> : null}
                                            </TD>
                                        </TR>
                                    ))
                                )}
                            </TBody>
                        </Table>
                    </TableWrap>
                    {rows.length > SHOW_MAX ? <p className="text-xs text-muted-foreground">Pehli {SHOW_MAX} rows dikh rahi hain</p> : null}

                    {s.errors ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                            <p className="text-foreground">Excel me galtiyan theek karke "Dusri file" se dobara daaliye - ya:</p>
                            <label className="mt-2 flex items-center gap-2">
                                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} />
                                <span className="font-medium text-foreground">Sirf sahi {s.ready} rows import kariye, {s.errors} galat chhod dijiye</span>
                            </label>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {step === 'done' && result ? (
                <div className="space-y-5">
                    <div className="flex items-center gap-3 rounded-xl bg-accent p-4">
                        <CheckCircle2 className="h-8 w-8 shrink-0 text-primary" />
                        <div className="text-sm">
                            <p className="font-semibold text-foreground">{result.created} students import ho gaye</p>
                            <p className="text-muted-foreground">
                                {result.parentsCreated} naye parent login, {result.parentsLinked} pehle se maujood parent se jode
                                {result.skipped ? ', ' + result.skipped + ' galat rows chhodi' : ''}
                            </p>
                        </div>
                    </div>

                    {result.credentials.length ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="flex items-center gap-2 font-medium text-foreground">
                                    <KeyRound className="h-4 w-4 text-primary" /> Parent logins
                                </p>
                                <Button variant="outline" size="sm" onClick={downloadLogins}>
                                    <Download /> List download (CSV)
                                </Button>
                            </div>
                            <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                                Ye password sirf abhi dikh rahe hain - list download karke rakh lijiye. Parents app ke "Password bhool gaye" se OTP ke zariye khud bhi password bana sakte hain.
                            </p>
                            <TableWrap className="max-h-[35vh] overflow-auto">
                                <Table>
                                    <THead>
                                        <TR>
                                            <TH>Parent</TH>
                                            <TH>Login</TH>
                                            <TH>Password</TH>
                                            <TH>Bachche</TH>
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {result.credentials.slice(0, SHOW_MAX).map((c) => (
                                            <TR key={c.email}>
                                                <TD>
                                                    <p className="text-sm text-foreground">{c.name}</p>
                                                    <p className="font-mono text-xs text-muted-foreground">{c.phone}</p>
                                                </TD>
                                                <TD className="font-mono text-xs text-foreground">{c.email}</TD>
                                                <TD className="font-mono text-sm text-foreground">{c.password}</TD>
                                                <TD className="text-xs text-muted-foreground">{c.students}</TD>
                                            </TR>
                                        ))}
                                    </TBody>
                                </Table>
                            </TableWrap>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </Modal>
    );
}
