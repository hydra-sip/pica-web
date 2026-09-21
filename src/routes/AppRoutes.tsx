import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '../shared/layouts/PublicLayout';
import { HomePage } from '../shared/pages/HomePage';
import { LoginPage } from '../auth/pages/LoginPage';
import { RegisterPage } from '../auth/pages/RegisterPage';
import { CheckEmailPage } from '../auth/pages/CheckEmailPage';
import { VerifyEmailPage } from '../auth/pages/VerifyEmailPage';
import { OAuthCallbackPage } from '../auth/pages/OAuthCallbackPage';
import { ProfilePage } from '../auth/pages/ProfilePage';
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
        <Route path="auth/check-email" element={<CheckEmailPage />} />
        <Route path="verificar" element={<VerifyEmailPage />} />
        <Route path="oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        {/* Rutas Protegidas que requieren Autenticación */}
        <Route element={<RequireAuth />}>
          <Route path="mi-perfil" element={<ProfilePage />} />

          {/* Sub-protección para Rol ADMIN */}
          <Route element={<RequirePermiso roles="ADMIN" />}>
            <Route path="admin" element={<AdminDashboardPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
