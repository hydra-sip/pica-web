import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { torneoApi } from '../../api/torneoApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { AvisoDeNavegacion } from '../components/AvisoDeNavegacion';
import { ScrollAlInicio } from '../components/ScrollAlInicio';
import { Footer } from '../components/Footer';
import { IncompleteProfileBanner } from '../components/IncompleteProfileBanner';
import { IconoCampana, IconoSalir, IconoSitio } from '../ui/Iconos';
import { LogoPica } from '../ui/LogoPica';
import { ItemNavegacion, NAVEGACION, Seccion } from './navegacion';
import './AppLayout.css';

const MAX_ITEMS_CELULAR = 5;

interface AppLayoutProps {
  seccion: Seccion;
}

/**
 * Layout de toda la app, como en el Figma: sidebar de 240 px en escritorio y barra inferior en el
 * celular (desde 768 px cambia). Los ítems salen de NAVEGACION según la sesión y los permisos.
 */
/**
 * Cuántas designaciones de árbitro tiene el usuario y cuántas esperan respuesta (HU-807): es el aviso en la
 * plataforma. Se vuelve a pedir al cambiar de pantalla, así el número baja después de responder.
 */
const useDesignaciones = (conSesion: boolean, pathname: string) => {
  const [cuenta, setCuenta] = useState({ total: 0, pendientes: 0 });
  useEffect(() => {
    if (!conSesion) {
      setCuenta({ total: 0, pendientes: 0 });
      return;
    }
    let vigente = true;
    torneoApi
      .misDesignaciones()
      .then((d) => {
        if (!vigente) return;
        setCuenta({ total: d.length, pendientes: d.filter((x) => x.estado === 'PENDIENTE').length });
      })
      .catch(() => {
        // Sin el número el menú sigue andando: no hace falta avisar.
      });
    return () => {
      vigente = false;
    };
  }, [conSesion, pathname]);
  return cuenta;
};

export const AppLayout: React.FC<AppLayoutProps> = ({ seccion }) => {
  const { user, isAuthenticated, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const designaciones = useDesignaciones(isAuthenticated, pathname);

  const visible = (item: ItemNavegacion) =>
    (!item.soloConSesion || isAuthenticated) &&
    (!item.soloSinSesion || !isAuthenticated) &&
    (!item.soloConDesignaciones || designaciones.total > 0) &&
    (!item.permisos || hasPermission(item.permisos));
  const items = NAVEGACION[seccion].filter(visible);

  const salir = async () => {
    await logout();
    navigate('/auth/login');
  };

  const rol = user?.roles?.[0]?.nombreAmigable || user?.roles?.[0]?.nombre || user?.role;
  const nombre = user?.name || user?.username || '';
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const enlace = (item: ItemNavegacion, clase: string) => (
    <NavLink key={item.ruta} to={item.ruta} end={item.exacta} className={({ isActive }) => `${clase}${isActive ? ' activo' : ''}`}>
      {item.icono}
      <span>{item.texto}</span>
      {item.soloConDesignaciones && designaciones.pendientes > 0 && (
        <span className="app-contador" aria-label={`${designaciones.pendientes} sin responder`}>
          {designaciones.pendientes}
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="app">
      <ScrollAlInicio />
      <aside className="app-sidebar">
        <Link to="/" className="app-logo">
          <LogoPica className="app-logo-icono" />
          <span className="app-logo-texto">PICA</span>
          {seccion === 'admin' && <span className="app-logo-seccion">Backoffice</span>}
        </Link>

        <nav aria-label="Navegación principal" className="app-sidebar-nav">
          {items.map((item) => enlace(item, 'app-sidebar-item'))}
          {seccion === 'admin' && (
            <Link to="/" className="app-sidebar-item">
              <IconoSitio />
              <span>Volver al sitio</span>
            </Link>
          )}
        </nav>

        {isAuthenticated && user && (
          <div className="app-usuario">
            <span className="app-avatar" aria-hidden="true">
              {iniciales || '?'}
            </span>
            <span className="app-usuario-datos">
              <strong>{nombre}</strong>
              {rol && <small>{rol}</small>}
            </span>
            <button type="button" className="app-salir" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
              <IconoSalir />
            </button>
          </div>
        )}
      </aside>

      <div className="app-cuerpo">
        <header className="app-barra-celular">
          <Link to="/" className="app-logo">
            <LogoPica className="app-logo-icono" />
            <span className="app-logo-texto">PICA</span>
          </Link>
          <span style={{ display: 'flex', gap: 'var(--space-1)' }}>
            {seccion === 'admin' && (
              <Link to="/" className="app-boton-icono" aria-label="Volver al sitio" title="Volver al sitio">
                <IconoSitio />
              </Link>
            )}
            {designaciones.total > 0 && (
              // En el celular la barra de abajo no llega a "Designaciones": el aviso va en la campana (wireframe 48)
              <Link
                to="/mis-designaciones"
                className="app-boton-icono app-campana"
                aria-label={`Designaciones: ${designaciones.pendientes} sin responder`}
                title="Designaciones"
              >
                <IconoCampana />
                {designaciones.pendientes > 0 && <span className="app-contador">{designaciones.pendientes}</span>}
              </Link>
            )}
            {isAuthenticated && (
              <button type="button" className="app-boton-icono" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
                <IconoSalir />
              </button>
            )}
          </span>
        </header>

        <IncompleteProfileBanner />

        <main className={`app-contenido app-contenido-${seccion}`}>
          <AvisoDeNavegacion />
          <Outlet />
        </main>
        {seccion === 'sitio' && <Footer />}
      </div>

      <nav aria-label="Navegación principal" className="app-barra-inferior">
        {items.slice(0, MAX_ITEMS_CELULAR).map((item) => enlace(item, 'app-barra-item'))}
      </nav>
    </div>
  );
};
