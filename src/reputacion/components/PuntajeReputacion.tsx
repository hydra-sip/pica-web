import React from 'react';
import { Reputacion } from '../../api/calificacionApi';
import '../reputacion.css';

interface PuntajeReputacionProps {
  reputacion: Reputacion;
}

/**
 * HU-805: el puntaje de reputación junto al índice de fair play, sin mezclarlos: el promedio de las calificaciones de
 * los organizadores y cuántas son.
 */
export const PuntajeReputacion: React.FC<PuntajeReputacionProps> = ({ reputacion }) =>
  reputacion.promedio === null ? (
    <span className="torneos-celda-secundaria">Sin calificaciones</span>
  ) : (
    <span className="reputacion-puntaje">
      <strong>{reputacion.promedio.toFixed(1)} / 5 ★</strong>
      <span className="torneos-celda-secundaria">
        {reputacion.cantidad === 1 ? '1 calificación' : `${reputacion.cantidad} calificaciones`}
      </span>
    </span>
  );
