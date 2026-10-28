import React, { useCallback, useEffect, useState } from 'react';
import { BracketTorneo, torneoApi } from '../../api/torneoApi';
import { useTorneoRealtime } from '../../realtime/useTorneoRealtime';
import { IconoTrofeo } from '../../shared/ui/Iconos';
import { Bracket } from './Bracket';

/**
 * El bracket en la ficha pública (PICA-217), para los participantes y cualquiera con el enlace.
 * Suscripto a `/topic/torneos/{id}` para reflejar avances y confirmaciones de resultados en tiempo real
 * sin recargar la página. Al reconectarse recarga el estado desde el servidor.
 */
export const BracketDelTorneo: React.FC<{ torneoId: number }> = ({ torneoId }) => {
  const [bracket, setBracket] = useState<BracketTorneo | null>(null);

  const cargarBracket = useCallback(() => {
    let vigente = true;
    torneoApi
      .bracket(torneoId)
      .then((b) => {
        if (vigente) setBracket(b);
      })
      .catch(() => {
        if (vigente) setBracket(null);
      });
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  useEffect(() => {
    return cargarBracket();
  }, [cargarBracket]);

  useTorneoRealtime(torneoId, {
    onBracketChange: (nuevoBracket) => {
      setBracket(nuevoBracket);
    },
    onActualizar: (data) => {
      if (data.bracket) {
        setBracket(data.bracket);
      } else if (data.rondas) {
        setBracket(data as unknown as BracketTorneo);
      } else {
        cargarBracket();
      }
    },
    onReconnect: () => {
      cargarBracket();
    },
  });

  if (!bracket || bracket.rondas.length === 0) return null;

  return (
    <div className="torneo-block-card torneo-detalle-bracket">
      <div
        className="torneo-block-title"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <IconoTrofeo size={20} />
        <span>Bracket</span>
      </div>
      <Bracket bracket={bracket} />
    </div>
  );
};
