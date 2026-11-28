import React from 'react';
import '../reputacion.css';

interface EstrellasProps {
  puntaje: number;
}

/** HU-805: el puntaje de una calificación, de 1 a 5, como en las valoraciones del perfil (★★★★☆). */
export const Estrellas: React.FC<EstrellasProps> = ({ puntaje }) => (
  <span className="reputacion-estrellas" aria-label={`${puntaje} de 5 estrellas`}>
    {'★'.repeat(puntaje)}
    <span className="reputacion-estrellas-vacias">{'☆'.repeat(5 - puntaje)}</span>
  </span>
);
