import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <div className="footer-logo-badge">
              P
            </div>
            <h4 className="footer-brand">PICA</h4>
          </div>
          <p className="footer-desc">
            Plataforma Integral de Competencia Amateur (PICA). Gestión de torneos deportivos, rifas y custodia de fondos.
          </p>
        </div>
        <div className="footer-meta">
          <span className="badge badge-info footer-badge">
            <span className="pulse-beacon" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-emerald)', display: 'inline-block', marginRight: '4px' }} />
            Sistema PICA v1.0 • SHA-256 Verificado
          </span>
          <p className="copyright">
            &copy; {new Date().getFullYear()} PICA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
