import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout, hasPermission } = useAuth();
  // Mismo criterio que el guard de /admin (RF-008)
  const veBackoffice = hasPermission(['USUARIO_VER', 'ROL_VER', 'PERSONA_VER']);

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
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <div className="logo-icon">P</div>
          <span className="logo-text">PICA <span className="logo-subtext">WEB</span></span>
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
            Inicio
          </Link>
          {veBackoffice && (
            <Link
              to="/admin"
              className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Administración
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Link to="/mi-perfil" onClick={closeMenu} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    👤 {user.name} <strong style={{ color: 'var(--accent-teal)', fontSize: '0.75rem', border: '1px solid var(--accent-teal)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{user.role}</strong>
                  </span>
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className={`btn btn-secondary ${isActive('/auth/login') ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/auth/register"
                  className="btn btn-primary"
                  onClick={closeMenu}
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
