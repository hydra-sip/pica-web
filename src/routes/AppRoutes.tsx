import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '../shared/layouts/PublicLayout';
import { HomePage } from '../shared/pages/HomePage';
import { LoginPage } from '../auth/pages/LoginPage';
import { RegisterPage } from '../auth/pages/RegisterPage';
import { AdminDashboardPage } from '../admin/pages/AdminDashboardPage';
import { NotFoundPage } from '../shared/pages/NotFoundPage';
import { UnauthorizedPage } from '../shared/pages/UnauthorizedPage';
import { RequireAuth } from '../auth/components/RequireAuth';
import { RequirePermiso } from '../auth/components/RequirePermiso';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        {/* Rutas Públicas */}
        <Route index element={<HomePage />} />
        <Route path="auth/login" element={<LoginPage />} />
        <Route path="auth/register" element={<RegisterPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        {/* Rutas Protegidas que requieren Autenticación y Rol ADMIN */}
        <Route element={<RequireAuth />}>
          <Route element={<RequirePermiso roles="ADMIN" />}>
            <Route path="admin" element={<AdminDashboardPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
