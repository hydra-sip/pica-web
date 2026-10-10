import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-info">
          <h4 className="footer-brand">PICA Web</h4>
          <p className="footer-desc">
            Plataforma Integrada de Control y Administración (SIP - Universidad Nacional de Luján).
          </p>
        </div>
        <div className="footer-meta">
          <span className="badge">RF-007 Public Layout</span>
          <p className="copyright">
            &copy; {new Date().getFullYear()} PICA Project. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
