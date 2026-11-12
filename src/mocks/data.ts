import {
  Billetera,
  CargaCripto,
  CuentaBancaria,
  LimitesRetiro,
  MovimientoBilletera,
} from '../api/billeteraApi';

export const billeteraInicialMock: Billetera = {
  saldoDisponible: 15000.0,
  saldoRetenido: 5000.0,
  gananciaAcumulada: 8500.0,
  moneda: 'ARS',
  estado: 'ACTIVA',
};

export const cuentasBancariasInicialesMock: CuentaBancaria[] = [
  {
    id: 1,
    tipo: 'CBU',
    valor: '0170099220000012345678',
    titular: 'Usuario PICA',
    cuitCuil: '20381234567',
    estadoValidacion: 'VALIDADA',
    validadaEn: '2026-11-01T10:00:00Z',
    creadoEn: '2026-11-01T09:30:00Z',
  },
];

export const limitesRetiroInicialMock: LimitesRetiro = {
  minimo: 1000.0,
  maximo: 500000.0,
};

export const movimientosInicialesMock: MovimientoBilletera[] = [
  {
    id: 101,
    tipo: 'CARGA',
    monto: 10000.0,
    moneda: 'ARS',
    saldoResultante: 15000.0,
    estado: 'CONFIRMADO',
    referenciaExterna: 'sim-carga-001',
    descripcion: 'Carga de saldo inicial',
    torneo: null,
    rifa: null,
    creadoEn: '2026-11-05T14:30:00Z',
  },
  {
    id: 102,
    tipo: 'PREMIO',
    monto: 7500.0,
    moneda: 'ARS',
    saldoResultante: 5000.0,
    estado: 'CONFIRMADO',
    referenciaExterna: null,
    descripcion: 'Primer puesto Torneo Relámpago',
    torneo: {
      id: 1,
      nombre: 'Torneo Relámpago',
      titulo: 'Torneo Relámpago Apertura',
      slug: 'torneo-relampago-apertura',
    },
    rifa: null,
    creadoEn: '2026-11-04T18:00:00Z',
  },
  {
    id: 103,
    tipo: 'INSCRIPCION',
    monto: 2500.0,
    moneda: 'ARS',
    saldoResultante: 2500.0,
    estado: 'CONFIRMADO',
    referenciaExterna: null,
    descripcion: 'Inscripción Copa Primavera F5',
    torneo: {
      id: 2,
      nombre: 'Copa Primavera',
      titulo: 'Copa Primavera F5',
      slug: 'copa-primavera-f5',
    },
    rifa: null,
    creadoEn: '2026-11-03T11:15:00Z',
  },
  {
    id: 104,
    tipo: 'COMPRA_NUMERO',
    monto: 1000.0,
    moneda: 'ARS',
    saldoResultante: 5000.0,
    estado: 'CONFIRMADO',
    referenciaExterna: null,
    descripcion: 'Compra números 12, 13',
    torneo: null,
    rifa: {
      id: 1,
      titulo: 'Gran Rifa Solidaria',
    },
    creadoEn: '2026-11-02T09:00:00Z',
  },
];

let billeteraEstado: Billetera = { ...billeteraInicialMock };
let movimientosEstado: MovimientoBilletera[] = [...movimientosInicialesMock];

export const getBilleteraMock = (): Billetera => ({ ...billeteraEstado });

export const getMovimientosMock = (): MovimientoBilletera[] => [...movimientosEstado];

export const setBilleteraMock = (nueva: Partial<Billetera>) => {
  billeteraEstado = { ...billeteraEstado, ...nueva };
};

export const setMovimientosMock = (nuevos: MovimientoBilletera[]) => {
  movimientosEstado = [...nuevos];
};

export const cargarSaldoMock = (monto: number, referencia?: string): MovimientoBilletera => {
  const nuevoSaldo = billeteraEstado.saldoDisponible + monto;
  billeteraEstado = {
    ...billeteraEstado,
    saldoDisponible: nuevoSaldo,
  };

  const nuevoMovimiento: MovimientoBilletera = {
    id: Date.now(),
    tipo: 'CARGA',
    monto,
    moneda: billeteraEstado.moneda,
    saldoResultante: nuevoSaldo,
    estado: 'CONFIRMADO',
    referenciaExterna: referencia || `sim-carga-${Math.random().toString(36).substring(2, 10)}`,
    descripcion: 'Carga de saldo',
    torneo: null,
    rifa: null,
    creadoEn: new Date().toISOString(),
  };

  movimientosEstado = [nuevoMovimiento, ...movimientosEstado];
  return nuevoMovimiento;
};

/** HU-609: el contrato PasarelaCargas de Base Sepolia (PICA-328) y la cotización fija de testnet del back. */
export const CONTRATO_PASARELA = '0x36e633eDD1E79Ef2b9A3c6A099D873D52e44EDF0';
const WEI_POR_CENTAVO = 100_000_000n;

let cargasCripto = new Map<string, CargaCripto>();

export const iniciarCargaCriptoMock = (monto: number): CargaCripto => {
  const numero = (cargasCripto.size + 1).toString(16).padStart(64, '0');
  const carga: CargaCripto = {
    referencia: `0x${numero}`,
    contrato: CONTRATO_PASARELA,
    chainId: 84532,
    montoWei: (BigInt(Math.round(monto * 100)) * WEI_POR_CENTAVO).toString(),
    montoPesos: monto,
  };
  cargasCripto.set(carga.referencia, carga);
  return carga;
};

export const getCargaCriptoMock = (referencia: string): CargaCripto | undefined =>
  cargasCripto.get(referencia);

/** Acredita la carga como el back: el hash queda de referencia externa, con su enlace a BaseScan. */
export const acreditarCargaCriptoMock = (carga: CargaCripto, hash: string): MovimientoBilletera => {
  const movimiento: MovimientoBilletera = {
    ...cargarSaldoMock(carga.montoPesos, hash),
    descripcion: 'Carga de saldo con cripto',
    enlaceExplorador: `https://sepolia.basescan.org/tx/${hash}`,
  };
  movimientosEstado = [movimiento, ...movimientosEstado.slice(1)];
  return movimiento;
};

let cuentasBancariasEstado: CuentaBancaria[] = [...cuentasBancariasInicialesMock];
let limitesRetiroEstado: LimitesRetiro = { ...limitesRetiroInicialMock };

export const getCuentasBancariasMock = (): CuentaBancaria[] => [...cuentasBancariasEstado];
export const setCuentasBancariasMock = (nuevas: CuentaBancaria[]) => {
  cuentasBancariasEstado = [...nuevas];
};

export const getLimitesRetiroMock = (): LimitesRetiro => ({ ...limitesRetiroEstado });
export const setLimitesRetiroMock = (limites: LimitesRetiro) => {
  limitesRetiroEstado = { ...limites };
};

export const resetBilleteraMock = () => {
  billeteraEstado = { ...billeteraInicialMock };
  movimientosEstado = [...movimientosInicialesMock];
  cargasCripto = new Map();
  cuentasBancariasEstado = [...cuentasBancariasInicialesMock];
  limitesRetiroEstado = { ...limitesRetiroInicialMock };
};

