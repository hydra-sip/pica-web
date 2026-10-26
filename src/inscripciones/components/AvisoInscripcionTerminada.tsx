import React from 'react';
import { Link } from 'react-router-dom';
import { EstadoInscripcion } from '../../api/inscripcionApi';

interface AvisoInscripcionTerminadaProps {
  estado: Extract<EstadoInscripcion, 'CANCELADA' | 'REINTEGRADA'>;
}

/** Una inscripción que ya no participa: cancelada, o con el pago reintegrado. */
export const AvisoInscripcionTerminada: React.FC<AvisoInscripcionTerminadaProps> = ({ estado }) => (
  <div className="inscripcion-page">
    <div className="alerta alerta-aviso" role="status">
      {estado === 'CANCELADA'
        ? 'Esta inscripción fue cancelada, así que ya no se puede pagar.'
        : 'A esta inscripción ya se le reintegró el pago.'}
    </div>
    <Link to="/" className="btn btn-secondary btn-block">
      Volver al inicio
    </Link>
  </div>
);
