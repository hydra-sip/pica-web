import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ObjecionResumen, partidoApi } from '../../api/partidoApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge } from '../../shared/ui';
import { formatFecha } from '../../torneos/utils/formatters';
import { ESTADO_OBJECION_UI, marcadorDeVersion } from '../formato';
import '../partidos.css';

interface ObjecionesTorneoProps {
  torneoId: number;
}

/**
 * Las objeciones del torneo (HU-303, PICA-247): las pendientes primero y después las laudadas, cada una con las dos
 * versiones y el motivo, y el enlace al partido para compararlas y laudar. Lo comparten la consola del organizador y
 * la página del árbitro; el back responde 403 a quien no puede resolver objeciones.
 */
export const ObjecionesTorneo: React.FC<ObjecionesTorneoProps> = ({ torneoId }) => {
  const [objeciones, setObjeciones] = useState<ObjecionResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    partidoApi
      .objecionesDelTorneo(torneoId)
      .then((o) => vigente && setObjeciones(o))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar las objeciones.'))
      );
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  if (error) {
    return (
      <div className="alerta alerta-peligro" role="alert">
        {error}
      </div>
    );
  }
  if (!objeciones) {
    return <p className="partido-ayuda">Cargando objeciones...</p>;
  }
  if (objeciones.length === 0) {
    return <p className="partido-ayuda">No hay objeciones en este torneo.</p>;
  }

  return (
    <ul className="objeciones-lista">
      {objeciones.map((o) => (
        <li key={o.partidoId} className="objeciones-item">
          <div className="objeciones-item-titulo">
            <span>
              <span className="partido-rotulo">{o.nombreRonda}</span>
              <strong>
                {o.local} vs {o.visitante}
              </strong>
            </span>
            <Badge tone={o.decision ? 'exito' : 'aviso'}>{ESTADO_OBJECION_UI(o.decision)}</Badge>
          </div>
          <p>
            Cargó {o.cargada.equipo}: <strong>{marcadorDeVersion(o.cargada)}</strong> · Objetó{' '}
            {o.objetada.equipo}: propone <strong>{marcadorDeVersion(o.objetada)}</strong>
          </p>
          <p className="objeciones-motivo" title={o.motivo}>
            Motivo: {o.motivo}
          </p>
          <div className="objeciones-item-pie">
            <span className="partido-ayuda">Objetado el {formatFecha(o.creadaEn)}</span>
            <Link to={`/partidos/${o.partidoId}`}>{o.decision ? 'Ver' : 'Ver y resolver'}</Link>
          </div>
        </li>
      ))}
    </ul>
  );
};
