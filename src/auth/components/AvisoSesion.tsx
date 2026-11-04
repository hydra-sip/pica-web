import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../shared/ui';
import './AvisoSesion.css';

/** Lo que pasó con la sesión en otra pestaña (CE4-6), arriba de todo y hasta que se cierra. */
export const AvisoSesion: React.FC = () => {
  const { avisoSesion, descartarAvisoSesion } = useAuth();
  if (!avisoSesion) return null;
  return (
    <div className="alerta alerta-info aviso-sesion" role="status">
      <span>{avisoSesion}</span>
      <Button variant="ghost" size="sm" onClick={descartarAvisoSesion}>
        Entendido
      </Button>
    </div>
  );
};
