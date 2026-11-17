import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FairPlayDetalle, MovimientoFairPlay, fairPlayApi } from '../../api/fairPlayApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Table } from '../../shared/ui';
import { GRAVEDAD } from '../formato';
import { IndiceFairPlay } from './IndiceFairPlay';
import '../reputacion.css';

const quePaso = (m: MovimientoFairPlay): string => {
  if (m.tipo === 'CHECKIN') return 'Check-in cumplido';
  if (m.tipo === 'AUSENCIA') return 'Ausencia sin aviso';
  return m.gravedad ? `Sanción ${GRAVEDAD[m.gravedad].texto.toLowerCase()}` : 'Sanción';
};

const conSigno = (delta: number): string =>
  delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : '0';

interface MiFairPlayProps {
  usuarioId: number;
}

/**
 * HU-802 (T802-2, wireframes 23 y 24): en Mi perfil, el índice de fair play con lo que lo movió, el último cambio
 * primero.
 */
export const MiFairPlay: React.FC<MiFairPlayProps> = ({ usuarioId }) => {
  const [indice, setIndice] = useState<FairPlayDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    fairPlayApi
      .ver(usuarioId)
      .then((i) => vigente && setIndice(i))
      .catch(
        (err) =>
          vigente && setError(mensajeDeError(err, 'No se pudo cargar tu índice de fair play.'))
      );
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  const sanciones = indice?.historial.filter((m) => m.tipo === 'SANCION').length ?? 0;
  const checkins = indice?.historial.filter((m) => m.tipo === 'CHECKIN').length ?? 0;

  return (
    <section className="pica-card hydra-card reputacion-tarjeta" aria-labelledby="mi-fair-play">
      <h2 id="mi-fair-play">Índice de fair play</h2>
      {error ? (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      ) : !indice ? (
        <p className="reputacion-ayuda" role="status">
          Cargando el índice...
        </p>
      ) : (
        <>
          <div className="reputacion-indice">
            <IndiceFairPlay valor={indice.valor} grande />
            <p className="reputacion-ayuda">
              {sanciones === 1 ? '1 sanción' : `${sanciones} sanciones`} ·{' '}
              {checkins === 1 ? '1 check-in cumplido' : `${checkins} check-ins cumplidos`}
            </p>
          </div>
          {indice.historial.length === 0 ? (
            <p className="reputacion-ayuda">
              Todavía no se movió: tenés el valor con el que arranca todo jugador.
            </p>
          ) : (
            <Table caption="Historial del índice de fair play">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Qué pasó</th>
                  <th scope="col">Cambio</th>
                  <th scope="col">Quedó en</th>
                </tr>
              </thead>
              <tbody>
                {indice.historial.map((m, i) => (
                  <tr key={`${m.creadoEn}-${i}`}>
                    <td>{fechaHora(m.creadoEn)}</td>
                    <td>
                      {quePaso(m)}
                      <span className="torneos-celda-secundaria">
                        {m.torneo}
                        {m.partidoId && (
                          <>
                            {' · '}
                            <Link to={`/partidos/${m.partidoId}`}>Ver el partido</Link>
                          </>
                        )}
                      </span>
                    </td>
                    <td className={m.delta < 0 ? 'reputacion-baja' : undefined}>
                      {conSigno(m.delta)}
                    </td>
                    <td>{m.valorResultante}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </section>
  );
};
