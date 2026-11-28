import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EVENTO_NOTIFICACIONES_LEIDAS, Notificacion, notificacionApi } from '../../api/notificacionApi';
import { IconoCruz } from '../../shared/ui/Iconos';
import { IconoNotificacion } from '../formato';
import '../notificaciones.css';

const DURACION_MS = 6000;

interface ToastNotificacionProps {
  notificacion: Notificacion;
  onCerrar: () => void;
}

/** El aviso de una notificación que acaba de llegar (HU-808): se va solo; al tocarlo, la marca leída y lleva al enlace. */
export const ToastNotificacion: React.FC<ToastNotificacionProps> = ({ notificacion, onCerrar }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const temporizador = window.setTimeout(onCerrar, DURACION_MS);
    return () => window.clearTimeout(temporizador);
  }, [notificacion, onCerrar]);

  const abrir = () => {
    onCerrar();
    notificacionApi
      .marcarLeida(notificacion.id)
      .then(() => window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES_LEIDAS)))
      .catch(() => {
        // Si no se pudo marcar, queda sin leer en el centro: no corta la navegación.
      });
    if (notificacion.enlace) navigate(notificacion.enlace);
  };

  return (
    <div className="notificacion-toast" role="status" aria-label="Nueva notificación">
      <button type="button" className="notificacion-toast-cuerpo" onClick={abrir}>
        <span className="notificacion-icono" aria-hidden="true">
          <IconoNotificacion notificacion={notificacion} />
        </span>
        <span>
          <strong>{notificacion.titulo}</strong>
          <span className="notificacion-texto">{notificacion.cuerpo}</span>
        </span>
      </button>
      <button type="button" className="notificacion-toast-cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
        <IconoCruz />
      </button>
    </div>
  );
};
