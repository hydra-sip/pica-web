/** El ABI del contrato PasarelaRetiros (pica-contracts, HU-610), lo que usa el front. */
export const pasarelaRetirosAbi = [
  {
    type: 'function',
    name: 'cobrar',
    inputs: [
      { name: 'referencia', type: 'bytes32' },
      { name: 'monto', type: 'uint256' },
      { name: 'vence', type: 'uint256' },
      { name: 'firma', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  { type: 'error', name: 'MontoCero', inputs: [] },
  { type: 'error', name: 'ReferenciaVacia', inputs: [] },
  {
    type: 'error',
    name: 'RetiroYaCobrado',
    inputs: [{ name: 'referencia', type: 'bytes32' }],
  },
  { type: 'error', name: 'PermisoVencido', inputs: [{ name: 'vence', type: 'uint256' }] },
  { type: 'error', name: 'FirmaInvalida', inputs: [] },
  {
    type: 'error',
    name: 'SaldoInsuficiente',
    inputs: [
      { name: 'saldo', type: 'uint256' },
      { name: 'monto', type: 'uint256' },
    ],
  },
  { type: 'error', name: 'TransferenciaFallida', inputs: [] },
  { type: 'error', name: 'EnforcedPause', inputs: [] },
] as const;

/** Lo que se le dice al usuario cuando el contrato revierte el cobro con cada error. */
export const MOTIVO_DE_REVERSION_RETIRO: Record<string, string> = {
  RetiroYaCobrado: 'El retiro ya está cobrado.',
  PermisoVencido: 'El permiso venció: el saldo vuelve a tu billetera en unos minutos.',
  FirmaInvalida: 'El permiso no es para esta wallet.',
  SaldoInsuficiente:
    'La pasarela no tiene fondos para pagarlo ahora. Probá más tarde: el permiso sigue valiendo hasta que vence.',
  TransferenciaFallida: 'Tu wallet rechazó el ETH.',
  EnforcedPause: 'La pasarela está en pausa: probá más tarde.',
};
