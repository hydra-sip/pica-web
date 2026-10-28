import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../shared/layouts/AppLayout';
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
import { MisTorneosPage } from '../torneos/pages/MisTorneosPage';
import { TorneoFormPage } from '../torneos/pages/TorneoFormPage';
import { TorneoPublicadoPage } from '../torneos/pages/TorneoPublicadoPage';
import { TorneoConsolaPage } from '../torneos/pages/TorneoConsolaPage';
import { TorneosCatalogoPage } from '../torneos/pages/TorneosCatalogoPage';
import { TorneoDetallePage } from '../torneos/pages/TorneoDetallePage';
import { InscripcionEntradaPage } from '../inscripciones/pages/InscripcionEntradaPage';
import { InscripcionNominaPage } from '../inscripciones/pages/InscripcionNominaPage';
import { MiInscripcionPage } from '../inscripciones/pages/MiInscripcionPage';
import { InscripcionPagoPage } from '../inscripciones/pages/InscripcionPagoPage';
import { PartidoPage } from '../partidos/pages/PartidoPage';
import { ObjecionesTorneoPage } from '../partidos/pages/ObjecionesTorneoPage';
import { PronosticosPage } from '../pronosticos/pages/PronosticosPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Sitio: sidebar en escritorio, barra inferior en el celular */}
      <Route path="/" element={<AppLayout seccion="sitio" />}>
        <Route index element={<HomePage />} />
        <Route path="torneos" element={<TorneosCatalogoPage />} />
        <Route path="torneos/:slug" element={<TorneoDetallePage />} />
        {/* HU-306 / T306-2: Pronósticos y ranking */}
        <Route path="pronosticos" element={<PronosticosPage />} />
        <Route path="auth/login" element={<LoginPage />} />
        <Route path="auth/register" element={<RegisterPage />} />
        <Route path="auth/check-email" element={<CheckEmailPage />} />
        <Route path="verificar" element={<VerifyEmailPage />} />
        <Route path="oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        {/* Rutas Autenticadas Públicas / Perfil */}
        <Route element={<RequireAuth />}>
          <Route path="mi-perfil" element={<ProfilePage />} />

          {/* Cargar y aceptar el resultado (PICA-243): lo decide el back según el lado del que es capitán */}
          <Route path="partidos/:id" element={<PartidoPage />} />

          {/* Objeciones del torneo (PICA-247): el organizador o un árbitro con permiso; si no, el back responde 403 */}
          <Route path="torneos/:id/objeciones" element={<ObjecionesTorneoPage />} />

          {/* Torneos del organizador (PICA-202, PICA-205): TORNEO_GESTIONAR lo tienen ORGANIZADOR y ADMINISTRADOR */}
          <Route element={<RequirePermiso permisos="TORNEO_GESTIONAR" />}>
            <Route path="mis-torneos" element={<MisTorneosPage />} />
            <Route path="torneos/nuevo" element={<TorneoFormPage />} />
            <Route path="torneos/:id/editar" element={<TorneoFormPage />} />
            <Route path="torneos/:id/publicado" element={<TorneoPublicadoPage />} />
            <Route path="torneos/:id/consola" element={<TorneoConsolaPage />} />
          </Route>

          {/* Rifas del organizador (PICA-227): RIFA_GESTIONAR lo tienen ORGANIZADOR y ADMINISTRADOR */}
          <Route element={<RequirePermiso permisos="RIFA_GESTIONAR" />}>
            <Route path="mis-rifas" element={<MisRifasPage />} />
            <Route path="rifas/nueva" element={<RifaFormPage />} />
            <Route path="rifas/:id/editar" element={<RifaFormPage />} />
          </Route>

          {/* Inscripción en dos pasos (PICA-211): INSCRIPCION_GESTIONAR lo tiene PARTICIPANTE */}
          <Route element={<RequirePermiso permisos="INSCRIPCION_GESTIONAR" />}>
            <Route path="torneos/:slug/inscripcion" element={<InscripcionEntradaPage />} />
            <Route path="inscripciones/:id" element={<MiInscripcionPage />} />
            <Route path="inscripciones/:id/nomina" element={<InscripcionNominaPage />} />
            <Route path="inscripciones/:id/pago" element={<InscripcionPagoPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Layout de Administración Protegido (HU-107 Backoffice Protection) */}
      <Route element={<RequireAuth />}>
        <Route
          element={
            <RequirePermiso permisos={['USUARIO_VER', 'ROL_VER', 'PERSONA_VER']}>
              <AppLayout seccion="admin" />
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
