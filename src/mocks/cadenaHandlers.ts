import { http, HttpResponse } from 'msw';

/**
 * El nodo JSON-RPC de Base Sepolia en las pruebas (HU-609). El conector `mock` de wagmi resuelve solo la
 * cuenta, la red y el cambio de red; el resto (balance, gas, envío, recibo) llega acá por `fetch`. Solo lo usa
 * el server de las pruebas: en el navegador, MetaMask manda las transacciones a la red de verdad.
 */
export const RPC_BASE_SEPOLIA = 'https://sepolia.base.org';

export const CUENTA_DE_PRUEBA = '0x1111111111111111111111111111111111111111';
export const HASH_ENVIADO = `0x${'ab'.repeat(32)}`;

export interface TransaccionEnviada {
  from: string;
  to: string;
  value: string;
  data: string;
}

interface ErrorRpc {
  code: number;
  message: string;
  data?: string;
}

interface EstadoCadena {
  saldoWei: bigint;
  gasPrice: bigint;
  gas: bigint;
  /** Si está, `eth_sendTransaction` responde este error en vez del hash. */
  errorAlEnviar: ErrorRpc | null;
  /** Si está, `eth_sendTransaction` espera a que se resuelva antes de responder: la firma "abierta". */
  firma: Promise<void> | null;
  reciboExitoso: boolean;
  /** Si está, `eth_call` responde este error: lo que dice el contrato al revertir. */
  errorDelContrato: ErrorRpc | null;
}

const inicial = (): EstadoCadena => ({
  saldoWei: 10n ** 18n,
  gasPrice: 10n ** 9n,
  gas: 50_000n,
  errorAlEnviar: null,
  firma: null,
  reciboExitoso: true,
  errorDelContrato: null,
});

let estado = inicial();
let enviadas: TransaccionEnviada[] = [];

export const setCadenaMock = (cambios: Partial<EstadoCadena>) => {
  estado = { ...estado, ...cambios };
};

export const getTransaccionesEnviadas = (): TransaccionEnviada[] => [...enviadas];

export const resetCadenaMock = () => {
  estado = inicial();
  enviadas = [];
};

const hex = (n: bigint | number) => `0x${n.toString(16)}`;
const BLOQUE = 1000n;

const recibo = () => {
  const ultima = enviadas[enviadas.length - 1];
  return {
    blockHash: `0x${'cd'.repeat(32)}`,
    blockNumber: hex(BLOQUE),
    contractAddress: null,
    cumulativeGasUsed: hex(estado.gas),
    effectiveGasPrice: hex(estado.gasPrice),
    from: ultima?.from ?? CUENTA_DE_PRUEBA,
    gasUsed: hex(estado.gas),
    logs: [],
    logsBloom: `0x${'00'.repeat(256)}`,
    status: estado.reciboExitoso ? '0x1' : '0x0',
    to: ultima?.to ?? null,
    transactionHash: HASH_ENVIADO,
    transactionIndex: '0x0',
    type: '0x2',
  };
};

const transaccion = () => {
  const ultima = enviadas[enviadas.length - 1];
  return {
    blockHash: `0x${'cd'.repeat(32)}`,
    blockNumber: hex(BLOQUE),
    from: ultima?.from ?? CUENTA_DE_PRUEBA,
    to: ultima?.to ?? null,
    value: ultima?.value ?? '0x0',
    input: ultima?.data ?? '0x',
    gas: hex(estado.gas),
    gasPrice: hex(estado.gasPrice),
    maxFeePerGas: hex(estado.gasPrice),
    maxPriorityFeePerGas: '0x0',
    hash: HASH_ENVIADO,
    nonce: '0x0',
    transactionIndex: '0x0',
    type: '0x2',
    chainId: hex(84532),
    v: '0x0',
    r: `0x${'01'.repeat(32)}`,
    s: `0x${'01'.repeat(32)}`,
    yParity: '0x0',
    accessList: [],
  };
};

type Resultado = { result: unknown } | { error: ErrorRpc };

const responder = async (method: string, params: unknown[]): Promise<Resultado> => {
  switch (method) {
    case 'eth_chainId':
      return { result: hex(84532) };
    case 'eth_accounts':
      return { result: [CUENTA_DE_PRUEBA] };
    case 'eth_blockNumber':
      return { result: hex(BLOQUE + 5n) };
    case 'eth_getBalance':
      return { result: hex(estado.saldoWei) };
    case 'eth_gasPrice':
      return { result: hex(estado.gasPrice) };
    case 'eth_maxPriorityFeePerGas':
      return { result: '0x0' };
    case 'eth_estimateGas':
      return { result: hex(estado.gas) };
    case 'eth_getBlockByNumber':
      return {
        result: {
          number: hex(BLOQUE + 5n),
          hash: `0x${'ef'.repeat(32)}`,
          baseFeePerGas: hex(estado.gasPrice),
          timestamp: '0x0',
          transactions: [],
        },
      };
    case 'eth_sendTransaction': {
      if (estado.firma) await estado.firma;
      if (estado.errorAlEnviar) return { error: estado.errorAlEnviar };
      enviadas.push(params[0] as TransaccionEnviada);
      return { result: HASH_ENVIADO };
    }
    case 'eth_getTransactionReceipt':
      return { result: enviadas.length ? recibo() : null };
    case 'eth_getTransactionByHash':
      return { result: enviadas.length ? transaccion() : null };
    case 'eth_call':
      return estado.errorDelContrato ? { error: estado.errorDelContrato } : { result: '0x' };
    default:
      return { error: { code: -32601, message: `Método no simulado: ${method}` } };
  }
};

interface PedidoRpc {
  id: number;
  method: string;
  params?: unknown[];
}

const contestar = async ({ id, method, params = [] }: PedidoRpc) => ({
  jsonrpc: '2.0',
  id,
  ...(await responder(method, params)),
});

export const cadenaHandlers = [
  http.post(RPC_BASE_SEPOLIA, async ({ request }) => {
    const cuerpo = (await request.json()) as PedidoRpc | PedidoRpc[];
    if (Array.isArray(cuerpo)) return HttpResponse.json(await Promise.all(cuerpo.map(contestar)));
    return HttpResponse.json(await contestar(cuerpo));
  }),
];
