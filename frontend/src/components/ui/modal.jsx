import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }) {
    const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-950/50 backdrop-blur-sm" />
                <Dialog.Content
                    className={cn(
                        'fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
                        'rounded-xl border border-border bg-card shadow-2xl',
                        widths[size]
                    )}
                >
                    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                        <div className="space-y-1">
                            <Dialog.Title className="text-base font-semibold text-foreground">
                                {title}
                            </Dialog.Title>
                            {description ? (
                                <Dialog.Description className="text-sm text-muted-foreground">
                                    {description}
                                </Dialog.Description>
                            ) : null}
                        </div>
                        <Dialog.Close asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Close">
                                <X />
                            </Button>
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

                    {footer ? (
                        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                            {footer}
                        </div>
                    ) : null}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export function ConfirmDialog({ open, onOpenChange, title, message, onConfirm, loading }) {
    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title={title || 'Pakka delete karna hai?'}
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </>
            }
        >
            <p className="text-sm text-muted-foreground">
                {message || 'Ye action wapas nahi ho sakta.'}
            </p>
        </Modal>
    );
}
