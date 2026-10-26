import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '../shared/layouts/PublicLayout';
import { AdminLayout } from '../admin/layouts/AdminLayout';
import { HomePage } from '../shared/pages/HomePage';
import { LoginPage } from '../auth/pages/LoginPage';
import { RegisterPage } from '../auth/pages/RegisterPage';
import { CheckEmailPage } from '../auth/pages/CheckEmailPage';
import { VerifyEmailPage } from '../auth/pages/VerifyEmailPage';
import { OAuthCallbackPage } from '../auth/pages/OAuthCallbackPage';
import { ProfilePage } from '../auth/pages/ProfilePage';
import { AdminDashboardPage } from '../admin/pages/AdminDashboardPage';
import { UsuariosPage } from '../admin/pages/UsuariosPage';
import { RolesPage } from '../admin/pages/RolesPage';
import { PersonasPage } from '../admin/pages/PersonasPage';
import { NotFoundPage } from '../shared/pages/NotFoundPage';
import { UnauthorizedPage } from '../shared/pages/UnauthorizedPage';
import { RequireAuth } from '../auth/components/RequireAuth';
import { RequirePermiso } from '../auth/components/RequirePermiso';
import { MisRifasPage } from '../rifas/pages/MisRifasPage';
import { RifaFormPage } from '../rifas/pages/RifaFormPage';
import { TorneosCatalogoPage } from '../torneos/pages/TorneosCatalogoPage';
import { TorneoDetallePage } from '../torneos/pages/TorneoDetallePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Layout Principal de la Plataforma */}
      <Route path="/" element={<PublicLayout />}>
        {/* Rutas de autenticación y verificación (libres para ingresar o registrarse) */}
        <Route path="auth/login" element={<LoginPage />} />
        <Route path="auth/register" element={<RegisterPage />} />
        <Route path="auth/check-email" element={<CheckEmailPage />} />
        <Route path="verificar" element={<VerifyEmailPage />} />
        <Route path="oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        {/* Rutas Públicas (HU-208: Catálogo y detalle público sin iniciar sesión) */}
        <Route index element={<HomePage />} />
        <Route path="torneos" element={<TorneosCatalogoPage />} />
        <Route path="torneos/:slug" element={<TorneoDetallePage />} />

        {/* Rutas que requieren autenticación */}
        <Route element={<RequireAuth />}>
          <Route path="mi-perfil" element={<ProfilePage />} />

          {/* Rifas del organizador (PICA-227 / Hydra): RIFA_GESTIONAR */}
          <Route element={<RequirePermiso permisos="RIFA_GESTIONAR" />}>
            <Route path="mis-rifas" element={<MisRifasPage />} />
            <Route path="rifas/nueva" element={<RifaFormPage />} />
            <Route path="rifas/:id/editar" element={<RifaFormPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Layout de Administración Protegido (Backoffice Hydra) */}
      <Route element={<RequireAuth />}>
        <Route
          element={
            <RequirePermiso permisos={['USUARIO_VER', 'ROL_VER', 'PERSONA_VER']}>
              <AdminLayout />
            </RequirePermiso>
          }
        >
          <Route path="/admin">
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
      </Route>
    </Routes>
  );
};
