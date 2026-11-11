import React, { useState } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { ConnectButton, lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount, useSwitchChain, WagmiProvider } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import type { MovimientoBilletera } from '../../api/billeteraApi';
import { pesos } from '../../shared/formato';
import { Modal } from '../../shared/ui';
import { IconoAlerta, IconoCheck } from '../../shared/ui/Iconos';
import { eth } from './cargaCripto';
import { configWallet } from './configWallet';
import { enlaceTransaccion, FAUCET_BASE_SEPOLIA } from './pasarelaCargas';
import { useCargaCripto } from './useCargaCripto';

interface Props {
  usuarioId: number | string;
  onCerrar: () => void;
  onAcreditada: (movimiento: MovimientoBilletera) => void;
}

const EnlaceBaseScan: React.FC<{ hash: string }> = ({ hash }) => (
  <a
    href={enlaceTransaccion(hash)}
    target="_blank"
    rel="noopener noreferrer"
    className="billetera-enlace"
  >
    Ver en BaseScan
  </a>
);

const Alerta: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="alert" className="alerta alerta-peligro">
    <IconoAlerta size={18} />
    <span>{children}</span>
  </div>
);

const ModalCargaConCripto: React.FC<Props> = ({ usuarioId, onCerrar, onAcreditada }) => {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending: cambiandoDeRed } = useSwitchChain();
  const enOtraRed = isConnected && chainId !== baseSepolia.id;
  const { estado, iniciar, pagar, reintentar } = useCargaCripto(usuarioId, onAcreditada);
  const [montoTexto, setMontoTexto] = useState('');
  const ocupado = estado.fase === 'iniciando' || estado.fase === 'firmando';

  const continuar = (e: React.FormEvent) => {
    e.preventDefault();
    void iniciar(montoTexto);
  };

  return (
    <Modal isOpen onClose={onCerrar} title="Cargar con cripto" closeDisabled={ocupado}>
      <div className="billetera-modal-form">
        <ConnectButton chainStatus="icon" showBalance={false} />

        {enOtraRed && (
          <Alerta>
            Estás en otra red: la carga se paga en Base Sepolia.{' '}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => switchChain({ chainId: baseSepolia.id })}
              disabled={cambiandoDeRed}
            >
              Cambiar a Base Sepolia
            </button>
          </Alerta>
        )}

        {(estado.fase === 'inicial' || estado.fase === 'iniciando') && (
          <form onSubmit={continuar} className="billetera-modal-form">
            <p className="billetera-cripto-texto">
              Pagás con tu wallet en Base Sepolia y el saldo se acredita en pesos cuando la red
              confirma la transacción.
            </p>
            {estado.fase === 'inicial' && estado.error && <Alerta>{estado.error}</Alerta>}
            <div className="billetera-modal-campo">
              <label htmlFor="monto-cripto">Monto a cargar (ARS) *</label>
              <input
                id="monto-cripto"
                type="text"
                inputMode="decimal"
                placeholder="Ej: 10000"
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                disabled={ocupado}
              />
            </div>
            <div className="billetera-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCerrar}
                disabled={ocupado}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={ocupado || !isConnected || enOtraRed || !montoTexto}
              >
                {estado.fase === 'iniciando' ? 'Preparando...' : 'Continuar'}
              </button>
            </div>
          </form>
        )}

        {estado.fase === 'listoParaPagar' && (
          <>
            <p>
              Vas a pagar {eth(estado.carga.montoWei)} ETH por {pesos(estado.carga.montoPesos)}.
            </p>
            <div className="billetera-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCerrar}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void pagar(estado.carga)}
                disabled={enOtraRed}
              >
                Pagar con MetaMask
              </button>
            </div>
          </>
        )}

        {estado.fase === 'firmando' && (
          <p role="status">Firmando: confirmá el pago en tu wallet.</p>
        )}

        {estado.fase === 'confirmando' && (
          <p role="status">
            Confirmando la transacción en la red… <EnlaceBaseScan hash={estado.hash} />
          </p>
        )}

        {estado.fase === 'demorada' && (
          <>
            <div role="status" className="alerta alerta-aviso">
              <IconoAlerta size={18} />
              <span>
                Todavía no se confirmó: la red puede tardar más de lo normal. Si ya pagaste, no lo
                pagues de nuevo. <EnlaceBaseScan hash={estado.hash} />
              </span>
            </div>
            <div className="billetera-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCerrar}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void reintentar(estado.carga, estado.hash)}
              >
                Reintentar
              </button>
            </div>
          </>
        )}

        {estado.fase === 'acreditado' && (
          <>
            <div role="status" className="alerta alerta-exito">
              <IconoCheck size={18} />
              <span>
                Acreditado: {pesos(estado.movimiento.monto)}. <EnlaceBaseScan hash={estado.hash} />
              </span>
            </div>
            <div className="billetera-modal-footer">
              <button type="button" className="btn btn-primary" onClick={onCerrar}>
                Cerrar
              </button>
            </div>
          </>
        )}

        {estado.fase === 'error' && (
          <>
            <Alerta>
              {estado.error.mensaje} {estado.hash && <EnlaceBaseScan hash={estado.hash} />}
              {estado.error.tipo === 'sinFondos' && (
                <a
                  href={FAUCET_BASE_SEPOLIA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="billetera-enlace"
                >
                  Conseguir ETH de prueba
                </a>
              )}
            </Alerta>
            <div className="billetera-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCerrar}>
                Cerrar
              </button>
              {/* sin hash, la transacción no salió: se puede volver a pagar la misma carga */}
              {!estado.hash && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void pagar(estado.carga)}
                  disabled={enOtraRed}
                >
                  Pagar con MetaMask
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

/**
 * HU-609: Cargar con cripto. Se carga con lazy desde Mi billetera para que wagmi, viem y RainbowKit no pesen en el
 * resto de la app.
 */
const CargaConCripto: React.FC<Props> = (props) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={configWallet()}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="es-419" theme={lightTheme({ accentColor: '#1b4468' })}>
          <ModalCargaConCripto {...props} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default CargaConCripto;
