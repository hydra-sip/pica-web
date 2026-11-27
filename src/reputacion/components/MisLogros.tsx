import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { InsigniaObtenida, LogrosJugador, logrosApi } from '../../api/logrosApi';
import { fecha } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Table } from '../../shared/ui';
import {
  IconoCruz,
  IconoEscudoCheck,
  IconoMedalla,
  IconoPodio,
  IconoTicket,
  IconoTrofeo,
} from '../../shared/ui/Iconos';
import '../reputacion.css';
import '../logros.css';

const DURACION_TOAST_MS = 6000;
const claveVistas = (usuarioId: number) => `pica_insignias_vistas_${usuarioId}`;

const IconoInsignia: React.FC<{ icono: string; size?: number }> = ({ icono, size = 18 }) => {
  switch (icono) {
    case 'trofeo-inicio':
      return <IconoTrofeo size={size} />;
    case 'corona':
      return <IconoPodio size={size} />;
    case 'medalla':
      return <IconoMedalla size={size} />;
    case 'ticket-estrella':
      return <IconoTicket size={size} />;
    case 'escudo-check':
      return <IconoEscudoCheck size={size} />;
    default:
      return <IconoMedalla size={size} />;
  }
};

const leerVistas = (usuarioId: number): Set<string> => {
  try {
    const raw = localStorage.getItem(claveVistas(usuarioId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};

const guardarVistas = (usuarioId: number, insignias: InsigniaObtenida[]) => {
  try {
    localStorage.setItem(claveVistas(usuarioId), JSON.stringify(insignias.map((i) => i.codigo)));
  } catch {
    // Sin localStorage disponible: solo se omite la persistencia del aviso
  }
};

interface MisLogrosProps {
  usuarioId: number;
}

/**
 * HU-804 (T804-2): en Mi perfil, las insignias obtenidas y las rifas ganadas del jugador, más un aviso cuando aparece
 * una insignia nueva.
 */
export const MisLogros: React.FC<MisLogrosProps> = ({ usuarioId }) => {
  const [logros, setLogros] = useState<LogrosJugador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastInsignia, setToastInsignia] = useState<InsigniaObtenida | null>(null);

  useEffect(() => {
    let vigente = true;
    logrosApi
      .ver(usuarioId)
      .then((res) => {
        if (!vigente) return;
        setLogros(res);
        setError(null);
        const vistas = leerVistas(usuarioId);
        const nuevas = res.insignias.filter((i) => !vistas.has(i.codigo));
        guardarVistas(usuarioId, res.insignias);
        if (nuevas.length > 0) {
          setToastInsignia(nuevas[0]);
        }
      })
      .catch(
        (err) =>
          vigente && setError(mensajeDeError(err, 'No se pudieron cargar tus insignias y rifas ganadas.'))
      );
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  useEffect(() => {
    if (!toastInsignia) return;
    const temporizador = window.setTimeout(() => setToastInsignia(null), DURACION_TOAST_MS);
    return () => window.clearTimeout(temporizador);
  }, [toastInsignia]);

  return (
    <>
      {toastInsignia && (
        <div
          className="notificacion-toast reputacion-insignia-toast"
          role="status"
          aria-label="Nueva insignia obtenida"
        >
          <div className="notificacion-toast-cuerpo">
            <span className="notificacion-icono" aria-hidden="true">
              <IconoInsignia icono={toastInsignia.icono} size={16} />
            </span>
            <span className="notificacion-contenido">
              <strong>¡Nueva insignia: {toastInsignia.nombre}!</strong>
              <span className="notificacion-texto">{toastInsignia.descripcion}</span>
            </span>
          </div>
          <button
            type="button"
            className="notificacion-toast-cerrar"
            aria-label="Cerrar aviso"
            onClick={() => setToastInsignia(null)}
          >
            <IconoCruz size={16} />
          </button>
        </div>
      )}

      <section className="pica-card hydra-card reputacion-tarjeta" aria-labelledby="mis-insignias">
        <h2 id="mis-insignias">Insignias</h2>
        {error ? (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        ) : !logros ? (
          <p className="reputacion-ayuda" role="status">
            Cargando insignias...
          </p>
        ) : logros.insignias.length === 0 ? (
          <p className="reputacion-ayuda">Todavía no obtuviste insignias.</p>
        ) : (
          <ul className="reputacion-insignias">
            {logros.insignias.map((i) => (
              <li key={i.codigo} className="reputacion-insignia">
                <span className="reputacion-insignia-icono" aria-hidden="true">
                  <IconoInsignia icono={i.icono} />
                </span>
                <div className="reputacion-insignia-cuerpo">
                  <span className="reputacion-insignia-nombre">{i.nombre}</span>
                  <span className="reputacion-ayuda">{i.descripcion}</span>
                  <span className="reputacion-ayuda">{fecha(i.otorgadaEn)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pica-card hydra-card reputacion-tarjeta" aria-labelledby="mis-rifas-ganadas">
        <h2 id="mis-rifas-ganadas">Rifas ganadas</h2>
        {error ? (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        ) : !logros ? (
          <p className="reputacion-ayuda" role="status">
            Cargando rifas ganadas...
          </p>
        ) : logros.rifasGanadas.length === 0 ? (
          <p className="reputacion-ayuda">Todavía no ganaste ninguna rifa.</p>
        ) : (
          <Table caption="Rifas ganadas">
            <thead>
              <tr>
                <th scope="col">Rifa</th>
                <th scope="col">Torneo</th>
                <th scope="col">Número</th>
                <th scope="col">Puesto</th>
                <th scope="col">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {logros.rifasGanadas.map((r) => (
                <tr key={`${r.rifaId}-${r.puesto}`}>
                  <td>
                    <Link to={`/rifas/${r.rifaId}`}>{r.rifaTitulo}</Link>
                  </td>
                  <td>
                    {r.torneoNombre ? (
                      r.torneoSlug ? (
                        <Link to={`/torneos/${r.torneoSlug}`}>{r.torneoNombre}</Link>
                      ) : (
                        r.torneoNombre
                      )
                    ) : (
                      'Sin torneo asociado'
                    )}
                  </td>
                  <td>#{r.numeroGanador}</td>
                  <td>{r.puesto}.º premio</td>
                  <td>{fecha(r.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </>
  );
};
