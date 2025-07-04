import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    // Check if authenticated and if the user object has the is_admin flag
    return isAuthenticated && user?.is_admin ? <Outlet /> : <Navigate to="/" />;
};

export default AdminRoute;