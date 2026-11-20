import React from 'react';
import { Notificacion } from '../api/notificacionApi';
import { IconoAlerta, IconoBilletera, IconoEscudoCheck, IconoReloj, IconoTrofeo } from '../shared/ui/Iconos';

/** "Hace 5 min", "Hace 3 horas", "Ayer"... como en el wireframe del centro de notificaciones. */
export const hace = (fecha: string, ahora: Date = new Date()): string => {
  const minutos = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 60000);
  if (minutos < 1) return 'Recién';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? 'Hace 1 hora' : `Hace ${horas} horas`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return new Date(fecha).toLocaleDateString('es-AR');
};

/** Lo que pasa al tocarla, para el pie de la tarjeta. */
export const accion = (notificacion: Notificacion): string => {
  switch (notificacion.tipo) {
    case 'CHECKIN_ABIERTO':
      return 'Toca para confirmar presencia';
    case 'RIVAL_ASIGNADO':
    case 'CRUCE_INICIADO':
      return 'Ver detalles del cruce';
    case 'RECLAMO_RESUELTO':
      return notificacion.enlace === '/billetera' ? 'Ver saldo en Billetera' : 'Ver la rifa';
  }
};

export const IconoNotificacion: React.FC<{ notificacion: Notificacion }> = ({ notificacion }) => {
  switch (notificacion.tipo) {
    case 'CHECKIN_ABIERTO':
      return <IconoReloj size={16} />;
    case 'RIVAL_ASIGNADO':
      return <IconoTrofeo size={16} />;
    case 'CRUCE_INICIADO':
      return <IconoEscudoCheck size={16} />;
    case 'RECLAMO_RESUELTO':
      return notificacion.enlace === '/billetera' ? <IconoBilletera size={16} /> : <IconoAlerta size={16} />;
  }
};
