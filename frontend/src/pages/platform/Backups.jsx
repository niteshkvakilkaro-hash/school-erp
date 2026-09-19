import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DatabaseBackup, Download, Cloud, Mail, Lock, Clock3, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TableWrap, Table, THead, TBody, TR, TH, TD, EmptyRow, LoadingRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const size = (b) => (b == null ? '-' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB');
const when = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const ago = (d) => {
    const h = (Date.now() - new Date(d).getTime()) / 3600000;
    return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min pehle' : h < 48 ? Math.round(h) + ' ghante pehle' : Math.round(h / 24) + ' din pehle';
};

function Check({ ok, warn, icon: Icon, title, children }) {
    return (
        <div className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <span
                className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    ok ? 'bg-accent text-primary' : warn ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-muted text-muted-foreground'
                )}
            >
                <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground">{title}</p>
                <div className="text-muted-foreground">{children}</div>
            </div>
        </div>
    );
}

export default function Backups() {
    const [data, setData] = useState(null);
    const [starting, setStarting] = useState(false);

    const load = useCallback(() => {
        api.get('/platform/backups')
            .then(({ data: r }) => setData(r.data))
            .catch((err) => toast.error(err.message));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Chalte backup ke dauraan har 3 sec status
    useEffect(() => {
        if (!data?.running) return undefined;
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, [data?.running, load]);

    const start = async () => {
        setStarting(true);
        try {
            const { data: r } = await api.post('/platform/backups');
            toast.success(r.message);
            load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setStarting(false);
        }
    };

    const download = async (run) => {
        const id = toast.loading('Download ho raha hai...');
        try {
            const { data: blob } = await api.get('/platform/backups/' + run.id + '/download', { responseType: 'blob' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = run.fileName;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            toast.success('Download ho gaya', { id });
        } catch (err) {
            toast.error(err.message, { id });
        }
    };

    const c = data?.config;
    const last = data?.lastOk;
    const lastOld = last && Date.now() - new Date(last.createdAt).getTime() > 36 * 3600000;

    return (
        <div>
            <PageHeader
                title="Backups"
                subtitle="Roz database + photos + selfies ka encrypted backup"
                actions={
                    <Button onClick={start} disabled={starting || data?.running}>
                        {data?.running ? <Loader2 className="animate-spin" /> : <DatabaseBackup />}
                        {data?.running ? 'Backup chal raha hai...' : 'Abhi backup lijiye'}
                    </Button>
                }
            />

            {!data ? (
                <p className="py-16 text-center text-sm text-muted-foreground">Loading...</p>
            ) : (
                <div className="space-y-6">
                    <Card className={cn(lastOld || !last ? 'border-amber-300 dark:border-amber-500/40' : '')}>
                        <CardContent className="flex flex-wrap items-center gap-4 p-5">
                            {last && !lastOld ? <CheckCircle2 className="h-9 w-9 text-primary" /> : <AlertTriangle className="h-9 w-9 text-amber-600" />}
                            <div className="flex-1">
                                <p className="text-lg font-semibold text-foreground">{last ? 'Aakhri backup ' + ago(last.createdAt) : 'Abhi tak koi backup nahi'}</p>
                                <p className="text-sm text-muted-foreground">
                                    {last ? size(last.sizeBytes) + ' · ' + last.files + ' files · ' + (last.remoteStatus === 'uploaded' ? 'cloud par bhi' : 'sirf server par') : '"Abhi backup lijiye" dabaiye'}
                                    {data.schedule ? ' · roz ' + data.schedule.time + ' baje (' + data.schedule.tz + ')' : ' · roz wala backup band hai'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <Check ok={c.encryption === 'password'} warn={c.encryption !== 'password'} icon={Lock} title="Encryption">
                            {c.encryption === 'password' ? 'AES-256, BACKUP_PASSWORD se' : 'BACKUP_PASSWORD set nahi - abhi JWT secret se. Set karke kahin safe likh lijiye.'}
                        </Check>
                        <Check ok={Boolean(c.cloud)} warn={!c.cloud} icon={Cloud} title="Cloud copy">
                            {c.cloud ? c.bucket + ' @ ' + c.endpoint + ' (' + c.keepDays + ' din)' : 'Set nahi - server kharab hua to backup bhi jayega. .env me BACKUP_S3_* bhariye (Cloudflare R2).'}
                        </Check>
                        <Check ok={c.mail === 'smtp' && c.reportEmail} warn={c.mail !== 'smtp' || !c.reportEmail} icon={Mail} title="Report email">
                            {c.reportEmail || 'BACKUP_REPORT_EMAIL khaali'}
                            {c.mail !== 'smtp' ? ' - SMTP set nahi, mail abhi backups/outbox.log me' : ''}
                        </Check>
                        <Check ok icon={Clock3} title="Server par">
                            {c.keepDays} din ke backup (sabse naye 3 hamesha)
                        </Check>
                    </div>

                    <TableWrap>
                        <Table>
                            <THead>
                                <TR>
                                    <TH>Kab</TH>
                                    <TH>Kaise</TH>
                                    <TH>Size</TH>
                                    <TH>Status</TH>
                                    <TH>Cloud</TH>
                                    <TH className="text-right">File</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {!data.runs ? (
                                    <LoadingRow colSpan={6} />
                                ) : !data.runs.length ? (
                                    <EmptyRow colSpan={6}>Abhi koi backup nahi</EmptyRow>
                                ) : (
                                    data.runs.map((r) => (
                                        <TR key={r.id}>
                                            <TD className="whitespace-nowrap text-sm text-foreground">{when(r.createdAt)}</TD>
                                            <TD className="text-sm text-muted-foreground">{r.trigger === 'auto' ? 'Roz wala' : 'Haath se' + (r.startedBy ? ' (' + r.startedBy + ')' : '')}</TD>
                                            <TD className="text-sm text-foreground">{size(r.sizeBytes)}</TD>
                                            <TD>
                                                {r.status === 'running' ? (
                                                    <Badge variant="secondary">
                                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> chal raha
                                                    </Badge>
                                                ) : r.status === 'ok' ? (
                                                    <Badge variant="success">OK</Badge>
                                                ) : (
                                                    <span className="inline-flex max-w-xs items-start gap-1 text-xs text-destructive">
                                                        <XCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {r.error}
                                                    </span>
                                                )}
                                            </TD>
                                            <TD className="text-xs">
                                                {r.remoteStatus === 'uploaded' ? (
                                                    <Badge variant="success">Upload</Badge>
                                                ) : r.remoteStatus === 'failed' ? (
                                                    <span className="text-destructive" title={r.remoteError}>
                                                        Fail: {r.remoteError}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TD>
                                            <TD className="text-right">
                                                {r.downloadable ? (
                                                    <Button size="sm" variant="outline" onClick={() => download(r)} title={r.sha256}>
                                                        <Download /> Download
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">{r.status === 'ok' ? 'purana - hat gaya' : ''}</span>
                                                )}
                                            </TD>
                                        </TR>
                                    ))
                                )}
                            </TBody>
                        </Table>
                    </TableWrap>

                    <Card>
                        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">Backup wapas kaise laayein (server par)</p>
                            <p>
                                Pehle jaanch: <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">npm run backup:restore -- backups/&lt;file&gt;.erpscbk --db erpsc_check</code>
                            </p>
                            <p>
                                Asli restore (API band karke): <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">npm run backup:restore -- &lt;file&gt; --yes --files</code>
                            </p>
                            <p>File BACKUP_PASSWORD ke bina nahi khulti - password server ke bahar bhi kahin safe rakhiye.</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
