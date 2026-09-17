export function PageHeader({ title, subtitle, actions }) {
    return (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}
