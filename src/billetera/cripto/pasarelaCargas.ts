/** El ABI del contrato PasarelaCargas (pica-contracts, `deployments/base-sepolia.json`), lo que usa el front. */
export const pasarelaCargasAbi = [
  {
    type: 'function',
    name: 'cargar',
    inputs: [{ name: 'referencia', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

export const BASESCAN = 'https://sepolia.basescan.org';

export const enlaceTransaccion = (hash: string) => `${BASESCAN}/tx/${hash}`;
