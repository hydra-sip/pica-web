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
import { AdminLayout } from '../admin/layouts/AdminLayout';
import { AdminDashboardPage } from '../admin/pages/AdminDashboardPage';
import { UsuariosPage } from '../admin/pages/UsuariosPage';
import { RolesPage } from '../admin/pages/RolesPage';
import { PersonasPage } from '../admin/pages/PersonasPage';
import { NotFoundPage } from '../shared/pages/NotFoundPage';
import { UnauthorizedPage } from '../shared/pages/UnauthorizedPage';
import { RequireAuth } from '../auth/components/RequireAuth';
import { RequirePermiso } from '../auth/components/RequirePermiso';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Layout Público con Navbar / Footer */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="auth/login" element={<LoginPage />} />
        <Route path="auth/register" element={<RegisterPage />} />
        <Route path="auth/check-email" element={<CheckEmailPage />} />
        <Route path="verificar" element={<VerifyEmailPage />} />
        <Route path="oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        {/* Rutas Autenticadas Públicas / Perfil */}
        <Route element={<RequireAuth />}>
          <Route path="mi-perfil" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Layout de Administración Protegido (AdminLayout) */}
      <Route element={<RequireAuth />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          
          <Route
            path="usuarios"
            element={
              <RequirePermiso permisos="USUARIO_VER">
                <UsuariosPage />
              </RequirePermiso>
            }
          />
          <Route
            path="roles"
            element={
              <RequirePermiso permisos="ROL_VER">
                <RolesPage />
              </RequirePermiso>
            }
          />
          <Route
            path="personas"
            element={
              <RequirePermiso permisos="PERSONA_VER">
                <PersonasPage />
              </RequirePermiso>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
};
