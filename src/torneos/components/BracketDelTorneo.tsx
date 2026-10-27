import React, { useEffect, useState } from 'react';
import { BracketTorneo, torneoApi } from '../../api/torneoApi';
import { Bracket } from './Bracket';

/**
 * El bracket en la ficha pública (PICA-217), para los participantes y cualquiera con el enlace. Hasta que se sortea
 * no muestra nada; si no se puede cargar, tampoco: el resto de la ficha sigue sirviendo.
 */
export const BracketDelTorneo: React.FC<{ torneoId: number }> = ({ torneoId }) => {
  const [bracket, setBracket] = useState<BracketTorneo | null>(null);

  useEffect(() => {
    let vigente = true;
    torneoApi
      .bracket(torneoId)
      .then((b) => vigente && setBracket(b))
      .catch(() => vigente && setBracket(null));
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  if (!bracket || bracket.rondas.length === 0) return null;

  return (
    <div className="torneo-block-card torneo-detalle-bracket">
      <div className="torneo-block-title">
        <span>🏆</span>
        <span>Bracket</span>
      </div>
      <Bracket bracket={bracket} />
    </div>
  );
};
