import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleName } from '../types';

interface RequirePermisoProps {
  permisos?: string | string[];
  roles?: RoleName | RoleName[];
  children?: React.ReactNode;
}

export const RequirePermiso: React.FC<RequirePermisoProps> = ({ permisos, roles, children }) => {
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Validando permisos de acceso...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const hasPerm = permisos ? hasPermission(permisos) : true;
  const hasR = roles ? hasRole(roles) : true;

  if (!hasPerm && !hasR) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
