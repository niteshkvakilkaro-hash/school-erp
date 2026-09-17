import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-5 text-center">
            <p className="text-6xl font-semibold text-primary">404</p>
            <h1 className="text-xl font-semibold text-foreground">Page nahi mila</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
                Jo link aap khol rahe hain wo exist nahi karta ya hata diya gaya hai.
            </p>
            <Button asChild>
                <Link to="/">Dashboard par wapas</Link>
            </Button>
        </div>
    );
}
