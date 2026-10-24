import React from 'react';
import '../auth.css';

interface EstadoAuthProps {
  icono: React.ReactNode;
  titulo: string;
  tono?: 'neutral' | 'exito' | 'peligro';
  children?: React.ReactNode;
}

/** Pantalla de un solo mensaje: Revisá tu correo, verificación y vuelta de Google. */
export const EstadoAuth: React.FC<EstadoAuthProps> = ({
  icono,
  titulo,
  tono = 'neutral',
  children,
}) => (
  <div className={`auth auth-estado card auth-estado-${tono}`}>
    <div className="auth-estado-icono">{icono}</div>
    <h1 className="auth-estado-titulo">{titulo}</h1>
    {children}
  </div>
);
