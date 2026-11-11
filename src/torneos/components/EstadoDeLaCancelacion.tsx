import React, { useEffect, useState } from 'react';
import { CancelacionDelTorneo, cancelacionApi } from '../../api/cancelacionApi';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Card } from '../../shared/ui';

interface EstadoDeLaCancelacionProps {
  torneoId: number;
  enRevision: boolean;
}

/** 86,36: lo devuelto sobre lo que había en custodia, con hasta dos decimales. */
const porcentajeDevuelto = (c: CancelacionDelTorneo): string => {
  const total = c.reintegrado + c.retenido;
  if (total === 0 || c.retenido === 0) return '100';
  return (Math.round((c.reintegrado / total) * 10000) / 100).toString().replace('.', ',');
};

const resolucion = (c: CancelacionDelTorneo): string => {
  switch (c.estado) {
    case 'AUTOMATICA':
      return `Sin gastos: se devolvió todo en el momento (${fechaHora(c.pedidaEn)}).`;
    case 'APROBADA':
      return `Soporte aprobó los gastos el ${fechaHora(c.revisadaEn)}.`;
    case 'RECHAZADA':
      return `Soporte rechazó los gastos el ${fechaHora(c.revisadaEn)}: ${c.motivoRechazo}`;
    default:
      return '';
  }
};

/**
 * HU-605 (wireframe «Consola Torneo Cancelado»): lo que pasó con la cancelación, en solo lectura. En revisión, que
 * soporte está revisando y los gastos que se declararon; cancelado, el porcentaje devuelto, quién resolvió y el balance.
 */
export const EstadoDeLaCancelacion: React.FC<EstadoDeLaCancelacionProps> = ({
  torneoId,
  enRevision,
}) => {
  const [cancelacion, setCancelacion] = useState<CancelacionDelTorneo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cancelacionApi
      .detalle(torneoId)
      .then(setCancelacion)
      .catch((err) => setError(mensajeDeError(err, 'No se pudo leer la cancelación.')));
  }, [torneoId, enRevision]);

  if (error) {
    return (
      <div className="alerta alerta-peligro" role="alert">
        {error}
      </div>
    );
  }

  const aviso = enRevision
    ? 'Soporte está revisando los gastos que declaraste. Hasta que decida, la plata sigue en custodia y no se devuelve nada.'
    : cancelacion?.estado
      ? `Torneo cancelado. Reintegro del ${porcentajeDevuelto(cancelacion)} % ejecutado.`
      : 'Torneo cancelado.';

  return (
    <>
      <div className={`alerta ${enRevision ? 'alerta-aviso' : 'alerta-info'}`} role="status">
        {aviso}
      </div>
      {cancelacion?.estado && (
        <Card>
          <div className="torneos-tarjeta-titulo">
            <h2>{enRevision ? 'Cancelación en revisión' : 'Detalle de la cancelación'}</h2>
          </div>
          <h3 className="torneos-cancelacion-subtitulo">Motivo</h3>
          <p>{cancelacion.motivo}</p>
          <p className="torneos-subtitulo">Pedida el {fechaHora(cancelacion.pedidaEn)}</p>
          {!enRevision && <p>{resolucion(cancelacion)}</p>}

          {cancelacion.gastos.length > 0 && (
            <>
              <h3 className="torneos-cancelacion-subtitulo">
                {enRevision ? 'Gastos que declaraste' : 'Gastos declarados'}
              </h3>
              <ul className="torneos-cancelacion-lista">
                {cancelacion.gastos.map((g, i) => (
                  <li key={i}>
                    <span>{g.concepto}</span>
                    <span>{pesos(g.monto)}</span>
                  </li>
                ))}
                <li className="torneos-cancelacion-total">
                  <span>Total</span>
                  <span>{pesos(cancelacion.totalGastos)}</span>
                </li>
              </ul>
            </>
          )}

          {!enRevision && (
            <>
              <h3 className="torneos-cancelacion-subtitulo">Balance del reintegro</h3>
              <ul className="torneos-cancelacion-lista">
                <li>
                  <span>Inscripciones recaudadas</span>
                  <span>{pesos(cancelacion.pozo)}</span>
                </li>
                <li>
                  <span>Gastos retenidos para vos</span>
                  <span>{pesos(cancelacion.retenido)}</span>
                </li>
                <li className="torneos-cancelacion-total">
                  <span>Total reintegrado a los participantes</span>
                  <span>{pesos(cancelacion.reintegrado)}</span>
                </li>
              </ul>
            </>
          )}
        </Card>
      )}
    </>
  );
};
