import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { jugadorApi, PerfilJugador } from '../../api/jugadorApi';
import { fecha } from '../../shared/formato';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import { IndiceFairPlay } from '../components/IndiceFairPlay';
import '../reputacion.css';

/** `Juan Pérez` → `JP`: la primera letra de las dos primeras palabras. */
const iniciales = (nombre: string): string =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');

/** `1` → `1.º puesto`; null: quedó afuera en la fase de grupos. */
const posicion = (puesto: number | null): string =>
  puesto === null ? 'Fase de grupos' : `${puesto}.º puesto`;

/** HU-804: `icono` es una clave y el front no tiene librería de íconos. */
const EMOJI_INSIGNIA: Record<string, string> = {
  'trofeo-inicio': '🏆',
  corona: '👑',
  medalla: '🥇',
  'ticket-estrella': '🎟️',
  'escudo-check': '🛡️',
};
const EMOJI_INSIGNIA_DESCONOCIDA = '🏅';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'inexistente' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; perfil: PerfilJugador };

/** Un id que no es un entero positivo no puede ser de nadie: no hace falta preguntarle al back. */
const idValido = (id: number) => Number.isInteger(id) && id > 0;

/**
 * HU-801 (T801-3): el perfil público de un jugador (/jugadores/:id), sin sesión. Muestra su identidad, los contadores
 * de su historial, su índice de fair play, sus últimos torneos terminados y, si las tiene, las rifas que ganó y sus
 * insignias (HU-804). Un jugador inexistente, o un id que no es un número, tiene su propio estado
 * en lugar de la página 404 genérica.
 */
export const PerfilJugadorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const jugadorId = Number(id);
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    if (!idValido(jugadorId)) {
      setEstado({ tipo: 'inexistente' });
      return;
    }
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    jugadorApi
      .verPerfil(jugadorId)
      .then((perfil) => vigente && setEstado({ tipo: 'listo', perfil }))
      .catch(
        (err) =>
          vigente &&
          setEstado(
            codigoDeError(err) === 'USUARIO_NO_ENCONTRADO'
              ? { tipo: 'inexistente' }
              : {
                  tipo: 'error',
                  mensaje: mensajeDeError(err, 'No se pudo cargar el perfil del jugador.'),
                }
          )
      );
    return () => {
      vigente = false;
    };
  }, [jugadorId]);

  if (estado.tipo === 'cargando') {
    return (
      <div className="organizador-perfil-contenedor">
        <p className="reputacion-ayuda" role="status">
          Cargando el perfil del jugador...
        </p>
      </div>
    );
  }
  if (estado.tipo === 'inexistente') {
    return (
      <div className="organizador-perfil-contenedor">
        <section className="pica-card hydra-card reputacion-tarjeta">
          <h1 className="organizador-nombre">Este jugador no existe</h1>
          <p className="reputacion-ayuda">
            Puede que el enlace esté mal escrito o que la cuenta ya no esté activa.
          </p>
          <p>
            <Link to="/torneos">Ver los torneos</Link>
          </p>
        </section>
      </div>
    );
  }
  if (estado.tipo === 'error') {
    return (
      <div className="organizador-perfil-contenedor">
        <div className="alerta alerta-peligro" role="alert">
          {estado.mensaje}
        </div>
      </div>
    );
  }

  const { perfil } = estado;

  const contadores = [
    { etiqueta: 'Torneos jugados', valor: perfil.historial.torneosJugados },
    { etiqueta: 'Victorias', valor: perfil.historial.victorias },
    { etiqueta: 'Derrotas', valor: perfil.historial.derrotas },
    { etiqueta: 'Podios', valor: perfil.historial.podios },
  ];

  return (
    <div className="organizador-perfil-contenedor">
      <section className="pica-card hydra-card reputacion-tarjeta organizador-cabecera">
        <div className="organizador-identidad">
          <div className="organizador-avatar" aria-hidden="true">
            {perfil.avatar ? (
              <img src={perfil.avatar} alt="" className="organizador-avatar-img" />
            ) : (
              iniciales(perfil.nombreCompleto)
            )}
          </div>
          <div>
            <h1 className="organizador-nombre">{perfil.nombreCompleto}</h1>
            <p className="organizador-username">@{perfil.username}</p>
          </div>
        </div>

        <section className="organizador-indice-bloque" aria-labelledby="jugador-fair-play">
          <span id="jugador-fair-play" className="organizador-indice-etiqueta">
            Fair play
          </span>
          <IndiceFairPlay valor={perfil.fairPlay.valor} grande />
          {perfil.fairPlay.actualizadoEn && (
            <p className="reputacion-ayuda">
              Actualizado el {fecha(perfil.fairPlay.actualizadoEn)}
            </p>
          )}
        </section>
      </section>

      <section aria-label="Historial del jugador">
        <h2 className="jugador-seccion-titulo">Historial competitivo</h2>
        <div className="jugador-contadores">
          {contadores.map(({ etiqueta, valor }) => (
            <article key={etiqueta} className="pica-card hydra-card jugador-contador">
              <strong className="jugador-contador-valor">{valor}</strong>
              <span className="jugador-contador-label">{etiqueta}</span>
            </article>
          ))}
        </div>
      </section>

      {perfil.insignias.length > 0 && (
        <section
          className="pica-card hydra-card reputacion-tarjeta"
          aria-labelledby="jugador-insignias"
        >
          <h2 id="jugador-insignias">Insignias</h2>
          <ul className="reputacion-lista">
            {perfil.insignias.map((i) => {
              const ayuda = `${i.descripcion} Otorgada el ${fecha(i.otorgadaEn)}.`;
              return (
                <li
                  key={i.codigo}
                  className="jugador-insignia"
                  aria-describedby={`insignia-${i.codigo}`}
                >
                  <span className="jugador-insignia-icono" aria-hidden="true">
                    {EMOJI_INSIGNIA[i.icono] ?? EMOJI_INSIGNIA_DESCONOCIDA}
                  </span>
                  <span>
                    <strong className="jugador-insignia-nombre">{i.nombre}</strong>
                    <span id={`insignia-${i.codigo}`} className="reputacion-ayuda">
                      {ayuda}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section
        className="pica-card hydra-card reputacion-tarjeta"
        aria-labelledby="jugador-torneos"
      >
        <h2 id="jugador-torneos">Últimos torneos</h2>
        {perfil.ultimosTorneos.length === 0 ? (
          <p className="reputacion-ayuda">Todavía no terminó ningún torneo.</p>
        ) : (
          <ul className="reputacion-lista">
            {perfil.ultimosTorneos.map((t) => (
              <li key={t.torneoId} className="jugador-torneo">
                <div>
                  <strong>
                    {t.slug ? <Link to={`/torneos/${t.slug}`}>{t.nombre}</Link> : t.nombre}
                  </strong>
                  <span className="reputacion-ayuda jugador-torneo-detalle">
                    {t.disciplina} · {fecha(t.fechaFin)}
                    {t.equipo && (
                      <>
                        {' · con '}
                        <em>{t.equipo}</em>
                      </>
                    )}
                  </span>
                </div>
                <span className="jugador-torneo-posicion">{posicion(t.posicion)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {perfil.rifasGanadas.length > 0 && (
        <section
          className="pica-card hydra-card reputacion-tarjeta"
          aria-labelledby="jugador-rifas"
        >
          <h2 id="jugador-rifas">Rifas ganadas</h2>
          <ul className="reputacion-lista">
            {perfil.rifasGanadas.map((r) => (
              <li key={`${r.rifaId}-${r.puesto}`} className="jugador-torneo">
                <div>
                  <strong>
                    <Link to={`/rifas/${r.rifaId}`}>{r.rifaTitulo}</Link>
                  </strong>
                  <span className="reputacion-ayuda jugador-torneo-detalle">
                    {r.torneoSlug ? (
                      <Link to={`/torneos/${r.torneoSlug}`}>{r.torneoNombre}</Link>
                    ) : (
                      r.torneoNombre
                    )}
                    {' · '}
                    {fecha(r.fecha)}
                  </span>
                </div>
                <span className="jugador-torneo-posicion">
                  {r.puesto}.º premio
                  {r.numeroGanador !== null && ` · número ${r.numeroGanador}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
