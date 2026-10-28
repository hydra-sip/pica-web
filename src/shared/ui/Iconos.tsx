import React from 'react';

interface IconoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const Icono: React.FC<IconoProps> = ({ size = 20, className = '', style, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);

export const IconoExplorar: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icono>
);

export const IconoBuscar: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icono>
);

export const IconoCampana: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icono>
);

export const IconoPerfil: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </Icono>
);

export const IconoBackoffice: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z" />
  </Icono>
);

export const IconoEscudo: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icono>
);

export const IconoTrofeo: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 4h16v6a7 7 0 0 1-14 0V4z" />
    <path d="M12 17v4" />
    <path d="M8 21h8" />
  </Icono>
);

export const IconoMedalla: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="12" cy="8" r="6" />
    <path d="m15.4 12.8 2.6 8.2-6-3-6 3 2.6-8.2" />
  </Icono>
);

export const IconoIngresar: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 16l4-4-4-4" />
    <path d="M14 12H4" />
  </Icono>
);

export const IconoSalir: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M16 16l4-4-4-4" />
    <path d="M20 12H10" />
  </Icono>
);

export const IconoPanel: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </Icono>
);

export const IconoUsuarios: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
    <path d="M18 14.7c2 .6 3.5 2.3 3.5 5.3" />
  </Icono>
);

export const IconoRoles: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="8" cy="15" r="4" />
    <path d="m11 12 9-9" />
    <path d="m17 6 3 3" />
    <path d="m14 9 2 2" />
  </Icono>
);

export const IconoPersonas: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="2.5" />
    <path d="M5.5 17c.6-1.8 2-2.8 3.5-2.8s2.9 1 3.5 2.8" />
    <path d="M15 10h3" />
    <path d="M15 14h3" />
  </Icono>
);

export const IconoSitio: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M3 11 12 4l9 7" />
    <path d="M5 10v10h14V10" />
  </Icono>
);

export const IconoRifas: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z" />
    <path d="M14 5v2" />
    <path d="M14 11v2" />
    <path d="M14 17v2" />
  </Icono>
);

export const IconoTorneos: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3" />
    <path d="M17 6h3v1a3 3 0 0 1-3 3" />
  </Icono>
);

export const IconoBilletera: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <circle cx="17" cy="15" r="1.5" />
  </Icono>
);

export const IconoOjo: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icono>
);

export const IconoOjoTachado: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.5M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </Icono>
);

export const IconoCorreo: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icono>
);

export const IconoListo: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </Icono>
);

export const IconoAlerta: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
    <path d="M12 16.5v.5" />
  </Icono>
);

export const IconoEspera: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icono>
);

export const IconoCandado: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icono>
);

export const IconoDocumento: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </Icono>
);

export const IconoDescargar: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icono>
);

export const IconoRefrescar: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size,
  className,
  style,
}) => (
  <Icono size={size} className={className} style={style}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Icono>
);

export const IconoCalendario: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Icono>
);

export const IconoReloj: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6 12 12 16 14" />
  </Icono>
);

export const IconoConfiguracion: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icono>
);

export const IconoCheck: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size,
  className,
  style,
}) => (
  <Icono size={size} className={className} style={style}>
    <polyline points="20 6 9 17 4 12" />
  </Icono>
);

export const IconoCruz: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icono>
);

export const IconoFlechaIzquierda: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Icono>
);

export const IconoFlechaDerecha: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Icono>
);

export const IconoPuntos: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
    <circle cx="5" cy="12" r="1.5" />
  </Icono>
);

export const IconoCopiar: React.FC<{ size?: number }> = ({ size }) => (
  <Icono size={size}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icono>
);

export const IconoPronosticos: React.FC<{ size?: number; className?: string }> = ({
  size,
  className,
}) => (
  <Icono size={size} className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </Icono>
);

export const IconoPodio: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size,
  className,
  style,
}) => (
  <Icono size={size} className={className} style={style}>
    <path d="M4 19h16" />
    <path d="M4 19V11h4v8" />
    <path d="M8 19V7h8v12" />
    <path d="M16 19v-5h4v5" />
  </Icono>
);

export const IconoEscudoCheck: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size,
  className,
  style,
}) => (
  <Icono size={size} className={className} style={style}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </Icono>
);

export const IconoHash: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size,
  className,
  style,
}) => (
  <Icono size={size} className={className} style={style}>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </Icono>
);

export const IconoSimulacion: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size,
  className,
  style,
}) => (
  <Icono size={size} className={className} style={style}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </Icono>
);

