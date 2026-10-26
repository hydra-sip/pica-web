import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { InscripcionDetalle, inscripcionApi } from '../../api/inscripcionApi';
import { torneoApi } from '../../api/torneoApi';
import { TorneoDetalle } from '../../torneos/types/torneo';
import { mensajeDeError } from '../../shared/mensajesError';
import { MENSAJES_PASO_1 } from '../mensajesInscripcion';
import { PasoEquipoNomina } from '../components/PasoEquipoNomina';
import '../inscripciones.css';

interface Datos {
  inscripcion: InscripcionDetalle;
  /** Solo se carga si la inscripción está en borrador. */
  torneo: TorneoDetalle | null;
}

/**
 * Paso 1 de la inscripción retomando un borrador (`/inscripciones/:id/nomina`). Si la inscripción ya
 * pasó del borrador, lleva al paso 2, que también muestra la inscripción confirmada.
 */
export const InscripcionNominaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);
    inscripcionApi
      .obtener(Number(id))
      .then(async (inscripcion) => {
        // Si no está en borrador no hace falta el torneo: se redirige o se avisa.
        const slug = inscripcion.torneo.slug;
        if (inscripcion.estado === 'BORRADOR' && !slug) {
          throw new Error('No se pudo cargar el torneo de la inscripción.');
        }
        const torneo =
          inscripcion.estado === 'BORRADOR' && slug ? await torneoApi.getTorneoBySlug(slug) : null;
        if (vigente) setDatos({ inscripcion, torneo });
      })
      .catch(
        (err) =>
          vigente &&
          setError(mensajeDeError(err, 'No se pudo cargar la inscripción.', MENSAJES_PASO_1))
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
  if (!datos) {
    return (
      <div className="inscripcion-page">
        <p className="inscripcion-cargando" role="status">
          Cargando inscripción...
        </p>
      </div>
    );
  }

  const { inscripcion, torneo } = datos;
  if (inscripcion.estado === 'PENDIENTE_PAGO' || inscripcion.estado === 'CONFIRMADA') {
    return <Navigate to={`/inscripciones/${inscripcion.id}/pago`} replace />;
  }
  if (inscripcion.estado !== 'BORRADOR') {
    return (
      <div className="inscripcion-page">
        <div className="alerta alerta-aviso" role="status">
          Esta inscripción está cancelada y ya no se puede modificar.
        </div>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }
  return torneo && <PasoEquipoNomina torneo={torneo} inscripcion={inscripcion} />;
};
