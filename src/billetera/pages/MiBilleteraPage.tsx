import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  billeteraApi,
  Billetera,
  CuentaBancaria,
  esIngreso,
  ESTADO_MOVIMIENTO_LABEL,
  estadoMovimientoLabel,
  LimitesRetiro,
  MovimientoBilletera,
  TIPO_MOVIMIENTO_LABEL,
  TipoMovimientoBilletera,
} from '../../api/billeteraApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Card, Modal } from '../../shared/ui';
import {
  IconoAlerta,
  IconoBilletera,
  IconoCheck,
  IconoEspera,
  IconoRefrescar,
  IconoTrofeo,
} from '../../shared/ui/Iconos';
import { CuentasBancarias } from '../components/CuentasBancarias';
import { ModalRetiro } from '../components/ModalRetiro';
import { useRetomarCargasCripto } from '../cripto/useRetomarCargasCripto';
import '../billetera.css';

const TAMANIO_PAGINA = 10;

/** Los movimientos con un evento que además dicen qué fueron: premios, liquidaciones y honorarios. */
const CON_DETALLE: TipoMovimientoBilletera[] = [
  'PREMIO',
  'LIQUIDACION',
  'HONORARIO',
  'PAGO_SERVICIO',
  'REINTEGRO',
];

// HU-609: wagmi, viem y RainbowKit se bajan recién al abrir Cargar con cripto
const CargaConCripto = lazy(() => import('../cripto/CargaConCripto'));

const tonoEstado = (estado: string): BadgeTone => {
  switch (estado) {
    case 'CONFIRMADO':
      return 'exito';
    case 'PENDIENTE':
      return 'aviso';
    case 'RECHAZADO':
      return 'peligro';
    case 'REVERTIDO':
      return 'neutral';
    default:
      return 'neutral';
  }
};

export const MiBilleteraPage: React.FC = () => {
  const [billetera, setBilletera] = useState<Billetera | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoBilletera[]>([]);
  const [pagina, setPagina] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(0);
  const [cargandoBilletera, setCargandoBilletera] = useState<boolean>(true);
  const [cargandoMovimientos, setCargandoMovimientos] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del modal Cargar saldo
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [montoInput, setMontoInput] = useState<string>('');
  const [guardandoCarga, setGuardandoCarga] = useState<boolean>(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Estado de cuentas bancarias y retiros (HU-607)
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [cargandoCuentas, setCargandoCuentas] = useState<boolean>(true);
  const [limitesRetiro, setLimitesRetiro] = useState<LimitesRetiro>({
    minimo: 1000,
    maximo: 500000,
  });
  const [modalRetiroAbierto, setModalRetiroAbierto] = useState<boolean>(false);

  const cargarBilletera = useCallback(async () => {
    try {
      const data = await billeteraApi.obtenerBilletera();
      setBilletera(data);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cargar la información de la billetera.'));
    } finally {
      setCargandoBilletera(false);
    }
  }, []);

  const cargarMovimientos = useCallback(async (pag: number) => {
    setCargandoMovimientos(true);
    try {
      const res = await billeteraApi.listarMovimientos({ page: pag, size: TAMANIO_PAGINA });
      setMovimientos(res.content);
      setPagina(res.page.number);
      setTotalPaginas(res.page.totalPages);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los movimientos.'));
    } finally {
      setCargandoMovimientos(false);
    }
  }, []);

  const cargarCuentas = useCallback(async () => {
    setCargandoCuentas(true);
    try {
      const data = await billeteraApi.listarCuentas();
      setCuentas(data);
    } catch {
      // si falla la carga inicial de cuentas, dejamos lista vacía
    } finally {
      setCargandoCuentas(false);
    }
  }, []);

  const cargarLimitesRetiro = useCallback(async () => {
    try {
      const data = await billeteraApi.obtenerLimitesRetiro();
      setLimitesRetiro(data);
    } catch {
      // fallback a topes estándar si falla la API
    }
  }, []);

  useEffect(() => {
    void cargarBilletera();
  }, [cargarBilletera]);

  useEffect(() => {
    void cargarMovimientos(pagina);
  }, [cargarMovimientos, pagina]);

  useEffect(() => {
    void cargarCuentas();
    void cargarLimitesRetiro();
  }, [cargarCuentas, cargarLimitesRetiro]);

  const handleRetiroExitoso = useCallback(
    async (monto: number) => {
      setMensajeExito(
        `Solicitud de retiro por ${pesos(monto)} enviada. Tu transferencia se encuentra en proceso.`
      );
      await Promise.all([cargarBilletera(), cargarMovimientos(0)]);
    },
    [cargarBilletera, cargarMovimientos]
  );

  const [criptoAbierto, setCriptoAbierto] = useState<boolean>(false);

  const cargaCriptoAcreditada = useCallback(
    async (movimiento: MovimientoBilletera) => {
      setMensajeExito(`Se acreditaron ${pesos(movimiento.monto)} en tu billetera con cripto.`);
      await Promise.all([cargarBilletera(), cargarMovimientos(0)]);
    },
    [cargarBilletera, cargarMovimientos]
  );

  const { user } = useAuth();
  const retomadas = useRetomarCargasCripto(
    user?.id,
    criptoAbierto,
    (movimiento) => void cargaCriptoAcreditada(movimiento),
    setError
  );
  const montoRetomado = retomadas.pendientes.reduce((total, c) => total + c.montoPesos, 0);

  const abrirModalCarga = () => {
    setMontoInput('');
    setErrorModal(null);
    setModalAbierto(true);
  };

  const cerrarModalCarga = () => {
    if (guardandoCarga) return;
    setModalAbierto(false);
    setErrorModal(null);
    setMontoInput('');
  };

  const handleCargarSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);

    const monto = parseFloat(montoInput);
    if (isNaN(monto) || monto <= 0) {
      setErrorModal('El monto a cargar debe ser un número mayor a 0.');
      return;
    }

    setGuardandoCarga(true);
    try {
      await billeteraApi.cargarSaldo(monto);
      setModalAbierto(false);
      setMontoInput('');
      setMensajeExito(`Se acreditaron ${pesos(monto)} en tu billetera con éxito.`);
      // Actualizar datos sin recargar la página
      await Promise.all([cargarBilletera(), cargarMovimientos(0)]);
    } catch (err) {
      setErrorModal(mensajeDeError(err, 'No se pudo completar la carga de saldo.'));
    } finally {
      setGuardandoCarga(false);
    }
  };

  return (
    <div className="billetera-page">
      <header className="billetera-encabezado">
        <div className="billetera-titulo-bloque">
          <h1>Mi billetera</h1>
          <p className="billetera-subtitulo">
            Consultá tus saldos en custodia, el historial de movimientos y cargá saldo para operar.
          </p>
        </div>
        <div className="billetera-header-acciones">
          <button
            type="button"
            className="btn btn-primary"
            onClick={abrirModalCarga}
            disabled={billetera?.estado === 'BLOQUEADA'}
          >
            Cargar saldo
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setModalRetiroAbierto(true)}
            disabled={billetera?.estado === 'BLOQUEADA'}
          >
            Retirar fondos
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCriptoAbierto(true)}
            disabled={billetera?.estado === 'BLOQUEADA'}
          >
            Cargar con cripto
          </button>
        </div>
      </header>

      {billetera?.estado === 'BLOQUEADA' && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>
            Tu billetera está bloqueada temporalmente. No es posible realizar cargas ni operaciones.
            Contactate con soporte si creés que se trata de un error.
          </span>
        </div>
      )}

      {retomadas.pendientes.length > 0 && (
        <div role="status" className="alerta alerta-aviso">
          <IconoEspera size={20} />
          <span>
            {retomadas.demorada
              ? `Tu carga con cripto de ${pesos(montoRetomado)} todavía no se confirmó: la red puede tardar más de lo normal.`
              : `Tenés una carga con cripto confirmándose: ${pesos(montoRetomado)}.`}
          </span>
          {retomadas.demorada && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={retomadas.reintentar}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {mensajeExito && (
        <div role="status" className="alerta alerta-exito">
          <IconoCheck size={20} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Tres indicadores de saldo en pesos */}
      <section
        className="billetera-saldos-grid"
        aria-label="Indicadores de saldo"
        data-testid="indicadores-saldo"
      >
        <Card className="billetera-saldo-card billetera-saldo-disponible">
          <div className="billetera-saldo-card-header">
            <span>Disponible</span>
            <IconoBilletera size={20} />
          </div>
          <div className="billetera-saldo-monto">
            {cargandoBilletera ? '-' : pesos(billetera?.saldoDisponible)}
          </div>
          <div className="billetera-saldo-nota">
            Disponible para inscribirte a torneos y comprar números de rifas
          </div>
        </Card>

        <Card className="billetera-saldo-card billetera-saldo-retenido">
          <div className="billetera-saldo-card-header">
            <span>Retenido (en custodia)</span>
            <IconoEspera size={20} />
          </div>
          <div className="billetera-saldo-monto">
            {cargandoBilletera ? '-' : pesos(billetera?.saldoRetenido)}
          </div>
          <div className="billetera-saldo-nota">
            Fondos comprometidos en inscripciones o premios pendientes
          </div>
        </Card>

        <Card className="billetera-saldo-card billetera-saldo-ganancia">
          <div className="billetera-saldo-card-header">
            <span>Ganancia acumulada</span>
            <IconoTrofeo size={20} />
          </div>
          <div className="billetera-saldo-monto">
            {cargandoBilletera ? '-' : pesos(billetera?.gananciaAcumulada)}
          </div>
          <div className="billetera-saldo-nota">
            Premios ganados en torneos y sorteos de rifas
          </div>
        </Card>
      </section>

      {/* Cuentas bancarias (HU-607) */}
      <CuentasBancarias
        cuentas={cuentas}
        cargando={cargandoCuentas}
        onCuentaAgregada={() => {
          void cargarCuentas();
        }}
        onCuentaEliminada={() => {
          void cargarCuentas();
        }}
        deshabilitado={billetera?.estado === 'BLOQUEADA'}
      />

      {/* Historial de Movimientos */}
      <section className="billetera-movimientos-seccion" aria-label="Historial de movimientos">
        <h2 className="billetera-seccion-titulo">Movimientos</h2>

        {cargandoMovimientos && movimientos.length === 0 ? (
          <div className="billetera-vacio">
            <IconoRefrescar size={28} className="spin" />
            <p>Cargando movimientos...</p>
          </div>
        ) : movimientos.length === 0 ? (
          <Card className="billetera-vacio">
            <div className="billetera-vacio-icono">
              <IconoBilletera size={48} />
            </div>
            <p className="billetera-vacio-texto">
              Todavía no tenés movimientos en tu billetera. ¡Cargá saldo para comenzar a participar
              en torneos y rifas!
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={abrirModalCarga}
              disabled={billetera?.estado === 'BLOQUEADA'}
            >
              Cargar saldo
            </button>
          </Card>
        ) : (
          <Card className="billetera-tabla-card">
            <div className="billetera-tabla-contenedor">
              <table className="billetera-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Detalle / Referencia</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    <th style={{ textAlign: 'right' }}>Saldo resultante</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => {
                    const ingreso = esIngreso(mov.tipo);
                    const tipoLabel = TIPO_MOVIMIENTO_LABEL[mov.tipo] || mov.tipo;
                    const estadoLabel = estadoMovimientoLabel(mov);

                    return (
                      <tr key={mov.id}>
                        <td className="billetera-fecha">{fechaHora(mov.creadoEn)}</td>
                        <td>
                          <span
                            className={`badge ${ingreso ? 'badge-exito' : 'badge-neutral'}`}
                            style={{ fontWeight: 600 }}
                          >
                            {tipoLabel}
                          </span>
                        </td>
                        <td>
                          {/* la rifa primero: si tiene torneo, el movimiento trae los dos */}
                          {mov.rifa ? (
                            <Link to={`/rifas/${mov.rifa.id}`} className="billetera-enlace">
                              {mov.rifa.titulo}
                            </Link>
                          ) : mov.torneo ? (
                            <Link
                              to={`/torneos/${mov.torneo.slug || mov.torneo.id}`}
                              className="billetera-enlace"
                            >
                              {mov.torneo.titulo || mov.torneo.nombre}
                            </Link>
                          ) : (
                            <span>{mov.descripcion || mov.referenciaExterna || '-'}</span>
                          )}
                          {/* HU-606 y HU-604: lo que acredita la liquidación y los honorarios dicen qué son */}
                          {(mov.rifa || mov.torneo) &&
                            CON_DETALLE.includes(mov.tipo) &&
                            mov.descripcion && (
                              <span className="billetera-movimiento-detalle">{mov.descripcion}</span>
                            )}
                          {mov.enlaceExplorador && (
                            <a
                              href={mov.enlaceExplorador}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="billetera-enlace billetera-movimiento-detalle"
                            >
                              Ver en BaseScan
                            </a>
                          )}
                        </td>
                        <td>
                          <Badge tone={tonoEstado(mov.estado)}>{estadoLabel}</Badge>
                        </td>
                        <td className={`billetera-monto-col ${ingreso ? 'monto-positivo' : 'monto-negativo'}`}>
                          {ingreso ? `+ ${pesos(mov.monto)}` : `- ${pesos(mov.monto)}`}
                        </td>
                        <td className="billetera-saldo-res">{pesos(mov.saldoResultante)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="billetera-paginacion">
                <span className="billetera-paginacion-info">
                  Página {pagina + 1} de {totalPaginas}
                </span>
                <div className="billetera-paginacion-botones">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPagina((p) => Math.max(0, p - 1))}
                    disabled={pagina === 0 || cargandoMovimientos}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                    disabled={pagina >= totalPaginas - 1 || cargandoMovimientos}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </section>

      {criptoAbierto && (
        <Suspense fallback={null}>
          <CargaConCripto
            usuarioId={user?.id ?? ''}
            onCerrar={() => setCriptoAbierto(false)}
            onAcreditada={(movimiento) => void cargaCriptoAcreditada(movimiento)}
          />
        </Suspense>
      )}

      {/* Modal Cargar saldo */}
      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModalCarga}
        title="Cargar saldo"
        closeDisabled={guardandoCarga}
      >
        <form onSubmit={handleCargarSaldo} className="billetera-modal-form">
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Ingresá el monto en pesos que deseás acreditar en tu cuenta para participar en torneos y
            rifas.
          </p>

          {errorModal && (
            <div role="alert" className="alerta alerta-peligro">
              <IconoAlerta size={18} />
              <span>{errorModal}</span>
            </div>
          )}

          <div className="billetera-modal-campo">
            <label htmlFor="monto-carga">Monto a cargar (ARS) *</label>
            <input
              id="monto-carga"
              type="number"
              step="any"
              min="1"
              required
              placeholder="Ej: 5000"
              value={montoInput}
              onChange={(e) => setMontoInput(e.target.value)}
              disabled={guardandoCarga}
              autoFocus
            />
          </div>

          <div className="billetera-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cerrarModalCarga}
              disabled={guardandoCarga}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardandoCarga || !montoInput}
            >
              {guardandoCarga ? 'Cargando...' : 'Confirmar carga'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Retiro de fondos (HU-607) */}
      <ModalRetiro
        isOpen={modalRetiroAbierto}
        onClose={() => setModalRetiroAbierto(false)}
        saldoDisponible={billetera?.saldoDisponible ?? 0}
        cuentasValidadas={cuentas.filter((c) => c.estadoValidacion === 'VALIDADA')}
        limites={limitesRetiro}
        onRetiroExitoso={(monto) => void handleRetiroExitoso(monto)}
      />
    </div>
  );
};
