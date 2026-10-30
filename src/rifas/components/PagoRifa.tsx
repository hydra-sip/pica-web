import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CompraRifa, ReservaRifa } from '../../api/rifaApi';
import { fechaHora, pesos } from '../../shared/formato';
import { Button, Card, Modal } from '../../shared/ui';
import '../../inscripciones/inscripciones.css';

interface PagoRifaProps {
  /** Para el resumen de la compra. */
  rifaTitulo: string;
  /** null con el popup cerrado. */
  reserva: ReservaRifa | null;
  /** El comprobante, después de pagar. */
  compra: CompraRifa | null;
  pagando: boolean;
  error: string | null;
  onPagar: () => void;
  onCancelar: () => void;
  onCerrar: () => void;
}

/** Lo que falta para `hasta`, en segundos y actualizado cada segundo. */
const useSegundosHasta = (hasta: string | null): number => {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!hasta) return undefined;
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [hasta]);
  return hasta ? Math.max(0, Math.floor((new Date(hasta).getTime() - ahora) / 1000)) : 0;
};

const reloj = (segundos: number): string =>
  `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

/** La garantía de custodia, con el mismo formato que en la inscripción al torneo. */
const Custodia: React.FC = () => (
  <section className="custodia">
    <span className="custodia-icono" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
      </svg>
    </span>
    <div>
      <h2>Garantía de fondos en custodia</h2>
      <p>
        El dinero queda retenido de forma segura en la plataforma hasta el sorteo, o se reintegra si
        la rifa se cancela.
      </p>
    </div>
  </section>
);

/**
 * El pago simulado de la compra (PICA-223): con los números ya reservados muestra lo que se cobra y cuánto queda de
 * la reserva, con los estilos de "Confirmar y pagar" de la inscripción (HU-406). Confirmar hace el cobro, como lo
 * hará la pasarela; después muestra el comprobante.
 */
export const PagoRifa: React.FC<PagoRifaProps> = ({
  rifaTitulo,
  reserva,
  compra,
  pagando,
  error,
  onPagar,
  onCancelar,
  onCerrar,
}) => {
  const segundos = useSegundosHasta(compra ? null : (reserva?.venceEn ?? null));
  const vencida = !compra && reserva !== null && segundos === 0;

  if (compra) {
    return (
      <Modal
        isOpen
        title="¡Compra confirmada!"
        onClose={onCerrar}
        footer={
          <>
            <Button variant="secondary" onClick={onCerrar}>
              Listo
            </Button>
            {/* HU-404: el ticket digital con la numeración y el comprobante */}
            <Link to={`/tickets/${compra.ticketId}`} className="btn btn-primary">
              Ver mi ticket
            </Link>
          </>
        }
      >
        <Card className="resumen-pago">
          <h2>Comprobante</h2>
          <p className="resumen-pago-detalle">
            {rifaTitulo} • <span className="pago-codigo">{compra.ticketCodigo}</span>
          </p>
          <dl className="resumen-pago-lineas">
            <div>
              <dt>Tus números</dt>
              <dd>{compra.numeros.join(', ')}</dd>
            </div>
            <div>
              <dt>Números</dt>
              <dd>{pesos(compra.monto)}</dd>
            </div>
            <div>
              <dt>Gastos administrativos</dt>
              <dd>{pesos(compra.gastosAdministrativos)}</dd>
            </div>
            <div className="resumen-pago-total">
              <dt>Pagaste</dt>
              <dd>{pesos(compra.total)}</dd>
            </div>
          </dl>
          <p className="resumen-pago-extra">Fecha: {fechaHora(compra.compradoEn)}</p>
        </Card>
      </Modal>
    );
  }

  if (!reserva) {
    return null;
  }

  return (
    <Modal isOpen title="Confirmar y pagar" onClose={onCancelar} closeDisabled={pagando}>
      <div className="pago-rifa">
        <div className="alerta alerta-info">
          <strong>Pago simulado.</strong> Esta pantalla es temporal: más adelante, al confirmar, se
          va a redirigir a la plataforma de pago.
        </div>

        <Card className="resumen-pago">
          <h2>Resumen de compra</h2>
          <p className="resumen-pago-detalle">
            {rifaTitulo} • Números: {reserva.numeros.join(', ')}
          </p>
          <dl className="resumen-pago-lineas">
            <div>
              <dt>
                {reserva.numeros.length} × {pesos(reserva.precioNumero)}
              </dt>
              <dd>{pesos(reserva.monto)}</dd>
            </div>
            {reserva.gastosAdministrativos > 0 && (
              <div>
                <dt>Gastos administrativos</dt>
                <dd>{pesos(reserva.gastosAdministrativos)}</dd>
              </div>
            )}
            <div className="resumen-pago-total">
              <dt>Total a pagar</dt>
              <dd>{pesos(reserva.total)}</dd>
            </div>
          </dl>
          <p className={`resumen-pago-extra pago-reloj${vencida ? ' vencida' : ''}`} role="status">
            {vencida
              ? 'Se terminó el tiempo de la reserva: los números volvieron a estar disponibles.'
              : `Tus números quedan reservados ${reloj(segundos)} mientras pagás.`}
          </p>
        </Card>

        <Custodia />

        {error && (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        )}

        <div className="inscripcion-acciones">
          <Button block onClick={onPagar} loading={pagando} disabled={vencida}>
            {pagando ? 'Confirmando el pago...' : `Confirmar pago de ${pesos(reserva.total)}`}
          </Button>
          <Button variant="secondary" block onClick={onCancelar} disabled={pagando}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
