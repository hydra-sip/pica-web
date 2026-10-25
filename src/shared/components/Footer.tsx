import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <div className="hydra-logo-badge" style={{ width: '22px', height: '22px', fontSize: '0.75rem', borderRadius: '5px' }}>
              H
            </div>
            <h4 className="footer-brand" style={{ margin: 0 }}>HYDRA</h4>
          </div>
          <p className="footer-desc">
            Plataforma Integral de Torneos, Rifas y Gestión Operativa Deportiva.
          </p>
        </div>
        <div className="footer-meta">
          <span className="badge">Sistema Hydra v1.0 • SHA-256 OK</span>
          <p className="copyright">
            &copy; {new Date().getFullYear()} Hydra Platforms. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
