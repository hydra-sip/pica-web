import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { IconoPerfil } from '../ui/Iconos';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout, hasPermission } = useAuth();
  // Mismo criterio que el guard de /admin (RF-008)
  const veBackoffice = hasPermission(['USUARIO_VER', 'ROL_VER', 'PERSONA_VER']);
  const veRifas = hasPermission('RIFA_GESTIONAR');

  const toggleMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMenu();
    await logout();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu} aria-label="PICA - Inicio">
          <div className="logo-icon-pica">P</div>
          <div className="logo-info">
            <span className="logo-text-pica">PICA</span>
            <span className="logo-subtext-pica">Plataforma Integral de Competencia Amateur</span>
          </div>
        </Link>

        {/* Mobile Hamburger Toggle */}
        <button
          className="mobile-toggle-btn"
          onClick={toggleMenu}
          aria-label="Abrir menú de navegación"
          aria-expanded={isMobileMenuOpen}
        >
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
        </button>

        {/* Navigation Links */}
        <nav className={`navbar-nav ${isMobileMenuOpen ? 'nav-open' : ''}`}>
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Torneos
          </Link>

          {isAuthenticated && veRifas && (
            <Link
              to="/mis-rifas"
              className={`nav-link ${isActive('/mis-rifas') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Mis Rifas
            </Link>
          )}

          {veBackoffice && (
            <Link
              to="/admin"
              className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Backoffice
            </Link>
          )}

          {isAuthenticated && (
            <Link
              to="/mi-perfil"
              className={`nav-link ${isActive('/mi-perfil') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Mi Perfil
            </Link>
          )}

          <div className="nav-actions">
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link to="/mi-perfil" onClick={closeMenu} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconoPerfil size={16} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {user.name}{' '}
                    <strong
                      style={{
                        color: 'var(--brand-black)',
                        fontSize: '0.75rem',
                        border: '1px solid var(--border-color)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-subtle)',
                      }}
                    >
                      {user.roles?.[0]?.nombreAmigable || user.roles?.[0]?.nombre || user.role || 'Usuario'}
                    </strong>
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className={`btn btn-secondary ${isActive('/auth/login') ? 'active' : ''}`}
                  onClick={closeMenu}
                  style={{ minHeight: '40px' }}
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/auth/register"
                  className="btn btn-primary"
                  onClick={closeMenu}
                  style={{ minHeight: '40px' }}
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
