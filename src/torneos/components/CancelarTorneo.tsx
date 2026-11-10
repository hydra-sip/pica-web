import React, { useEffect, useState } from 'react';
import { CancelacionDelTorneo, cancelacionApi } from '../../api/cancelacionApi';
import { CustodiaResumen, custodiaApi } from '../../api/custodiaApi';
import { pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Field, Modal, Textarea } from '../../shared/ui';

interface CancelarTorneoProps {
  torneoId: number;
  /** Después de cancelar: la consola se recarga y muestra el mensaje. */
  onCancelado: (mensaje: string) => void;
}

/**
 * HU-605 (wireframe «Modal Cancelacion y Reintegro»): el organizador cancela su torneo con un motivo que leen los
 * participantes. Sin gastos se ejecuta en el momento y se devuelve todo. El botón solo se muestra donde se puede
 * cancelar; eso lo decide la consola.
 */
export const CancelarTorneo: React.FC<CancelarTorneoProps> = ({ torneoId, onCancelado }) => {
  const [abierto, setAbierto] = useState(false);
  const [custodia, setCustodia] = useState<CustodiaResumen | null>(null);
  const [tope, setTope] = useState<CancelacionDelTorneo | null>(null);
  const [motivo, setMotivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    custodiaApi
      .obtener('torneos', torneoId)
      .then(setCustodia)
      .catch(() => setCustodia(null));
    cancelacionApi
      .detalle(torneoId)
      .then(setTope)
      .catch(() => setTope(null));
  }, [abierto, torneoId]);

  const cerrar = () => {
    setAbierto(false);
    setMotivo('');
    setConfirmado(false);
    setError(null);
  };

  const ejecutar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await cancelacionApi.cancelar(torneoId, motivo.trim());
      cerrar();
      onCancelado('Torneo cancelado: se devolvió todo a los participantes.');
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cancelar el torneo.'));
    } finally {
      setEnviando(false);
    }
  };

  const listo = motivo.trim().length > 0 && confirmado;

  return (
    <>
      <Button variant="danger" onClick={() => setAbierto(true)}>
        Cancelar torneo
      </Button>
      <Modal
        isOpen={abierto}
        title="¿Cancelar el torneo y devolver la plata?"
        onClose={cerrar}
        closeDisabled={enviando}
        footer={
          <>
            <Button variant="secondary" disabled={enviando} onClick={cerrar}>
              Volver a la consola
            </Button>
            <Button
              variant="danger"
              loading={enviando}
              disabled={!listo}
              onClick={() => void ejecutar()}
            >
              Ejecutar cancelación y reintegro
            </Button>
          </>
        }
      >
        <p>
          Esto suspende el torneo de forma definitiva y{' '}
          <strong>devuelve lo que pagó cada uno</strong>, inscripción y gastos administrativos, a su
          billetera.
        </p>
        <dl className="torneos-cancelacion-resumen">
          <div>
            <dt>Total en custodia</dt>
            <dd>{custodia ? pesos(custodia.total) : '-'}</dd>
          </div>
          <div>
            <dt>Pagaron</dt>
            <dd>
              {custodia ? `${custodia.pagos} ${custodia.pagos === 1 ? 'pago' : 'pagos'}` : '-'}
            </dd>
          </div>
          <div>
            <dt>Destino del reintegro</dt>
            <dd>Billetera de cada participante</dd>
          </div>
          {tope && (
            <div>
              <dt>Gastos que podés retener</dt>
              <dd>
                Hasta {pesos(tope.maximoGastos)} ({tope.pctMaximo} % del pozo de {pesos(tope.pozo)})
              </dd>
            </div>
          )}
        </dl>
        <Field label="Motivo de la cancelación (lo ven los participantes)" required>
          <Textarea
            rows={3}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Field>
        <label className="torneos-cancelacion-confirmo">
          <input
            type="checkbox"
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
          />
          Confirmo la cancelación irreversible y el reintegro.
        </label>
        {error && (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        )}
      </Modal>
    </>
  );
};
