import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { InscripcionDetalle, inscripcionApi, ResumenPago } from '../../api/inscripcionApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { InscripcionConfirmada } from '../components/InscripcionConfirmada';
import { ResumenDePago } from '../components/ResumenDePago';
import '../inscripciones.css';

/**
 * `/inscripciones/:id/pago`: según el estado de la inscripción es el paso 2 (pendiente de pago),
 * la pantalla final (confirmada), una vuelta al paso 1 (borrador) o un aviso (cancelada).
 */
export const InscripcionPagoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [inscripcion, setInscripcion] = useState<InscripcionDetalle | null>(null);
  const [resumen, setResumen] = useState<ResumenPago | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setInscripcion(null);
    setResumen(null);
    setError(null);
    (async () => {
      try {
        const detalle = await inscripcionApi.obtener(Number(id));
        const pago =
          detalle.estado === 'PENDIENTE_PAGO' ? await inscripcionApi.resumenPago(detalle.id) : null;
        if (vigente) {
          setInscripcion(detalle);
          setResumen(pago);
        }
      } catch (err) {
        if (vigente) setError(mensajeDeError(err, 'No se pudo cargar la inscripción.'));
      }
    })();
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
  if (!inscripcion) return <p className="inscripcion-cargando">Cargando inscripción...</p>;

  switch (inscripcion.estado) {
    case 'BORRADOR':
      return <Navigate to={`/inscripciones/${inscripcion.id}/nomina`} replace />;

    case 'PENDIENTE_PAGO':
      return resumen ? (
        <ResumenDePago resumen={resumen} onPagada={setInscripcion} />
      ) : (
        <p className="inscripcion-cargando">Cargando inscripción...</p>
      );

    case 'CONFIRMADA':
      return (
        <InscripcionConfirmada
          inscripcion={inscripcion}
          participante={user?.name ? `Participante: ${user.name}` : null}
          torneo={resumen?.torneo.nombre ?? null}
        />
      );

    default:
      return (
        <div className="inscripcion-page">
          <div className="alerta alerta-aviso" role="alert">
            {inscripcion.estado === 'CANCELADA'
              ? 'Esta inscripción fue cancelada, así que ya no se puede pagar.'
              : 'A esta inscripción ya se le reintegró el pago.'}
          </div>
          <Link to="/" className="btn btn-secondary btn-block">
            Volver al inicio
          </Link>
        </div>
      );
  }
};
