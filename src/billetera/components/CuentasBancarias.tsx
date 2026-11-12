import React, { useState } from 'react';
import {
  billeteraApi,
  CrearCuentaBancariaRequest,
  CuentaBancaria,
  TipoCuenta,
} from '../../api/billeteraApi';
import { erroresDelFormulario, mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Card, Modal } from '../../shared/ui';
import { IconoAlerta, IconoBasura, IconoCheck, IconoRefrescar } from '../../shared/ui/Iconos';

interface CuentasBancariasProps {
  cuentas: CuentaBancaria[];
  cargando: boolean;
  onCuentaAgregada: () => void;
  onCuentaEliminada: () => void;
  deshabilitado?: boolean;
}

const tonoValidacion = (estado: string): BadgeTone => {
  switch (estado) {
    case 'VALIDADA':
      return 'exito';
    case 'PENDIENTE':
      return 'aviso';
    case 'RECHAZADA':
      return 'peligro';
    default:
      return 'neutral';
  }
};

const labelValidacion = (estado: string): string => {
  switch (estado) {
    case 'VALIDADA':
      return 'Validada';
    case 'PENDIENTE':
      return 'Pendiente';
    case 'RECHAZADA':
      return 'Rechazada';
    default:
      return estado;
  }
};

export const CuentasBancarias: React.FC<CuentasBancariasProps> = ({
  cuentas,
  cargando,
  onCuentaAgregada,
  onCuentaEliminada,
  deshabilitado = false,
}) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoCuenta>('CBU');
  const [valor, setValor] = useState('');
  const [titular, setTitular] = useState('');
  const [cuitCuil, setCuitCuil] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({});
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const abrirModal = () => {
    setTipo('CBU');
    setValor('');
    setTitular('');
    setCuitCuil('');
    setErrorModal(null);
    setErroresCampos({});
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
    setErrorModal(null);
    setErroresCampos({});
  };

  const handleCrearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    setErroresCampos({});
    setErrorGlobal(null);
    setMensajeExito(null);

    // Validaciones preventivas básicas en front
    const errores: Record<string, string> = {};
    if (!valor.trim()) {
      errores.valor = 'El CBU, CVU o alias es obligatorio.';
    } else if ((tipo === 'CBU' || tipo === 'CVU') && !/^\d{22}$/.test(valor.trim())) {
      errores.valor = 'Debe contener exactamente 22 dígitos.';
    } else if (tipo === 'ALIAS' && !/^[a-zA-Z0-9.-]{6,20}$/.test(valor.trim())) {
      errores.valor = 'Debe tener entre 6 y 20 caracteres alfanuméricos, puntos o guiones.';
    }

    if (!titular.trim()) {
      errores.titular = 'El nombre del titular es obligatorio.';
    }

    if (!cuitCuil.trim()) {
      errores.cuitCuil = 'El CUIT/CUIL es obligatorio.';
    } else if (!/^\d{11}$/.test(cuitCuil.trim())) {
      errores.cuitCuil = 'El CUIT/CUIL debe contener exactamente 11 dígitos.';
    }

    if (Object.keys(errores).length > 0) {
      setErroresCampos(errores);
      return;
    }

    setGuardando(true);
    try {
      const payload: CrearCuentaBancariaRequest = {
        tipo,
        valor: valor.trim(),
        titular: titular.trim(),
        cuitCuil: cuitCuil.trim(),
      };
      await billeteraApi.crearCuenta(payload);
      setModalAbierto(false);
      setMensajeExito('Cuenta bancaria agregada y validada con éxito.');
      onCuentaAgregada();
    } catch (err) {
      const mapeoErrores = erroresDelFormulario(err, {
        CUENTA_TITULAR_NO_COINCIDE: 'cuitCuil',
        CUENTA_BANCARIA_DUPLICADA: 'valor',
      });
      setErroresCampos(mapeoErrores);
      setErrorModal(
        mensajeDeError(err, 'No se pudo registrar la cuenta bancaria.', {
          CUENTA_TITULAR_NO_COINCIDE:
            'La cuenta destino debe estar a nombre del titular verificado en la plataforma',
        })
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (eliminandoId) return;
    setErrorGlobal(null);
    setMensajeExito(null);
    setEliminandoId(id);
    try {
      await billeteraApi.eliminarCuenta(id);
      setMensajeExito('Cuenta bancaria eliminada.');
      onCuentaEliminada();
    } catch (err) {
      setErrorGlobal(mensajeDeError(err, 'No se pudo eliminar la cuenta bancaria.'));
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <section className="billetera-cuentas-seccion" aria-label="Cuentas bancarias">
      <div className="billetera-cuentas-header">
        <div>
          <h2 className="billetera-seccion-titulo">Cuentas bancarias</h2>
          <p className="billetera-cuentas-subtitulo">
            Cuentas registradas para el retiro de tus fondos disponibles.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={abrirModal}
          disabled={deshabilitado}
        >
          + Agregar cuenta
        </button>
      </div>

      {mensajeExito && (
        <div role="status" className="alerta alerta-exito">
          <IconoCheck size={18} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {errorGlobal && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={18} />
          <span>{errorGlobal}</span>
        </div>
      )}

      {cargando && cuentas.length === 0 ? (
        <div className="billetera-vacio">
          <IconoRefrescar size={24} className="spin" />
          <p>Cargando cuentas bancarias...</p>
        </div>
      ) : cuentas.length === 0 ? (
        <Card className="billetera-cuentas-vacio">
          <p className="billetera-vacio-texto">
            No tenés cuentas bancarias registradas. Agregá una cuenta a tu nombre para poder retirar
            tus fondos disponibles.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={abrirModal}
            disabled={deshabilitado}
          >
            + Agregar cuenta
          </button>
        </Card>
      ) : (
        <div className="billetera-cuentas-grid" data-testid="lista-cuentas-bancarias">
          {cuentas.map((cuenta) => {
            const rechazada = cuenta.estadoValidacion === 'RECHAZADA';
            return (
              <Card
                key={cuenta.id}
                className={`billetera-cuenta-card ${rechazada ? 'cuenta-rechazada-card' : ''}`}
              >
                <div className="billetera-cuenta-top">
                  <div className="billetera-cuenta-tipo-badge">
                    <span className="cuenta-tipo-tag">{cuenta.tipo}</span>
                    <Badge tone={tonoValidacion(cuenta.estadoValidacion)}>
                      {labelValidacion(cuenta.estadoValidacion)}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm billetera-cuenta-eliminar"
                    onClick={() => void handleEliminar(cuenta.id)}
                    disabled={eliminandoId === cuenta.id || deshabilitado}
                    title="Eliminar cuenta"
                    aria-label={`Eliminar cuenta ${cuenta.valor}`}
                  >
                    <IconoBasura size={16} />
                  </button>
                </div>

                <div className="billetera-cuenta-info">
                  <div className="billetera-cuenta-valor" title={cuenta.valor}>
                    {cuenta.valor}
                  </div>
                  <div className="billetera-cuenta-titular">
                    <strong>Titular:</strong> {cuenta.titular}
                  </div>
                  <div className="billetera-cuenta-cuit">
                    <strong>CUIT/CUIL:</strong> {cuenta.cuitCuil}
                  </div>
                </div>

                {rechazada && (
                  <div role="alert" className="billetera-cuenta-alerta-rechazo">
                    <IconoAlerta size={16} />
                    <span>
                      La cuenta destino debe estar a nombre del titular verificado en la plataforma
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Agregar cuenta */}
      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title="Agregar cuenta bancaria"
        closeDisabled={guardando}
      >
        <form onSubmit={handleCrearCuenta} className="billetera-modal-form">
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            La cuenta debe estar a tu nombre (mismo CUIT/CUIL que tu documento verificado) para poder
            aprobar los retiros de fondos.
          </p>

          {errorModal && (
            <div role="alert" className="alerta alerta-peligro">
              <IconoAlerta size={18} />
              <span>{errorModal}</span>
            </div>
          )}

          <div className="billetera-modal-campo">
            <label htmlFor="cuenta-tipo">Tipo de cuenta *</label>
            <select
              id="cuenta-tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoCuenta);
                setErroresCampos((prev) => ({ ...prev, valor: '' }));
              }}
              disabled={guardando}
            >
              <option value="CBU">CBU (Cuenta bancaria)</option>
              <option value="CVU">CVU (Billetera virtual)</option>
              <option value="ALIAS">Alias</option>
            </select>
          </div>

          <div className="billetera-modal-campo">
            <label htmlFor="cuenta-valor">
              {tipo === 'ALIAS' ? 'Alias *' : `${tipo} (22 dígitos) *`}
            </label>
            <input
              id="cuenta-valor"
              type="text"
              required
              placeholder={tipo === 'ALIAS' ? 'Ej: mi.cuenta.pica' : 'Ej: 0170099220000012345678'}
              value={valor}
              maxLength={tipo === 'ALIAS' ? 20 : 22}
              onChange={(e) => {
                setValor(e.target.value);
                setErroresCampos((prev) => ({ ...prev, valor: '' }));
              }}
              disabled={guardando}
              autoFocus
            />
            {erroresCampos.valor && (
              <span className="error-mensaje" role="alert">
                {erroresCampos.valor}
              </span>
            )}
          </div>

          <div className="billetera-modal-campo">
            <label htmlFor="cuenta-titular">Nombre y apellido del titular *</label>
            <input
              id="cuenta-titular"
              type="text"
              required
              placeholder="Ej: Juan Pérez"
              value={titular}
              maxLength={100}
              onChange={(e) => {
                setTitular(e.target.value);
                setErroresCampos((prev) => ({ ...prev, titular: '' }));
              }}
              disabled={guardando}
            >
            </input>
            {erroresCampos.titular && (
              <span className="error-mensaje" role="alert">
                {erroresCampos.titular}
              </span>
            )}
          </div>

          <div className="billetera-modal-campo">
            <label htmlFor="cuenta-cuit">CUIT / CUIL del titular (11 dígitos) *</label>
            <input
              id="cuenta-cuit"
              type="text"
              inputMode="numeric"
              required
              placeholder="Ej: 20381234567"
              value={cuitCuil}
              maxLength={11}
              onChange={(e) => {
                setCuitCuil(e.target.value);
                setErroresCampos((prev) => ({ ...prev, cuitCuil: '' }));
              }}
              disabled={guardando}
            />
            {erroresCampos.cuitCuil && (
              <span className="error-mensaje" role="alert">
                {erroresCampos.cuitCuil}
              </span>
            )}
          </div>

          <div className="billetera-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cerrarModal}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardando || !valor || !titular || !cuitCuil}
            >
              {guardando ? 'Guardando...' : 'Guardar cuenta'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
