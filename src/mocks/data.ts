import { Billetera, MovimientoBilletera } from '../api/billeteraApi';

export const billeteraInicialMock: Billetera = {
  saldoDisponible: 15000.0,
  saldoRetenido: 5000.0,
  gananciaAcumulada: 8500.0,
  moneda: 'ARS',
  estado: 'ACTIVA',
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

export const resetBilleteraMock = () => {
  billeteraEstado = { ...billeteraInicialMock };
  movimientosEstado = [...movimientosInicialesMock];
};

