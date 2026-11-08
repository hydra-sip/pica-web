import React, { useEffect, useState } from 'react';
import { CustodiaResumen, EventoCustodia, custodiaApi } from '../../api/custodiaApi';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Button, Card } from '../../shared/ui';
import '../../inscripciones/inscripciones.css';
import './pagoConSaldo.css';

interface CustodiaDelEventoProps {
  evento: EventoCustodia;
  id: number;
}

const ESTADO: Record<CustodiaResumen['estado'], { texto: string; tono: BadgeTone }> = {
  RETENIDA: { texto: 'En custodia', tono: 'aviso' },
  LIBERADA: { texto: 'Liquidada', tono: 'exito' },
  REINTEGRADA: { texto: 'Reintegrada', tono: 'info' },
};

/**
 * HU-603, para el organizador: lo que cobró su torneo o su rifa y que sigue en custodia. "Retirar fondos" pasa por la
 * misma regla que la liquidación y antes del cierre responde que los fondos están en custodia. Si no se puede leer
 * (no es el organizador), no se muestra.
 */
export const CustodiaDelEvento: React.FC<CustodiaDelEventoProps> = ({ evento, id }) => {
  const [custodia, setCustodia] = useState<CustodiaResumen | null>(null);
  const [retirando, setRetirando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    custodiaApi
      .obtener(evento, id)
      .then((c) => vigente && setCustodia(c))
      .catch(() => vigente && setCustodia(null));
    return () => {
      vigente = false;
    };
  }, [evento, id]);

  if (!custodia) return null;

  const retirar = async () => {
    setRetirando(true);
    setAviso(null);
    try {
      await custodiaApi.retirar(evento, id);
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudieron retirar los fondos.'));
    } finally {
      setRetirando(false);
    }
  };

  const delEvento = evento === 'torneos' ? 'el torneo' : 'el plazo de reclamo de la rifa';
  const estado = ESTADO[custodia.estado];

  return (
    <Card as="section" className="resumen-pago custodia-evento" aria-label="Fondos en custodia">
      <h2>Fondos en custodia</h2>
      <p className="resumen-pago-detalle">
        <Badge tone={estado.tono}>{estado.texto}</Badge>{' '}
        {custodia.pagos === 1 ? '1 pago' : `${custodia.pagos} pagos`}
        {custodia.liberadaEn && ` • ${fechaHora(custodia.liberadaEn)}`}
      </p>
      <dl className="resumen-pago-lineas">
        <div>
          <dt>{evento === 'torneos' ? 'Inscripciones' : 'Números vendidos'}</dt>
          <dd>{pesos(custodia.recaudado)}</dd>
        </div>
        <div>
          <dt>Gastos administrativos</dt>
          <dd>{pesos(custodia.gastosAdministrativos)}</dd>
        </div>
        <div className="resumen-pago-total">
          <dt>Total retenido</dt>
          <dd>{pesos(custodia.total)}</dd>
        </div>
      </dl>
      <p className="custodia-evento-nota">
        {custodia.estado === 'RETENIDA'
          ? `Nadie puede mover estos fondos hasta que termine ${delEvento}, tampoco vos. Al terminar, la liquidación reparte los premios y acredita lo tuyo en tu billetera.`
          : 'La custodia ya se cerró: lo que te corresponde está en tu billetera.'}
      </p>
      {aviso && (
        <div className="alerta alerta-aviso" role="alert">
          {aviso}
        </div>
      )}
      <div className="custodia-evento-acciones">
        <Button variant="secondary" loading={retirando} onClick={() => void retirar()}>
          Retirar fondos
        </Button>
      </div>
    </Card>
  );
};
