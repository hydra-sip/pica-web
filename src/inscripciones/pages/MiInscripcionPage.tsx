import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { InscripcionDetalle, inscripcionApi } from '../../api/inscripcionApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Card } from '../../shared/ui';
import { AvisoInscripcionTerminada } from '../components/AvisoInscripcionTerminada';
import { HistorialReemplazos } from '../components/HistorialReemplazos';
import { MENSAJES_MI_INSCRIPCION } from '../mensajesInscripcion';
import '../inscripciones.css';

/**
 * `/inscripciones/:id`: la inscripción confirmada del capitán, con el equipo, el torneo y la nómina.
 * La individual muestra el participante y no tiene nómina. Un borrador lleva al paso 1, una pendiente
 * de pago al paso 2, y una cancelada o reintegrada muestra el aviso de que ya no participa.
 */
export const MiInscripcionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [inscripcion, setInscripcion] = useState<InscripcionDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setInscripcion(null);
    setError(null);
    inscripcionApi
      .obtener(Number(id))
      .then((detalle) => vigente && setInscripcion(detalle))
      .catch(
        (err) =>
          vigente &&
          setError(
            mensajeDeError(err, 'No se pudo cargar la inscripción.', MENSAJES_MI_INSCRIPCION)
          )
      );
    return () => {
      vigente = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="inscripcion-page">
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      </div>
    );
  }
  if (!inscripcion) {
    return (
      <div className="inscripcion-page">
        <p className="inscripcion-cargando" role="status">
          Cargando inscripción...
        </p>
      </div>
    );
  }

  if (inscripcion.estado === 'BORRADOR') {
    return <Navigate to={`/inscripciones/${inscripcion.id}/nomina`} replace />;
  }
  if (inscripcion.estado === 'PENDIENTE_PAGO') {
    return <Navigate to={`/inscripciones/${inscripcion.id}/pago`} replace />;
  }
  if (inscripcion.estado === 'CANCELADA' || inscripcion.estado === 'REINTEGRADA') {
    return <AvisoInscripcionTerminada estado={inscripcion.estado} />;
  }

  // El capitán es quien ve la pantalla: va primero y marcado, como en el paso 1.
  const capitanId = Number(user?.id);
  const nomina = [...(inscripcion.nomina ?? [])].sort(
    (a, b) => Number(b.id === capitanId) - Number(a.id === capitanId)
  );

  return (
    <div className="inscripcion-page">
      <h1>Mi inscripción</h1>
      <Card>
        <p className="inscripcion-confirmada-detalle">
          {inscripcion.equipo
            ? `Equipo: ${inscripcion.equipo.nombre}`
            : `Participante: ${user?.name}`}
        </p>
        <p className="inscripcion-confirmada-detalle">Torneo: {inscripcion.torneo.nombre}</p>
      </Card>
      {inscripcion.equipo && (
        <section>
          <ul className="nomina-lista" aria-label="Nómina">
            {nomina.map((j, i) => {
              const esCapitan = j.id === capitanId;
              return (
                <li key={j.id} className="nomina-fila">
                  <span
                    className={esCapitan ? 'nomina-avatar nomina-avatar-capitan' : 'nomina-avatar'}
                    aria-hidden="true"
                  >
                    {esCapitan ? 'C' : i + 1}
                  </span>
                  <span className="nomina-datos">
                    <strong>
                      {j.nombres} {j.apellidos}
                      {esCapitan && ' (Capitán)'}
                    </strong>
                    <small>@{j.username}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {inscripcion.equipo && <HistorialReemplazos inscripcionId={inscripcion.id} />}
    </div>
  );
};
