import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { baseSepolia, sepolia as sepoliaReal } from 'wagmi/chains';
import { mock } from 'wagmi/connectors';
import { CUENTA_DE_PRUEBA, RPC_BASE_SEPOLIA } from '../mocks/cadenaHandlers';
import { OPCIONES_DE_LECTURA, usarConfigWallet } from '../billetera/cripto/configWallet';

/**
 * La wallet de las pruebas: el conector `mock` de wagmi, ya conectado con `CUENTA_DE_PRUEBA`. Lo que no resuelve
 * él mismo (balance, gas, envío, recibo) va al RPC de Base Sepolia, que simula `cadenaHandlers`. Con
 * `enOtraRed`, arranca en Ethereum Sepolia, para probar la red equivocada.
 */
// la "otra red": el conector `mock` manda a su RPC por defecto lo que no resuelve, así que va al nodo simulado
const sepolia = defineChain({ ...sepoliaReal, rpcUrls: { default: { http: [RPC_BASE_SEPOLIA] } } });

export const conectarWalletDePrueba = ({ enOtraRed = false }: { enOtraRed?: boolean } = {}) => {
  const chains = enOtraRed ? ([sepolia, baseSepolia] as const) : ([baseSepolia, sepolia] as const);
  usarConfigWallet(
    createConfig({
      ...OPCIONES_DE_LECTURA,
      chains,
      connectors: [
        mock({
          accounts: [CUENTA_DE_PRUEBA],
          features: { defaultConnected: true, reconnect: true },
        }),
      ],
      transports: {
        [baseSepolia.id]: http(RPC_BASE_SEPOLIA),
        [sepolia.id]: http(RPC_BASE_SEPOLIA),
      },
    })
  );
};
