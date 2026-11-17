import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BracketTorneo, torneoApi } from '../../api/torneoApi';
import { useTorneoRealtime } from '../../realtime/useTorneoRealtime';
import { IconoEscudoCheck, IconoTrofeo } from '../../shared/ui/Iconos';
import { Bracket } from './Bracket';

/** Cuánto queda resaltado el cruce que acaba de cambiar. */
const RESALTADO_MS = 2000;

/**
 * El bracket en la ficha pública (PICA-217), para los participantes y cualquiera con el enlace.
 * Suscripto a `/topic/torneos/{id}` para reflejar avances y confirmaciones de resultados en tiempo real
 * sin recargar la página. Al reconectarse recarga el estado desde el servidor.
 *
 * Se queda siempre con la versión del bracket más alta (HU-809): un bracket más viejo que el que muestra, del tópico
 * o del GET, se descarta; uno de la misma versión se aplica (varios mensajes de un mismo cambio la comparten). Si la
 * versión salta, se perdió algún mensaje: aplica el que llegó, que trae el bracket completo, y además lo vuelve a pedir.
 * El cruce del mensaje aplicado queda resaltado unos segundos; el bracket del GET no resalta nada.
 */
export const BracketDelTorneo: React.FC<{
  torneoId: number;
  /** Con fase de grupos (CR-02): es la llave de los que pasan, con cruces fijos; lo sorteado son los grupos. */
  conGrupos?: boolean;
}> = ({ torneoId, conGrupos = false }) => {
  const [bracket, setBracket] = useState<BracketTorneo | null>(null);
  const version = useRef<number | null>(null);
  const [resaltado, setResaltado] = useState<number | null>(null);

  useEffect(() => {
    if (resaltado === null) return undefined;
    const apagar = setTimeout(() => setResaltado(null), RESALTADO_MS);
    return () => clearTimeout(apagar);
  }, [resaltado]);

  /** Lo aplica si no es más viejo que el que se ve; devuelve si lo aplicó. */
  const aplicar = useCallback((nuevo: BracketTorneo): boolean => {
    if (version.current !== null && nuevo.version < version.current) return false;
    version.current = nuevo.version;
    setBracket(nuevo);
    return true;
  }, []);

  const cargarBracket = useCallback(() => {
    let vigente = true;
    torneoApi
      .bracket(torneoId)
      .then((b) => {
        if (vigente) aplicar(b);
      })
      .catch(() => {
        if (vigente) setBracket(null);
      });
    return () => {
      vigente = false;
    };
  }, [torneoId, aplicar]);

  useEffect(() => {
    return cargarBracket();
  }, [cargarBracket]);

  useTorneoRealtime(torneoId, {
    onActualizar: (data) => {
      const nuevo = data.bracket ?? (data.rondas ? (data as unknown as BracketTorneo) : null);
      if (!nuevo) {
        cargarBracket();
        return;
      }
      const anterior = version.current;
      if (!aplicar(nuevo)) return;
      if (typeof data.partidoId === 'number') setResaltado(data.partidoId);
      if (anterior !== null && nuevo.version > anterior + 1) cargarBracket();
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconoTrofeo size={20} />
          <span>{conGrupos ? 'Llave' : 'Bracket'}</span>
        </div>
        {conGrupos ? (
          <span className="torneos-subtitulo">Cruces fijos: 1A–2B, 1B–2A…</span>
        ) : (
          <a
            href={`/verificacion?tipo=torneo&id=${torneoId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--color-primario, #2563eb)',
              textDecoration: 'none',
            }}
            title="Verificar y recalcular sorteo en el portal público"
            data-testid="link-verificar-bracket"
          >
            <IconoEscudoCheck size={16} />
            <span>Verificar sorteo</span>
          </a>
        )}
      </div>
      <Bracket bracket={bracket} resaltado={resaltado} />
    </div>
  );
};
