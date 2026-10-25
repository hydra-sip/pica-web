import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import './BottomNav.css';

export const BottomNav: React.FC = () => {
  const { isAuthenticated, hasPermission } = useAuth();
  const veBackoffice = hasPermission(['USUARIO_VER', 'ROL_VER', 'PERSONA_VER']);

  return (
    <nav className="hydra-bottom-nav" aria-label="Navegación inferior móvil">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `hydra-bottom-item ${isActive ? 'active' : ''}`}
      >
        <svg className="hydra-bottom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="hydra-bottom-text">Explorar</span>
      </NavLink>

      <NavLink
        to="/mis-rifas"
        className={({ isActive }) => `hydra-bottom-item ${isActive ? 'active' : ''}`}
      >
        <svg className="hydra-bottom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
        <span className="hydra-bottom-text">Rifas</span>
      </NavLink>

      <NavLink
        to={veBackoffice ? '/admin' : '/billetera'}
        className={({ isActive }) => `hydra-bottom-item ${isActive ? 'active' : ''}`}
      >
        <svg className="hydra-bottom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <circle cx="17" cy="15" r="1.5" />
        </svg>
        <span className="hydra-bottom-text">{veBackoffice ? 'Admin' : 'Billetera'}</span>
      </NavLink>

      <NavLink
        to={isAuthenticated ? '/mi-perfil' : '/auth/login'}
        className={({ isActive }) => `hydra-bottom-item ${isActive ? 'active' : ''}`}
      >
        <svg className="hydra-bottom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="hydra-bottom-text">Perfil</span>
      </NavLink>
    </nav>
  );
};
