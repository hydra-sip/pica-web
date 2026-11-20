import React, { useEffect, useState } from 'react';
import {
  CalificacionDetalle,
  JugadorCalificable,
  calificacionApi,
} from '../../api/calificacionApi';
import { formatFecha } from '../../torneos/utils/formatters';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card, Field, Textarea } from '../../shared/ui';
import { nombreCompleto } from '../formato';
import { Estrellas } from './Estrellas';
import '../reputacion.css';

const iniciales = (j: JugadorCalificable): string =>
  `${j.jugador.nombres.charAt(0)}${j.jugador.apellidos.charAt(0)}`.toUpperCase();

const detalle = (j: JugadorCalificable): string =>
  `@${j.jugador.username}${j.equipo ? ` · ${j.equipo}` : ''}`;

interface CalificarJugadoresProps {
  torneoId: number;
}

/**
 * HU-805 (T805-2): con el torneo terminado, el organizador califica a cada jugador de 1 a 5, con un comentario y la
 * marca de no confiable. Los ya calificados quedan en solo lectura, como las valoraciones del perfil del organizador.
 */
export const CalificarJugadores: React.FC<CalificarJugadoresProps> = ({ torneoId }) => {
  const [jugadores, setJugadores] = useState<JugadorCalificable[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);
    calificacionApi
      .jugadores(torneoId)
      .then((j) => vigente && setJugadores(j))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar los jugadores.'))
      );
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  const alCalificar = (calificacion: CalificacionDetalle) =>
    setJugadores((actuales) =>
      (actuales ?? []).map((j) =>
        j.jugador.id === calificacion.jugador.id ? { ...j, calificacion } : j
      )
    );

  return (
    <Card>
      <div className="torneos-tarjeta-titulo">
        <h2>Calificar jugadores</h2>
      </div>
      <p className="reputacion-ayuda">
        Tu calificación entra en el puntaje de reputación del jugador, aparte del fair play. La
        marca «No confiable» la ven los organizadores al revisar inscripciones y no lo bloquea.
      </p>
      {error ? (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      ) : jugadores === null ? (
        <p className="torneos-vacio" role="status">
          Cargando jugadores...
        </p>
      ) : jugadores.length === 0 ? (
        <p className="torneos-vacio">No hubo jugadores confirmados en este torneo.</p>
      ) : (
        <ul className="reputacion-lista reputacion-calificaciones">
          {jugadores.map((j) => (
            <li key={`${j.inscripcionId}-${j.jugador.id}`} className="reputacion-sancion">
              <div className="reputacion-calificacion-cabecera">
                <span className="reputacion-avatar" aria-hidden="true">
                  {iniciales(j)}
                </span>
                <span>
                  <span className="torneos-nombre-fila">{nombreCompleto(j.jugador)}</span>
                  <span className="torneos-celda-secundaria">{detalle(j)}</span>
                </span>
                {j.calificacion?.noConfiable && <Badge tone="peligro">No confiable</Badge>}
              </div>
              {j.calificacion ? (
                <div className="reputacion-calificacion-hecha">
                  <span className="torneos-celda-secundaria">
                    <Estrellas puntaje={j.calificacion.puntaje} /> · Calificado el{' '}
                    {formatFecha(j.calificacion.creadaEn)}
                  </span>
                  {j.calificacion.comentario && <p>«{j.calificacion.comentario}»</p>}
                </div>
              ) : (
                <FormularioCalificacion
                  torneoId={torneoId}
                  jugador={j}
                  onCalificado={alCalificar}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

interface FormularioCalificacionProps {
  torneoId: number;
  jugador: JugadorCalificable;
  onCalificado: (calificacion: CalificacionDetalle) => void;
}

const FormularioCalificacion: React.FC<FormularioCalificacionProps> = ({
  torneoId,
  jugador,
  onCalificado,
}) => {
  const nombre = nombreCompleto(jugador.jugador);
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [noConfiable, setNoConfiable] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calificar = async () => {
    if (puntaje === 0) {
      setError('Elegí de 1 a 5 estrellas.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      onCalificado(
        await calificacionApi.calificar(torneoId, {
          usuarioId: jugador.jugador.id,
          puntaje,
          comentario: comentario.trim() || null,
          noConfiable,
        })
      );
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la calificación.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="reputacion-calificacion-form">
      <div
        className="reputacion-selector-estrellas"
        role="radiogroup"
        aria-label={`Puntaje para ${nombre}`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={puntaje === n}
            aria-label={n === 1 ? '1 estrella' : `${n} estrellas`}
            className={n <= puntaje ? 'activa' : undefined}
            onClick={() => setPuntaje(n)}
          >
            ★
          </button>
        ))}
      </div>
      <Field label={`Comentario sobre ${nombre} (opcional)`}>
        <Textarea
          rows={2}
          maxLength={1000}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
      </Field>
      <div className="reputacion-calificacion-acciones">
        <label className="reputacion-casilla">
          <input
            type="checkbox"
            checked={noConfiable}
            onChange={(e) => setNoConfiable(e.target.checked)}
          />
          No confiable
        </label>
        <Button
          size="sm"
          loading={enviando}
          aria-label={`Calificar a ${nombre}`}
          onClick={() => void calificar()}
        >
          Calificar
        </Button>
      </div>
      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
