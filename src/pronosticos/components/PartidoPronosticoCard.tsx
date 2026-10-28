import React, { useState } from 'react';
import { Eleccion, PartidoPronostico } from '../../api/pronosticoApi';
import { fechaHora } from '../../shared/formato';
import { IconoAlerta, IconoCheck, IconoCruz, IconoReloj } from '../../shared/ui/Iconos';
import { mensajeDeError } from '../../shared/mensajesError';

interface PartidoPronosticoCardProps {
  partido: PartidoPronostico;
  onGuardarPronostico: (partidoId: number, eleccion: Eleccion) => Promise<void>;
}

export const PartidoPronosticoCard: React.FC<PartidoPronosticoCardProps> = ({
  partido,
  onGuardarPronostico,
}) => {
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const localNombre = partido.local?.nombre || 'Por definir';
  const visitanteNombre = partido.visitante?.nombre || 'Por definir';
  const eleccionActual = partido.miPronostico?.eleccion;

  const handleElegir = async (eleccion: Eleccion) => {
    if (!partido.abierto || guardando) return;
    setErrorLocal(null);
    setGuardando(true);
    try {
      await onGuardarPronostico(partido.partidoId, eleccion);
    } catch (err) {
      setErrorLocal(mensajeDeError(err, 'No se pudo guardar el pronóstico.'));
    } finally {
      setGuardando(false);
    }
  };

  const getIniciales = (nombre: string) => {
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  };

  const tieneResultadoReal =
    partido.local?.puntaje != null && partido.visitante?.puntaje != null;

  return (
    <div
      className={`pronostico-card ${partido.abierto ? 'abierto' : 'cerrado'}`}
      data-testid={`partido-card-${partido.partidoId}`}
    >
      <div className="pronostico-card-header">
        <div className="pronostico-torneo-info">
          <span className="pronostico-torneo-nombre">{partido.torneoNombre}</span>
          <span className="pronostico-ronda-nombre">{partido.nombreRonda}</span>
        </div>

        {partido.fechaProgramada && (
          <div className="pronostico-fecha-box" title="Fecha y horario del partido">
            <IconoReloj size={13} />
            <span>{fechaHora(partido.fechaProgramada)}</span>
          </div>
        )}
      </div>

      <div className="pronostico-enfrentamiento">
        <div className="pronostico-equipo">
          <div className="pronostico-equipo-avatar" aria-hidden="true">
            {getIniciales(localNombre)}
          </div>
          <span className="pronostico-equipo-nombre" title={localNombre}>
            {localNombre}
          </span>
        </div>

        <div className="pronostico-marcador-central">
          {tieneResultadoReal ? (
            <div className="pronostico-goles-reales">
              <span>{partido.local?.puntaje}</span>
              <span>-</span>
              <span>{partido.visitante?.puntaje}</span>
            </div>
          ) : (
            <span className="pronostico-vs">VS</span>
          )}
          <span
            className={`badge ${partido.abierto ? 'badge-exito' : 'badge-neutral'}`}
            style={{ fontSize: '10px', padding: '2px 6px' }}
          >
            {partido.abierto ? 'Ventana abierta' : 'Ventana cerrada'}
          </span>
        </div>

        <div className="pronostico-equipo">
          <div className="pronostico-equipo-avatar" aria-hidden="true">
            {getIniciales(visitanteNombre)}
          </div>
          <span className="pronostico-equipo-nombre" title={visitanteNombre}>
            {visitanteNombre}
          </span>
        </div>
      </div>

      <div className="pronostico-opciones-box">
        <div className="pronostico-opciones-label">
          <span>{partido.abierto ? 'Seleccioná tu pronóstico:' : 'Tu pronóstico:'}</span>
          {partido.cierraEn && partido.abierto && (
            <small>Cierra: {fechaHora(partido.cierraEn)}</small>
          )}
        </div>

        <div className="pronostico-botones-grid">
          <button
            type="button"
            className={`pronostico-btn-opcion ${eleccionActual === '1' ? 'seleccionado' : ''}`}
            disabled={!partido.abierto || guardando}
            onClick={() => handleElegir('1')}
            aria-pressed={eleccionActual === '1'}
            aria-label={`Pronosticar victoria local: ${localNombre}`}
          >
            <strong>1</strong>
            <span>Local</span>
          </button>

          <button
            type="button"
            className={`pronostico-btn-opcion ${eleccionActual === 'X' ? 'seleccionado' : ''}`}
            disabled={!partido.abierto || guardando}
            onClick={() => handleElegir('X')}
            aria-pressed={eleccionActual === 'X'}
            aria-label="Pronosticar empate"
          >
            <strong>X</strong>
            <span>Empate</span>
          </button>

          <button
            type="button"
            className={`pronostico-btn-opcion ${eleccionActual === '2' ? 'seleccionado' : ''}`}
            disabled={!partido.abierto || guardando}
            onClick={() => handleElegir('2')}
            aria-pressed={eleccionActual === '2'}
            aria-label={`Pronosticar victoria visitante: ${visitanteNombre}`}
          >
            <strong>2</strong>
            <span>Visitante</span>
          </button>
        </div>
      </div>

      <div className="pronostico-card-footer">
        {errorLocal && (
          <div className="pronostico-error-mensaje" role="alert">
            <IconoAlerta size={14} /> {errorLocal}
          </div>
        )}

        {/* Estado del pronóstico y puntos otorgados */}
        {partido.miPronostico?.puntos != null ? (
          partido.miPronostico.puntos > 0 ? (
            <div className="pronostico-resultado-badge pronostico-resultado-acierto">
              <IconoCheck size={14} />
              <span>Acertaste (+{partido.miPronostico.puntos} pts)</span>
            </div>
          ) : (
            <div className="pronostico-resultado-badge pronostico-resultado-fallo">
              <IconoCruz size={14} />
              <span>No acertaste (0 pts)</span>
            </div>
          )
        ) : partido.miPronostico ? (
          <div className="pronostico-resultado-badge pronostico-resultado-espera">
            <IconoReloj size={14} />
            <span>
              Pronóstico registrado ({partido.miPronostico.eleccion === '1' ? 'Local' : partido.miPronostico.eleccion === 'X' ? 'Empate' : 'Visitante'}) · Pendiente
            </span>
          </div>
        ) : !partido.abierto ? (
          <div className="pronostico-resultado-badge pronostico-resultado-fallo">
            <span>Ventana cerrada · Sin pronóstico</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
