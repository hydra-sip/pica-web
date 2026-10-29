import React, { useState } from 'react';
import { partidoApi, PartidoDetalle } from '../../api/partidoApi';
import { PartidoBracket } from '../../api/torneoApi';
import { sinFechaParaJugar } from '../../partidos/formato';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { fechaHora, inputLocalAIso, isoAInputLocal } from '../../shared/formato';
import { Button, Input } from '../../shared/ui';

/** El back la rechaza si es pasada, anterior al inicio del torneo o posterior a su fin. */
const FECHA_FUERA_DE_RANGO = {
  RANGO_INVALIDO: 'Tiene que ser futura y dentro de las fechas del torneo.',
};

interface ProgramacionPartidoProps {
  partido: PartidoBracket;
  /** Con el torneo con la inscripción cerrada o en curso: antes no hay bracket y después ya no se programa. */
  editable: boolean;
  /** Con el torneo en curso, un partido para jugar sin fecha se resalta (HU-309). */
  resaltarSinFecha?: boolean;
  onProgramado: (partido: PartidoDetalle) => void;
}

/**
 * La fecha de un partido del bracket de la consola (HU-308) y, mientras está PROGRAMADO, el selector para ponérsela
 * o cambiarla: de ella sale la ventana de check-in. Con un check-in hecho el partido deja de estar PROGRAMADO y la
 * fecha queda fija.
 */
export const ProgramacionPartido: React.FC<ProgramacionPartidoProps> = ({
  partido,
  editable,
  resaltarSinFecha = false,
  onProgramado,
}) => {
  const [valor, setValor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (partido.bye) return null;

  const fecha = partido.fechaProgramada ? fechaHora(partido.fechaProgramada) : 'Sin fecha';
  const programable = editable && partido.estado === 'PROGRAMADO';

  const guardar = async () => {
    const iso = valor === null ? null : inputLocalAIso(valor);
    if (!iso) {
      setError('Elegí el día y la hora.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      onProgramado(await partidoApi.programar(partido.id, iso));
      setValor(null);
    } catch (err) {
      setError(
        erroresPorCampo(err, FECHA_FUERA_DE_RANGO).fechaProgramada ??
          mensajeDeError(err, 'No se pudo programar el partido.')
      );
    } finally {
      setGuardando(false);
    }
  };

  if (valor === null) {
    return (
      <div className="bracket-programacion">
        <span
          className={
            resaltarSinFecha && sinFechaParaJugar(partido) ? 'bracket-sin-fecha' : undefined
          }
        >
          {fecha}
        </span>
        {programable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setValor(isoAInputLocal(partido.fechaProgramada))}
          >
            {partido.fechaProgramada ? 'Cambiar' : 'Programar'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bracket-programacion bracket-programacion-editando">
      <Input
        type="datetime-local"
        aria-label={`Fecha y hora del partido ${partido.ronda}-${partido.posicion}`}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        aria-invalid={!!error}
      />
      <div className="bracket-programacion-acciones">
        <Button
          variant="ghost"
          size="sm"
          disabled={guardando}
          onClick={() => {
            setValor(null);
            setError(null);
          }}
        >
          Cancelar
        </Button>
        <Button size="sm" loading={guardando} onClick={() => void guardar()}>
          Guardar
        </Button>
      </div>
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
