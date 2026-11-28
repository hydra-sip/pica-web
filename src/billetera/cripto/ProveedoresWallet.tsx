import React, { useState } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { configWallet } from './configWallet';

/** wagmi, React Query y RainbowKit, para los modales que usan la wallet (HU-609 y HU-610). */
export const ProveedoresWallet: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={configWallet()}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="es-419" theme={lightTheme({ accentColor: '#1b4468' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
