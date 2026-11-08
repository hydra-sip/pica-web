import React, { useEffect, useState } from 'react';
import { ComprobantePago, custodiaApi } from '../../api/custodiaApi';
import { fechaHora, pesos } from '../../shared/formato';
import { Card } from '../../shared/ui';
import '../../inscripciones/inscripciones.css';
import './pagoConSaldo.css';

interface ComprobanteInscripcionProps {
  inscripcionId: number;
}

const CUSTODIA: Record<string, string> = {
  RETENIDA: 'En custodia hasta que termine el torneo',
  LIBERADA: 'Liquidado',
  REINTEGRADA: 'Reintegrado',
};

/**
 * HU-603: el comprobante del pago de la inscripción, con lo que quedó en custodia. Sin pago (un torneo sin costo) o
 * si no se pudo leer, no se muestra.
 */
export const ComprobanteInscripcion: React.FC<ComprobanteInscripcionProps> = ({
  inscripcionId,
}) => {
  const [comprobante, setComprobante] = useState<ComprobantePago | null>(null);

  useEffect(() => {
    let vigente = true;
    custodiaApi
      .comprobanteDeInscripcion(inscripcionId)
      .then((c) => vigente && setComprobante(c))
      .catch(() => vigente && setComprobante(null));
    return () => {
      vigente = false;
    };
  }, [inscripcionId]);

  if (!comprobante) return null;

  return (
    <Card as="section" className="resumen-pago comprobante-pago" aria-label="Comprobante de pago">
      <h2>Comprobante de pago</h2>
      <p className="resumen-pago-detalle">
        N.º <span className="pago-codigo">{comprobante.numero}</span> •{' '}
        {fechaHora(comprobante.pagadoEn)}
      </p>
      <dl className="resumen-pago-lineas">
        <div>
          <dt>Pagó</dt>
          <dd>{comprobante.pagadorNombre}</dd>
        </div>
        <div>
          <dt>Concepto</dt>
          <dd>{comprobante.concepto}</dd>
        </div>
        <div>
          <dt>Cuota de inscripción</dt>
          <dd>{pesos(comprobante.monto)}</dd>
        </div>
        {comprobante.gastosAdministrativos > 0 && (
          <div>
            <dt>Gastos administrativos</dt>
            <dd>{pesos(comprobante.gastosAdministrativos)}</dd>
          </div>
        )}
        <div className="resumen-pago-total">
          <dt>Pagaste</dt>
          <dd>{pesos(comprobante.total)}</dd>
        </div>
      </dl>
      {comprobante.custodia && (
        <p className="resumen-pago-extra">Fondos: {CUSTODIA[comprobante.custodia]}</p>
      )}
    </Card>
  );
};
