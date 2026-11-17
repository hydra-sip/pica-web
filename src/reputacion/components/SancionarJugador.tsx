import React, { useEffect, useState } from 'react';
import { Gravedad, JugadorSancionable, SancionDetalle, sancionApi } from '../../api/sancionApi';
import { mensajeDeError, mensajesDelBackPorCampo } from '../../shared/mensajesError';
import { Button, Field, Modal, Select, Textarea } from '../../shared/ui';
import { GRAVEDAD, GRAVEDADES, nombreCompleto } from '../formato';
import '../reputacion.css';

interface SancionarJugadorProps {
  torneoId: number;
  /** Desde la ficha del partido: solo sus jugadores, y la sanción queda asociada al partido. */
  partidoId?: number;
  /** Desde una fila de inscriptos: solo los de esa inscripción (en un equipo, su nómina). */
  inscripcionId?: number;
  /** Para distinguir los botones de cada fila. */
  ariaLabel?: string;
  size?: 'sm' | 'md';
  onSancionada: (sancion: SancionDetalle) => void;
}

const CAMPOS = ['usuarioId', 'gravedad', 'motivo'];

const etiquetaJugador = (j: JugadorSancionable): string =>
  `${nombreCompleto(j.jugador)} (@${j.jugador.username})${j.equipo ? ` · ${j.equipo}` : ''}`;

/**
 * HU-803 (T803-2): el organizador o un árbitro que aceptó sanciona a un jugador con gravedad y motivo. A quiénes se
 * puede elegir lo dice el back; el botón solo se muestra donde quien mira puede sancionar.
 */
export const SancionarJugador: React.FC<SancionarJugadorProps> = ({
  torneoId,
  partidoId,
  inscripcionId,
  ariaLabel,
  size = 'md',
  onSancionada,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [jugadores, setJugadores] = useState<JugadorSancionable[] | null>(null);
  const [usuarioId, setUsuarioId] = useState('');
  const [gravedad, setGravedad] = useState<Gravedad | ''>('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!abierto) return undefined;
    let vigente = true;
    setJugadores(null);
    sancionApi
      .jugadores(torneoId, partidoId)
      .then((todos) => {
        if (!vigente) return;
        const elegibles = inscripcionId
          ? todos.filter((j) => j.inscripcionId === inscripcionId)
          : todos;
        setJugadores(elegibles);
        if (elegibles.length === 1) setUsuarioId(String(elegibles[0].jugador.id));
      })
      .catch((err) => {
        if (!vigente) return;
        setJugadores([]);
        setError(mensajeDeError(err, 'No se pudieron cargar los jugadores.'));
      });
    return () => {
      vigente = false;
    };
  }, [abierto, torneoId, partidoId, inscripcionId]);

  const cerrar = () => {
    setAbierto(false);
    setUsuarioId('');
    setGravedad('');
    setMotivo('');
    setError(null);
    setErrores({});
  };

  const faltantes = (): Record<string, string> => {
    const f: Record<string, string> = {};
    if (!usuarioId) f.usuarioId = 'Elegí a quién sancionar.';
    if (!gravedad) f.gravedad = 'Elegí la gravedad.';
    if (!motivo.trim()) f.motivo = 'El motivo es obligatorio.';
    return f;
  };

  const sancionar = async () => {
    const f = faltantes();
    setErrores(f);
    if (Object.keys(f).length > 0 || !gravedad) return;

    setEnviando(true);
    setError(null);
    try {
      const sancion = await sancionApi.aplicar(torneoId, {
        usuarioId: Number(usuarioId),
        partidoId: partidoId ?? null,
        gravedad,
        motivo: motivo.trim(),
      });
      cerrar();
      onSancionada(sancion);
    } catch (err) {
      const porCampo = mensajesDelBackPorCampo(err);
      setErrores(porCampo);
      // un campo sin control en el formulario (el partido) va como aviso general
      const otros = Object.entries(porCampo)
        .filter(([campo]) => !CAMPOS.includes(campo))
        .map(([, mensaje]) => mensaje);
      setError(
        otros.length > 0
          ? otros.join(' ')
          : Object.keys(porCampo).length > 0
            ? null
            : mensajeDeError(err, 'No se pudo aplicar la sanción.')
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        aria-label={ariaLabel}
        onClick={() => setAbierto(true)}
      >
        Sancionar
      </Button>
      <Modal
        isOpen={abierto}
        title="Sancionar a un jugador"
        onClose={cerrar}
        closeDisabled={enviando}
        footer={
          <>
            <Button variant="secondary" disabled={enviando} onClick={cerrar}>
              Volver
            </Button>
            <Button
              variant="danger"
              loading={enviando}
              disabled={jugadores === null || jugadores.length === 0}
              onClick={() => void sancionar()}
            >
              Aplicar sanción
            </Button>
          </>
        }
      >
        <p className="reputacion-ayuda">
          Queda registrada con tu nombre y la fecha, le llega un mail al jugador y le baja el índice
          de fair play según la gravedad.
        </p>
        {jugadores === null ? (
          <p className="reputacion-ayuda" role="status">
            Cargando jugadores...
          </p>
        ) : jugadores.length === 0 && !error ? (
          <p className="reputacion-ayuda">No hay jugadores confirmados para sancionar.</p>
        ) : (
          jugadores.length > 0 && (
            <>
              <Field label="Jugador" required error={errores.usuarioId}>
                <Select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
                  <option value="">Elegí al jugador</option>
                  {jugadores.map((j) => (
                    <option key={`${j.inscripcionId}-${j.jugador.id}`} value={j.jugador.id}>
                      {etiquetaJugador(j)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Gravedad" required error={errores.gravedad}>
                <Select
                  value={gravedad}
                  onChange={(e) => setGravedad(e.target.value as Gravedad | '')}
                >
                  <option value="">Elegí la gravedad</option>
                  {GRAVEDADES.map((g) => (
                    <option key={g} value={g}>
                      {GRAVEDAD[g].texto}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Motivo (lo lee el jugador)" required error={errores.motivo}>
                <Textarea
                  rows={3}
                  maxLength={1000}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </Field>
            </>
          )
        )}
        {error && (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        )}
      </Modal>
    </>
  );
};
