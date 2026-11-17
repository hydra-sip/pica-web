import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SancionDetalle, sancionApi } from '../../api/sancionApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Card, Table } from '../../shared/ui';
import { GRAVEDAD, nombreCompleto } from '../formato';

interface SancionesDelTorneoProps {
  torneoId: number;
  /** Cambia para volver a pedirlas: por ejemplo, después de sancionar desde la lista de inscriptos. */
  recarga: number;
}

/** HU-803 (T803-2, wireframe 43 simplificado): las sanciones del torneo en la consola, la más reciente primero. */
export const SancionesDelTorneo: React.FC<SancionesDelTorneoProps> = ({ torneoId, recarga }) => {
  const [sanciones, setSanciones] = useState<SancionDetalle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);
    sancionApi
      .delTorneo(torneoId)
      .then((s) => vigente && setSanciones(s))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar las sanciones.'))
      );
    return () => {
      vigente = false;
    };
  }, [torneoId, recarga]);

  return (
    <Card>
      <div className="torneos-tarjeta-titulo">
        <h2>Sanciones</h2>
      </div>
      {error ? (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      ) : sanciones === null ? (
        <p className="torneos-vacio" role="status">
          Cargando sanciones...
        </p>
      ) : sanciones.length === 0 ? (
        <p className="torneos-vacio">
          Nadie fue sancionado en este torneo. Se sanciona desde la lista de inscriptos o desde la
          ficha de un partido.
        </p>
      ) : (
        <Table caption="Sanciones del torneo">
          <thead>
            <tr>
              <th scope="col">Jugador</th>
              <th scope="col">Gravedad</th>
              <th scope="col">Motivo</th>
              <th scope="col">Aplicada por</th>
              <th scope="col">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {sanciones.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="torneos-nombre-fila">{nombreCompleto(s.jugador)}</span>
                  <span className="torneos-celda-secundaria">@{s.jugador.username}</span>
                </td>
                <td>
                  <Badge tone={GRAVEDAD[s.gravedad].tono}>{GRAVEDAD[s.gravedad].texto}</Badge>
                </td>
                <td>
                  {s.motivo}
                  {s.partidoId && (
                    <span className="torneos-celda-secundaria">
                      <Link to={`/partidos/${s.partidoId}`}>Ver el partido</Link>
                    </span>
                  )}
                </td>
                <td>{nombreCompleto(s.aplicadaPor)}</td>
                <td>{fechaHora(s.aplicadaEn)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
};
