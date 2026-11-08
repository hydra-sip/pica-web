import React from 'react';
import { Link } from 'react-router-dom';
import { InscripcionDetalle } from '../../api/inscripcionApi';
import { Card } from '../../shared/ui';
import { ComprobanteInscripcion } from '../../billetera/components/ComprobanteInscripcion';
import { SaldoRestante } from '../../billetera/components/SaldoRestante';

interface InscripcionConfirmadaProps {
  inscripcion: InscripcionDetalle;
  /** Quien se inscribió, si la inscripción es individual. */
  participante: string | null;
  /** Recién pagada: muestra el saldo que quedó (HU-603). */
  recienPagada?: boolean;
}

/**
 * Pantalla final: la inscripción quedó confirmada (pagada, o confirmada sin pago en un torneo gratis). Si se pagó, el
 * comprobante y, recién pagada, el saldo que quedó (HU-603).
 */
export const InscripcionConfirmada: React.FC<InscripcionConfirmadaProps> = ({
  inscripcion,
  participante,
  recienPagada = false,
}) => (
  <div className="inscripcion-page">
    <Card className="inscripcion-confirmada">
      <span className="inscripcion-confirmada-icono" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h1>¡Inscripción confirmada!</h1>
      <p className="inscripcion-confirmada-detalle">
        {inscripcion.equipo ? `Equipo: ${inscripcion.equipo.nombre}` : participante}
      </p>
      <p className="inscripcion-confirmada-detalle">
        Torneo: {inscripcion.torneo.nombre}
      </p>
      {recienPagada && <SaldoRestante />}
      <Link to={`/inscripciones/${inscripcion.id}`} className="btn btn-primary btn-block">
        Ver mi inscripción
      </Link>
      {inscripcion.torneo.slug ? (
        <Link to={`/torneos/${inscripcion.torneo.slug}`} className="btn btn-secondary btn-block">
          Ver torneo
        </Link>
      ) : (
        <Link to="/" className="btn btn-secondary btn-block">
          Volver al inicio
        </Link>
      )}
    </Card>
    <ComprobanteInscripcion inscripcionId={inscripcion.id} />
  </div>
);
