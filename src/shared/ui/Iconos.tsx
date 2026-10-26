import React from 'react';

// Íconos de trazo de 24 px para la navegación; heredan el color del texto
const Icono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const IconoExplorar = () => (
  <Icono>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icono>
);

export const IconoPerfil = () => (
  <Icono>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </Icono>
);

export const IconoBackoffice = () => (
  <Icono>
    <path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z" />
  </Icono>
);

export const IconoIngresar = () => (
  <Icono>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 16l4-4-4-4" />
    <path d="M14 12H4" />
  </Icono>
);

export const IconoSalir = () => (
  <Icono>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M16 16l4-4-4-4" />
    <path d="M20 12H10" />
  </Icono>
);

export const IconoPanel = () => (
  <Icono>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </Icono>
);

export const IconoUsuarios = () => (
  <Icono>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
    <path d="M18 14.7c2 .6 3.5 2.3 3.5 5.3" />
  </Icono>
);

export const IconoRoles = () => (
  <Icono>
    <circle cx="8" cy="15" r="4" />
    <path d="m11 12 9-9" />
    <path d="m17 6 3 3" />
    <path d="m14 9 2 2" />
  </Icono>
);

export const IconoPersonas = () => (
  <Icono>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="2.5" />
    <path d="M5.5 17c.6-1.8 2-2.8 3.5-2.8s2.9 1 3.5 2.8" />
    <path d="M15 10h3" />
    <path d="M15 14h3" />
  </Icono>
);

export const IconoSitio = () => (
  <Icono>
    <path d="M3 11 12 4l9 7" />
    <path d="M5 10v10h14V10" />
  </Icono>
);

// Ticket de rifa: borde con muesca a los costados y la línea punteada del troquel
export const IconoRifas = () => (
  <Icono>
    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z" />
    <path d="M14 5v2" />
    <path d="M14 11v2" />
    <path d="M14 17v2" />
  </Icono>
);

export const IconoTorneos = () => (
  <Icono>
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3" />
    <path d="M17 6h3v1a3 3 0 0 1-3 3" />
  </Icono>
);

export const IconoOjo = () => (
  <Icono>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icono>
);

export const IconoOjoTachado = () => (
  <Icono>
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.5M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </Icono>
);

export const IconoCorreo = () => (
  <Icono>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icono>
);

export const IconoListo = () => (
  <Icono>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </Icono>
);

export const IconoAlerta = () => (
  <Icono>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
    <path d="M12 16.5v.5" />
  </Icono>
);

export const IconoEspera = () => (
  <Icono>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icono>
);
