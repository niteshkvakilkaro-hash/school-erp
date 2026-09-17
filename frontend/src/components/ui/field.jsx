import { Label } from './label';
import { Input, Select, Textarea } from './input';
import { cn } from '@/lib/utils';

/** Label + control + inline error - forms me ye pattern baar baar chahiye hota hai. */
export function Field({ label, name, error, required, hint, className, children }) {
    return (
        <div className={cn('space-y-1.5', className)}>
            {label ? (
                <Label htmlFor={name} required={required}>
                    {label}
                </Label>
            ) : null}
            {children}
            {error ? (
                <p className="text-xs text-destructive">{error}</p>
            ) : hint ? (
                <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}

export function TextField({ label, name, error, required, hint, className, ...props }) {
    return (
        <Field
            label={label}
            name={name}
            error={error}
            required={required}
            hint={hint}
            className={className}
        >
            <Input id={name} name={name} invalid={Boolean(error)} {...props} />
        </Field>
    );
}

export function SelectField({ label, name, error, required, hint, className, children, ...props }) {
    return (
        <Field
            label={label}
            name={name}
            error={error}
            required={required}
            hint={hint}
            className={className}
        >
            <Select id={name} name={name} invalid={Boolean(error)} {...props}>
                {children}
            </Select>
        </Field>
    );
}

export function TextareaField({ label, name, error, required, hint, className, ...props }) {
    return (
        <Field
            label={label}
            name={name}
            error={error}
            required={required}
            hint={hint}
            className={className}
        >
            <Textarea id={name} name={name} invalid={Boolean(error)} {...props} />
        </Field>
    );
}
