import { http, createConfig } from 'wagmi';
import { baseSepolia, sepolia } from 'wagmi/chains';
import { mock } from 'wagmi/connectors';
import { CUENTA_DE_PRUEBA, RPC_BASE_SEPOLIA } from '../mocks/cadenaHandlers';
import { usarConfigWallet } from '../billetera/cripto/configWallet';

/**
 * La wallet de las pruebas: el conector `mock` de wagmi, ya conectado con `CUENTA_DE_PRUEBA`. Lo que no resuelve
 * él mismo (balance, gas, envío, recibo) va al RPC de Base Sepolia, que simula `cadenaHandlers`. Con
 * `enOtraRed`, arranca en Ethereum Sepolia, para probar la red equivocada.
 */
export const conectarWalletDePrueba = ({ enOtraRed = false }: { enOtraRed?: boolean } = {}) => {
  const chains = enOtraRed ? ([sepolia, baseSepolia] as const) : ([baseSepolia, sepolia] as const);
  usarConfigWallet(
    createConfig({
      chains,
      connectors: [
        mock({
          accounts: [CUENTA_DE_PRUEBA],
          features: { defaultConnected: true, reconnect: true },
        }),
      ],
      transports: {
        [baseSepolia.id]: http(RPC_BASE_SEPOLIA),
        [sepolia.id]: http('https://rpc.sepolia.invalid'),
      },
    })
  );
};
