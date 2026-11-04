import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MiDesignacion, torneoApi } from '../../api/torneoApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Card } from '../../shared/ui';
import { IconoAlerta, IconoEscudo } from '../../shared/ui/Iconos';
import { ESTADO_DESIGNACION, periodo } from '../designaciones';
import '../torneos.css';

/**
 * "Mis designaciones" (HU-807, PICA-315): los torneos donde te designaron árbitro, las que esperan respuesta
 * primero. Cada una se responde en su pantalla (wireframes 48 y 49).
 */
export const MisDesignacionesPage: React.FC = () => {
  const [designaciones, setDesignaciones] = useState<MiDesignacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    torneoApi
      .misDesignaciones()
      .then((d) => vigente && setDesignaciones(d))
      .catch(
        (err) =>
          vigente && setError(mensajeDeError(err, 'No se pudieron cargar tus designaciones.'))
      );
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <div className="torneos-page">
      <header className="torneos-encabezado">
        <div>
          <div className="torneos-titulo-con-chip">
            <h1>Mis designaciones</h1>
          </div>
          <p className="torneos-subtitulo">
            Los torneos donde te designaron árbitro. Hasta que aceptes no podés cargar resultados ni
            resolver objeciones.
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>{error}</span>
        </div>
      )}

      {designaciones === null && !error && <p>Cargando tus designaciones...</p>}

      {designaciones?.length === 0 && (
        <Card className="torneos-vacio">
          <IconoEscudo size={36} />
          <h2>No tenés designaciones</h2>
          <p>Cuando un organizador te designe árbitro de un torneo, lo vas a ver acá.</p>
        </Card>
      )}

      {designaciones && designaciones.length > 0 && (
        <ul className="designaciones-lista">
          {designaciones.map((d) => (
            <li key={d.torneoId}>
              <Card className="designacion">
                <div className="designacion-cabecera">
                  <h2>{d.torneo}</h2>
                  <Badge tone={ESTADO_DESIGNACION[d.estado].tono}>
                    {ESTADO_DESIGNACION[d.estado].texto}
                  </Badge>
                </div>
                <p className="designacion-dato">
                  {d.disciplina} · Organiza {d.organizador} · {periodo(d)}
                </p>
                <div className="designacion-acciones">
                  <Link
                    to={`/mis-designaciones/${d.torneoId}`}
                    className={`btn ${d.estado === 'PENDIENTE' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {d.estado === 'PENDIENTE' ? 'Responder' : 'Ver designación'}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
