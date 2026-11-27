import React from 'react';
import { ReprogramacionDetalle } from '../../api/torneoApi';
import { fechaHora } from '../../shared/formato';

interface HistorialReprogramacionesProps {
  reprogramaciones: ReprogramacionDetalle[];
  /** En la consola: mientras corre el plazo, cuántos se bajaron. La ficha pública no lo muestra. */
  conRechazos?: boolean;
}

/**
 * CR-01-5 (PICA-394): los cambios de fecha del torneo, del más nuevo al más viejo, con la fecha de antes, la nueva y
 * el motivo. Sin reprogramaciones no muestra nada.
 */
export const HistorialReprogramaciones: React.FC<HistorialReprogramacionesProps> = ({
  reprogramaciones,
  conRechazos = false,
}) => {
  if (reprogramaciones.length === 0) return null;
  return (
    <section className="torneos-reprogramaciones" aria-label="Cambios de fecha">
      <h3>Cambios de fecha</h3>
      <ol>
        {[...reprogramaciones].reverse().map((r) => (
          <li key={r.id}>
            <p>
              Del <strong>{fechaHora(r.fechaInicioAnterior)}</strong> pasó al{' '}
              <strong>{fechaHora(r.fechaInicioNueva)}</strong>. Motivo: {r.motivo}
            </p>
            {r.plazoAbierto && (
              <p className="torneos-subtitulo">
                Los inscriptos pueden bajarse hasta el {fechaHora(r.rechazoHasta)}
                {conRechazos &&
                  ` · ${r.rechazos === 0 ? 'Nadie se bajó todavía' : r.rechazos === 1 ? 'Se bajó 1 inscripción' : `Se bajaron ${r.rechazos} inscripciones`}`}
                .
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};
