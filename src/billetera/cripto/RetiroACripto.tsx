import React, { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { billeteraApi, type LimitesRetiro, type RetiroCripto } from '../../api/billeteraApi';
import { pesos } from '../../shared/formato';
import { Modal } from '../../shared/ui';
import { IconoAlerta, IconoCheck } from '../../shared/ui/Iconos';
import { eth } from './cargaCripto';
import { Alerta, EnlaceBaseScan } from './CargaConCripto';
import { FAUCET_BASE_SEPOLIA } from './pasarelaCargas';
import { ProveedoresWallet } from './ProveedoresWallet';
import { horaDeVencimiento, walletCorta } from './retiroCripto';
import { useRetiroCripto } from './useRetiroCripto';

interface Props {
  saldoDisponible: number;
  limites: LimitesRetiro;
  onCerrar: () => void;
  /** El back ya descontó el saldo: Mi billetera lo vuelve a leer. */
  onPedido: (retiro: RetiroCripto) => void;
  onCobrado: (retiro: RetiroCripto) => void;
}

const ModalRetiroACripto: React.FC<Props> = ({
  saldoDisponible,
  limites,
  onCerrar,
  onPedido,
  onCobrado,
}) => {
  const { isConnected, chainId, address } = useAccount();
  const { switchChain, isPending: cambiandoDeRed } = useSwitchChain();
  const enOtraRed = isConnected && chainId !== baseSepolia.id;
  const { estado, pedir, retomar, cobrar, reintentar } = useRetiroCripto({ onPedido, onCobrado });
  const [montoTexto, setMontoTexto] = useState('');
  const [pendientes, setPendientes] = useState<RetiroCripto[]>([]);
  const ocupado = estado.fase === 'pidiendo' || estado.fase === 'firmando';

  // los permisos pedidos antes que todavía se pueden cobrar
  useEffect(() => {
    let vigente = true;
    billeteraApi
      .retirosCriptoPendientes()
      .then((lista) => vigente && setPendientes(lista))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  const continuar = (e: React.FormEvent) => {
    e.preventDefault();
    void pedir(montoTexto, limites, saldoDisponible);
  };

  const botonCobrar = (retiro: RetiroCripto, texto = 'Cobrar con MetaMask') => (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => void cobrar(retiro)}
      disabled={enOtraRed}
    >
      {texto}
    </button>
  );

  return (
    <Modal isOpen onClose={onCerrar} title="Retirar a la wallet" closeDisabled={ocupado}>
      <div className="billetera-modal-form">
        <ConnectButton chainStatus="icon" showBalance={false} />

        {enOtraRed && (
          <Alerta>
            Estás en otra red: el retiro se cobra en Base Sepolia.{' '}
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

        {(estado.fase === 'inicial' || estado.fase === 'pidiendo') && (
          <>
            {pendientes.length > 0 && (
              <section aria-labelledby="retiros-sin-cobrar">
                <h3 id="retiros-sin-cobrar" className="billetera-cripto-texto">
                  Retiros sin cobrar
                </h3>
                <ul className="billetera-retiros-pendientes">
                  {pendientes.map((r) => (
                    <li key={r.referencia}>
                      <span>
                        {pesos(r.montoPesos)} ({eth(r.montoWei)} ETH) a {walletCorta(r.destino)} ·
                        hasta las {horaDeVencimiento(r.vence)}
                      </span>{' '}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => retomar(r)}
                      >
                        Cobrar
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <form onSubmit={continuar} className="billetera-modal-form">
              <p className="billetera-cripto-texto">
                Recibís el monto en ETH de Base Sepolia en tu wallet conectada
                {address ? ` (${walletCorta(address)})` : ''}. El saldo se descuenta al pedirlo y,
                si no lo cobrás en una hora, vuelve a tu billetera.
              </p>
              {estado.fase === 'inicial' && estado.error && <Alerta>{estado.error}</Alerta>}
              <div className="billetera-modal-campo">
                <label htmlFor="monto-retiro-cripto">Monto a retirar (ARS) *</label>
                <input
                  id="monto-retiro-cripto"
                  type="text"
                  inputMode="decimal"
                  placeholder={`Ej: ${limites.minimo}`}
                  value={montoTexto}
                  onChange={(e) => setMontoTexto(e.target.value)}
                  disabled={ocupado}
                />
                <small>
                  Disponible {pesos(saldoDisponible)} · mínimo {pesos(limites.minimo)} · máximo{' '}
                  {pesos(limites.maximo)}
                </small>
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
                  {estado.fase === 'pidiendo' ? 'Preparando...' : 'Continuar'}
                </button>
              </div>
            </form>
          </>
        )}

        {estado.fase === 'listoParaCobrar' && (
          <>
            <p>
              Vas a recibir {eth(estado.retiro.montoWei)} ETH por {pesos(estado.retiro.montoPesos)}{' '}
              en {walletCorta(estado.retiro.destino)}. Podés cobrarlo hasta las{' '}
              {horaDeVencimiento(estado.retiro.vence)}.
            </p>
            <div className="billetera-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCerrar}>
                Cobrar más tarde
              </button>
              {botonCobrar(estado.retiro)}
            </div>
          </>
        )}

        {estado.fase === 'firmando' && (
          <p role="status">Firmando: confirmá el cobro en tu wallet.</p>
        )}

        {estado.fase === 'confirmando' && (
          <p role="status">
            Confirmando el cobro en la red… <EnlaceBaseScan hash={estado.hash} />
          </p>
        )}

        {estado.fase === 'demorado' && (
          <>
            <div role="status" className="alerta alerta-aviso">
              <IconoAlerta size={18} />
              <span>
                Todavía no se confirmó: la red puede tardar más de lo normal. Si ya lo cobraste, no
                lo cobres de nuevo. <EnlaceBaseScan hash={estado.hash} />
              </span>
            </div>
            <div className="billetera-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCerrar}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void reintentar(estado.retiro, estado.hash)}
              >
                Reintentar
              </button>
            </div>
          </>
        )}

        {estado.fase === 'cobrado' && (
          <>
            <div role="status" className="alerta alerta-exito">
              <IconoCheck size={18} />
              <span>
                Cobrado: {eth(estado.retiro.montoWei)} ETH en tu wallet.{' '}
                <EnlaceBaseScan hash={estado.hash} />
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
              {/* el permiso sigue valiendo: sin cobro, se puede volver a intentar */}
              {['firmaRechazada', 'sinFondos', 'otraWallet', 'revertida', 'inesperado'].includes(
                estado.error.tipo
              ) && botonCobrar(estado.retiro, 'Cobrar de nuevo')}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

/**
 * HU-610: Retirar a la wallet. Se carga con lazy desde Mi billetera, como Cargar con cripto, para que wagmi, viem
 * y RainbowKit no pesen en el resto de la app.
 */
const RetiroACripto: React.FC<Props> = (props) => (
  <ProveedoresWallet>
    <ModalRetiroACripto {...props} />
  </ProveedoresWallet>
);

export default RetiroACripto;
