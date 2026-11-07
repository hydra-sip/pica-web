import React from 'react';
import { Link } from 'react-router-dom';
import { EstadoInscripcion } from '../../api/inscripcionApi';

interface AvisoInscripcionTerminadaProps {
  estado: Extract<EstadoInscripcion, 'CANCELADA' | 'REINTEGRADA'>;
  /** Por qué se llegó acá, si fue por un rechazo del back (por ejemplo, al intentar un reemplazo). */
  motivo?: string | null;
  /** El del torneo, para volver a su ficha; sin él, al inicio. */
  slug?: string | null;
}

/** Una inscripción que ya no participa: cancelada, o con el pago reintegrado. */
export const AvisoInscripcionTerminada: React.FC<AvisoInscripcionTerminadaProps> = ({
  estado,
  motivo,
  slug,
}) => (
  <div className="inscripcion-page">
    {motivo && (
      <div className="alerta alerta-peligro" role="alert">
        {motivo}
      </div>
    )}
    <div className="alerta alerta-aviso" role="status">
      {estado === 'CANCELADA'
        ? 'Esta inscripción fue cancelada, así que ya no se puede pagar.'
        : 'A esta inscripción ya se le reintegró el pago.'}
    </div>
    {slug ? (
      <Link to={`/torneos/${slug}`} className="btn btn-secondary btn-block">
        Ver torneo
      </Link>
    ) : (
      <Link to="/" className="btn btn-secondary btn-block">
        Volver al inicio
      </Link>
    )}
  </div>
);
