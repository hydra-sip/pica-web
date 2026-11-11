/** El ABI del contrato PasarelaCargas (pica-contracts, `deployments/base-sepolia.json`), lo que usa el front. */
export const pasarelaCargasAbi = [
  {
    type: 'function',
    name: 'cargar',
    inputs: [{ name: 'referencia', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'payable',
  },
  { type: 'error', name: 'MontoCero', inputs: [] },
  { type: 'error', name: 'ReferenciaVacia', inputs: [] },
  {
    type: 'error',
    name: 'ReferenciaYaPagada',
    inputs: [{ name: 'referencia', type: 'bytes32' }],
  },
  { type: 'error', name: 'EnforcedPause', inputs: [] },
] as const;

/** Lo que se le dice al usuario cuando el contrato revierte con cada error. */
export const MOTIVO_DE_REVERSION: Record<string, string> = {
  ReferenciaYaPagada: 'La carga ya está pagada.',
  EnforcedPause: 'La pasarela está en pausa: probá más tarde.',
  MontoCero: 'El pago no puede ser de 0 ETH.',
  ReferenciaVacia: 'La carga no tiene referencia.',
};

export const BASESCAN = 'https://sepolia.basescan.org';

export const enlaceTransaccion = (hash: string) => `${BASESCAN}/tx/${hash}`;

/** Donde conseguir ETH de prueba en Base Sepolia. */
export const FAUCET_BASE_SEPOLIA = 'https://docs.base.org/base-chain/tools/network-faucets';
