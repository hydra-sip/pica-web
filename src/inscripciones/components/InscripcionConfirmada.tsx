import React from 'react';
import { Link } from 'react-router-dom';
import { InscripcionDetalle } from '../../api/inscripcionApi';
import { Card } from '../../shared/ui';

interface InscripcionConfirmadaProps {
  inscripcion: InscripcionDetalle;
  /** Quien se inscribió, si la inscripción es individual. */
  participante: string | null;
}

/** Pantalla final: la inscripción quedó confirmada (pagada, o confirmada sin pago en un torneo gratis). */
export const InscripcionConfirmada: React.FC<InscripcionConfirmadaProps> = ({
  inscripcion,
  participante,
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
      {/* TODO (PICA-198): llevar al detalle del torneo cuando tenga ruta; hasta entonces, al inicio. */}
      <Link to="/" className="btn btn-primary btn-block">
        Volver al inicio
      </Link>
    </Card>
  </div>
);
