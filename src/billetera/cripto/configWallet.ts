import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { type Config, createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

/**
 * HU-609: la wallet se conecta solo a Base Sepolia, por el RPC público, y solo con wallets del navegador
 * (MetaMask y las que se anuncian por EIP-6963). Sin WalletConnect no hace falta un projectId de Reown: el que
 * pide RainbowKit no se usa.
 */
const crearConfig = (): Config =>
  createConfig({
    chains: [baseSepolia],
    connectors: connectorsForWallets(
      [{ groupName: 'Wallets del navegador', wallets: [injectedWallet] }],
      { appName: 'PICA', projectId: 'pica-sin-walletconnect' }
    ),
    transports: { [baseSepolia.id]: http() },
  });

let config: Config | undefined;

export const configWallet = (): Config => (config ??= crearConfig());

/** Las pruebas cambian la config por una con el conector `mock` de wagmi; `undefined` vuelve a la real. */
export const usarConfigWallet = (otra: Config | undefined) => {
  config = otra;
};
