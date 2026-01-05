import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../../lib/store';

export const RequireAuth = () => {
    const { user, isLoading } = useStore();
    const location = useLocation();

    if (isLoading) {
        // Simple loading state while checking auth
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) {
        // Redirect to login page, saving the location they were trying to access
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};
