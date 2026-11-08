import React, { useEffect, useState } from 'react';
import { Billetera, billeteraApi } from '../../api/billeteraApi';
import { pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Field, Input } from '../../shared/ui';
import './pagoConSaldo.css';

interface MetodoDePagoProps {
  billetera: Billetera | null;
  cargando: boolean;
  /** No se pudo leer la billetera: se puede intentar pagar igual y el back decide. */
  error: boolean;
  total: number;
  /** Después de cargar saldo, para releer la billetera. */
  onCargado: () => void;
  /** Mientras se paga no se carga. */
  deshabilitado?: boolean;
}

/**
 * HU-603: se paga con el saldo de la billetera (wireframes 14 y 29: "Saldo en Billetera PICA"). Si no alcanza, dice
 * cuánto falta y deja cargarlo acá mismo, con el faltante ya puesto: así se paga sin salir del pago, sin rehacer la
 * inscripción ni volver a elegir los números.
 */
export const MetodoDePago: React.FC<MetodoDePagoProps> = ({
  billetera,
  cargando,
  error,
  total,
  onCargado,
  deshabilitado = false,
}) => {
  const faltante = billetera ? Math.max(0, total - billetera.saldoDisponible) : 0;
  const [monto, setMonto] = useState('');
  const [cargandoSaldo, setCargandoSaldo] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // el faltante cambia con cada lectura de la billetera
  useEffect(() => {
    if (faltante > 0) setMonto(String(Math.ceil(faltante)));
  }, [faltante]);

  const cargar = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Number(monto);
    if (!Number.isFinite(valor) || valor <= 0) {
      setErrorCarga('El monto tiene que ser mayor a 0.');
      return;
    }
    setCargandoSaldo(true);
    setErrorCarga(null);
    try {
      await billeteraApi.cargarSaldo(valor);
      onCargado();
    } catch (err) {
      setErrorCarga(mensajeDeError(err, 'No se pudo cargar el saldo.'));
    } finally {
      setCargandoSaldo(false);
    }
  };

  return (
    <section className="metodo-pago" aria-labelledby="metodo-pago-titulo">
      <h2 id="metodo-pago-titulo">Método de pago</h2>
      <div className="metodo-pago-opcion">
        <div>
          <strong>Saldo en tu billetera PICA</strong>
          <p>
            {cargando && !billetera
              ? 'Consultando tu saldo...'
              : billetera
                ? `Saldo disponible: ${pesos(billetera.saldoDisponible)}`
                : 'No pudimos consultar tu saldo.'}
          </p>
          <p>Débito inmediato, sin cargos adicionales.</p>
        </div>
        {billetera && (
          <Badge tone={faltante > 0 ? 'peligro' : 'exito'}>
            {faltante > 0 ? 'No alcanza' : 'Disponible'}
          </Badge>
        )}
      </div>

      {error && (
        <div className="alerta alerta-info metodo-pago-falta">
          Si tu saldo no alcanza, el pago se rechaza sin cobrarte nada.
        </div>
      )}

      {faltante > 0 && (
        <div className="metodo-pago-falta">
          <div className="alerta alerta-aviso" role="status">
            Te faltan <strong>{pesos(faltante)}</strong> para pagar {pesos(total)}.
          </div>
          <form className="carga-rapida" onSubmit={cargar}>
            <Field label="Monto a cargar (ARS)" error={errorCarga}>
              <Input
                type="number"
                min="1"
                step="any"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                disabled={cargandoSaldo || deshabilitado}
              />
            </Field>
            <Button
              type="submit"
              variant="secondary"
              loading={cargandoSaldo}
              disabled={deshabilitado}
            >
              Cargar saldo
            </Button>
          </form>
        </div>
      )}
    </section>
  );
};
