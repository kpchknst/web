import { Navigate, useLocation } from 'react-router-dom';

import Spinner from '../components/Spinner.jsx';
import useAuth from './useAuth.js';

export default function ProtectedRoute({ children, requireAdmin = false }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <Spinner label="Checking your session…" />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
}
