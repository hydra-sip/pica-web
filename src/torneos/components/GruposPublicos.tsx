import React, { useState } from 'react';
import { useTorneoRealtime } from '../../realtime/useTorneoRealtime';
import { GruposDelTorneo } from './GruposDelTorneo';

/**
 * La fase de grupos en la ficha pública (CR-02-8): las tablas con quiénes pasan y por qué, y los partidos. Se vuelve
 * a pedir con cada aviso del torneo por WebSocket (un resultado confirmado, la llave armada) y al reconectarse.
 */
export const GruposPublicos: React.FC<{ torneoId: number }> = ({ torneoId }) => {
  const [version, setVersion] = useState(0);
  const otraVez = () => setVersion((v) => v + 1);

  useTorneoRealtime(torneoId, {
    onActualizar: otraVez,
    onBracketChange: otraVez,
    onReconnect: otraVez,
  });

  return (
    <div className="torneo-block-card">
      <div className="torneos-tarjeta-titulo">
        <span className="torneo-block-title">Fase de grupos</span>
        <a
          href={`/verificacion?tipo=grupos&id=${torneoId}`}
          title="Recalcular el sorteo de los grupos en el portal público"
          data-testid="link-verificar-grupos"
        >
          Verificar sorteo de grupos
        </a>
      </div>
      <GruposDelTorneo torneoId={torneoId} version={version} />
    </div>
  );
};
