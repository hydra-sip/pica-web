import React from 'react';
import { EventoPartido, ObjecionComparada, VersionResultado } from '../../api/partidoApi';
import { formatFecha } from '../../torneos/utils/formatters';
import { marcadorDeVersion } from '../formato';
import { EvidenciasPartido } from './EvidenciasPartido';

const ACCION: Record<EventoPartido['evento'], string> = {
  PROGRAMADO: 'programó el partido',
  CHECKIN: 'hizo check-in',
  CARGADO: 'cargó el resultado',
  ACEPTADO: 'aceptó el resultado',
  OBJETADO: 'objetó el resultado',
  CONFIRMADO_POR_PLAZO: 'confirmó el resultado al vencer el plazo',
  LAUDO: 'laudó',
  WALKOVER: 'dio el partido por ganado por ausencia',
  // con descalificar a los dos el partido queda cerrado y nunca llega a un comparativo
  SIN_PRESENTES: 'reprogramó el partido: no se presentó ninguno',
  PASE_DIRECTO: 'dio el pase directo',
};

/** Los del sistema que nombran al equipo en la acción, en lugar de entre paréntesis. */
const NOMBRA_AL_EQUIPO: EventoPartido['evento'][] = ['WALKOVER', 'PASE_DIRECTO'];

const accion = (e: EventoPartido): string => {
  if (e.evento === 'PROGRAMADO' && e.fechaProgramada) {
    return `programó el partido para el ${formatFecha(e.fechaProgramada)}`;
  }
  // en WALKOVER, `equipo` es el ausente; en PASE_DIRECTO, el que pasa
  if (e.evento === 'WALKOVER' && e.equipo) return `${ACCION.WALKOVER} de ${e.equipo}`;
  if (e.evento === 'PASE_DIRECTO' && e.equipo) return `${ACCION.PASE_DIRECTO} a ${e.equipo}`;
  if (e.evento !== 'LAUDO') return ACCION[e.evento];
  return e.decision === 'CORREGIDO'
    ? 'laudó: corrigió el resultado'
    : 'laudó: confirmó el resultado cargado';
};

interface ComparativoObjecionProps {
  partidoId: number;
  comparada: ObjecionComparada;
}

const Version: React.FC<{
  partidoId: number;
  titulo: string;
  version: VersionResultado;
  citadaId: number | null;
}> = ({ partidoId, titulo, version, citadaId }) => (
  <section className="comparativo-version">
    <p className="partido-rotulo">{titulo}</p>
    <strong className="comparativo-marcador">{marcadorDeVersion(version)}</strong>
    <p className="partido-ayuda">{formatFecha(version.fecha)}</p>
    <EvidenciasPartido
      partidoId={partidoId}
      evidencias={version.evidencias ?? []}
      puedeSubir={false}
      onSubida={() => undefined}
      titulo={`Evidencia de ${version.equipo}`}
      citadaId={citadaId}
    />
  </section>
);

/**
 * Las dos versiones de un partido objetado lado a lado, cada una con la evidencia de su equipo, y el historial del
 * partido (HU-303, PICA-247). Lo ve quien puede laudar; en el celular, una versión debajo de la otra.
 */
export const ComparativoObjecion: React.FC<ComparativoObjecionProps> = ({
  partidoId,
  comparada,
}) => {
  const citadaId = comparada.laudo?.evidenciaId ?? null;
  return (
    <div className="comparativo">
      <strong>Comparativo</strong>
      <div className="comparativo-versiones">
        <Version
          partidoId={partidoId}
          titulo={`Versión de ${comparada.cargada.equipo} (cargó)`}
          version={comparada.cargada}
          citadaId={citadaId}
        />
        <Version
          partidoId={partidoId}
          titulo={`Versión de ${comparada.objetada.equipo} (objetó)`}
          version={comparada.objetada}
          citadaId={citadaId}
        />
      </div>
      <div className="comparativo-historial">
        <strong>Historial del partido</strong>
        <ol>
          {comparada.historial.map((e, i) => (
            <li key={i}>
              <span className="partido-ayuda">{formatFecha(e.fecha)}</span>
              <span>
                {e.usuario ?? 'El sistema'}
                {e.equipo &&
                  e.equipo !== e.usuario &&
                  !NOMBRA_AL_EQUIPO.includes(e.evento) &&
                  ` (${e.equipo})`}{' '}
                {accion(e)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
