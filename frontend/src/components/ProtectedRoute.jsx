import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ children, permissions, platform }) {
    const { isAuthenticated, loading, can, isPlatform } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Platform-only route par school user na aa jaye
    if (platform && !isPlatform) return <Navigate to="/" replace />;

    if (permissions && !can(...permissions)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
