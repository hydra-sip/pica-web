import React, { useEffect, useState } from 'react';
import {
  billeteraApi,
  CuentaBancaria,
  LimitesRetiro,
  SolicitarRetiroRequest,
} from '../../api/billeteraApi';
import { pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Modal } from '../../shared/ui';
import { IconoAlerta } from '../../shared/ui/Iconos';

interface ModalRetiroProps {
  isOpen: boolean;
  onClose: () => void;
  saldoDisponible: number;
  cuentasValidadas: CuentaBancaria[];
  limites: LimitesRetiro;
  onRetiroExitoso: (monto: number) => void;
  onAbrirAgregarCuenta?: () => void;
}

export const ModalRetiro: React.FC<ModalRetiroProps> = ({
  isOpen,
  onClose,
  saldoDisponible,
  cuentasValidadas,
  limites,
  onRetiroExitoso,
  onAbrirAgregarCuenta,
}) => {
  const [cuentaId, setCuentaId] = useState<number | ''>('');
  const [montoInput, setMontoInput] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Seleccionar automáticamente la primera cuenta validada al abrir
  useEffect(() => {
    if (isOpen) {
      if (cuentasValidadas.length > 0 && !cuentaId) {
        setCuentaId(cuentasValidadas[0].id);
      }
      setMontoInput('');
      setErrorModal(null);
    }
  }, [isOpen, cuentasValidadas, cuentaId]);

  const montoNum = parseFloat(montoInput);
  const montoValido = !isNaN(montoNum) && montoNum > 0;

  // Validaciones reactivas
  const superaDisponible = montoValido && montoNum > saldoDisponible;
  const menorAlMinimo = montoValido && montoNum < limites.minimo;
  const mayorAlMaximo = montoValido && montoNum > limites.maximo;
  const fueraDeTopes = menorAlMinimo || mayorAlMaximo;

  const botonDeshabilitado =
    guardando ||
    !cuentaId ||
    !montoValido ||
    superaDisponible ||
    fueraDeTopes ||
    cuentasValidadas.length === 0;

  const handleSolicitarRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);

    if (botonDeshabilitado) return;

    setGuardando(true);
    try {
      const payload: SolicitarRetiroRequest = {
        cuentaId: Number(cuentaId),
        monto: montoNum,
      };
      await billeteraApi.solicitarRetiro(payload);
      onRetiroExitoso(montoNum);
      onClose();
    } catch (err) {
      setErrorModal(
        mensajeDeError(err, 'No se pudo procesar la solicitud de retiro.', {
          SALDO_INSUFICIENTE:
            'El saldo disponible no alcanza para el retiro solicitado. Los fondos retenidos en custodia no se pueden movilizar.',
        })
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!guardando) onClose();
      }}
      title="Retirar fondos"
      closeDisabled={guardando}
    >
      <form onSubmit={handleSolicitarRetiro} className="billetera-modal-form">
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          Ingresá el monto a transferir hacia tu cuenta bancaria validada.
        </p>

        {errorModal && (
          <div role="alert" className="alerta alerta-peligro">
            <IconoAlerta size={18} />
            <span>{errorModal}</span>
          </div>
        )}

        {/* Advertencia si no hay cuentas validadas */}
        {cuentasValidadas.length === 0 ? (
          <div role="alert" className="alerta alerta-aviso">
            <IconoAlerta size={18} />
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                No tenés cuentas bancarias validadas para retirar fondos.
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)' }}>
                Primero debés agregar una cuenta a tu nombre y esperar su validación.
              </p>
            </div>
          </div>
        ) : (
          <div className="billetera-modal-campo">
            <label htmlFor="retiro-cuenta">Cuenta bancaria destino *</label>
            <select
              id="retiro-cuenta"
              value={cuentaId}
              onChange={(e) => setCuentaId(Number(e.target.value))}
              disabled={guardando}
              required
            >
              {cuentasValidadas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tipo}: {c.valor} ({c.titular})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Indicadores de topes y saldo disponible */}
        <div className="billetera-retiro-detalles">
          <div className="billetera-retiro-detalle-item">
            <span className="detalle-etiqueta">Saldo disponible:</span>
            <strong className="detalle-valor-disponible">{pesos(saldoDisponible)}</strong>
          </div>
          <div className="billetera-retiro-detalle-item">
            <span className="detalle-etiqueta">Límites permitidos:</span>
            <span className="detalle-valor-topes">
              Mínimo {pesos(limites.minimo)} · Máximo {pesos(limites.maximo)}
            </span>
          </div>
        </div>

        {/* Input Monto */}
        <div className="billetera-modal-campo">
          <label htmlFor="monto-retiro">Monto a retirar (ARS) *</label>
          <input
            id="monto-retiro"
            type="number"
            step="any"
            min={limites.minimo}
            max={Math.min(limites.maximo, saldoDisponible)}
            required
            placeholder={`Ej: ${limites.minimo}`}
            value={montoInput}
            onChange={(e) => setMontoInput(e.target.value)}
            disabled={guardando || cuentasValidadas.length === 0}
            autoFocus={cuentasValidadas.length > 0}
          />
        </div>

        {/* Advertencia si está fuera de topes (mínimo o máximo) */}
        {fueraDeTopes && (
          <div role="alert" className="alerta alerta-aviso">
            <IconoAlerta size={18} />
            <span>
              {menorAlMinimo
                ? `El monto mínimo de retiro permitido es de ${pesos(limites.minimo)}.`
                : `El monto máximo de retiro permitido es de ${pesos(limites.maximo)}.`}
            </span>
          </div>
        )}

        {/* Alerta si supera el saldo disponible (advertencia de custodia) */}
        {superaDisponible && (
          <div role="alert" className="alerta alerta-peligro">
            <IconoAlerta size={18} />
            <span>
              El monto supera el saldo disponible. Los fondos retenidos en custodia no se pueden
              movilizar.
            </span>
          </div>
        )}

        <div className="billetera-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>
          {cuentasValidadas.length === 0 && onAbrirAgregarCuenta ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onAbrirAgregarCuenta();
              }}
            >
              Agregar cuenta
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={botonDeshabilitado}
            >
              {guardando ? 'Procesando retiro...' : 'Confirmar retiro'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
