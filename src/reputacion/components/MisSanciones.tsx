import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SancionDetalle, sancionApi } from '../../api/sancionApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge } from '../../shared/ui';
import { GRAVEDAD, nombreCompleto } from '../formato';
import '../reputacion.css';

/**
 * HU-803 (T803-2, wireframe 57 sin la apelación): en Mi perfil, las sanciones que recibió el usuario, con el motivo,
 * el torneo, el partido y quién la aplicó.
 */
export const MisSanciones: React.FC = () => {
  const [sanciones, setSanciones] = useState<SancionDetalle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    sancionApi
      .mias()
      .then((s) => vigente && setSanciones(s))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar tus sanciones.'))
      );
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <section className="pica-card hydra-card reputacion-tarjeta" aria-labelledby="mis-sanciones">
      <h2 id="mis-sanciones">Mis sanciones</h2>
      {error ? (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      ) : sanciones === null ? (
        <p className="reputacion-ayuda" role="status">
          Cargando sanciones...
        </p>
      ) : sanciones.length === 0 ? (
        <p className="reputacion-ayuda">No tenés sanciones.</p>
      ) : (
        <ul className="reputacion-lista">
          {sanciones.map((s) => (
            <li key={s.id} className="reputacion-sancion">
              <div className="reputacion-sancion-cabecera">
                <Badge tone={GRAVEDAD[s.gravedad].tono}>{GRAVEDAD[s.gravedad].texto}</Badge>
                <span className="reputacion-ayuda">{fechaHora(s.aplicadaEn)}</span>
              </div>
              <p className="reputacion-motivo">{s.motivo}</p>
              <p className="reputacion-ayuda">
                {s.torneo}
                {s.partidoId && (
                  <>
                    {' · '}
                    <Link to={`/partidos/${s.partidoId}`}>Ver el partido</Link>
                  </>
                )}
                {' · '}Aplicada por {nombreCompleto(s.aplicadaPor)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
