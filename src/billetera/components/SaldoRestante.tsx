import React from 'react';
import { pesos } from '../../shared/formato';
import { useSaldo } from '../hooks/useSaldo';
import './pagoConSaldo.css';

/** HU-603: después de pagar, el saldo que quedó y lo que está en custodia. */
export const SaldoRestante: React.FC = () => {
  const { billetera } = useSaldo();
  if (!billetera) return null;
  return (
    <p className="pago-saldo-restante" role="status">
      Te quedan <strong>{pesos(billetera.saldoDisponible)}</strong> disponibles y{' '}
      <strong>{pesos(billetera.saldoRetenido)}</strong> en custodia.
    </p>
  );
};
