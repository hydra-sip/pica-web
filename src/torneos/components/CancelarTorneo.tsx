import React, { useEffect, useState } from 'react';
import { CancelacionDelTorneo, cancelacionApi } from '../../api/cancelacionApi';
import { CustodiaResumen, custodiaApi } from '../../api/custodiaApi';
import { pesos } from '../../shared/formato';
import { mensajeDeError, mensajesDelBackPorCampo } from '../../shared/mensajesError';
import { Button, Field, Input, Modal, Textarea } from '../../shared/ui';

/** Un gasto mientras se carga: el monto queda como lo escribió el organizador. */
interface GastoEnCarga {
  clave: number;
  concepto: string;
  monto: string;
  comprobante: File | null;
}

const SIN_COMPROBANTE = 'Debe adjuntar un comprobante válido por cada gasto declarado';
const FORMATOS = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

interface CancelarTorneoProps {
  torneoId: number;
  /** Después de cancelar: la consola se recarga y muestra el mensaje. */
  onCancelado: (mensaje: string) => void;
}

/**
 * HU-605 (wireframe «Modal Cancelacion y Reintegro»): el organizador cancela su torneo con un motivo que leen los
 * participantes. Sin gastos se ejecuta en el momento y se devuelve todo; con gastos (cada uno con su comprobante y sin
 * pasarse del tope) va a revisión de soporte y la plata sigue en custodia. El botón solo se muestra donde se puede
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
  const [gastos, setGastos] = useState<GastoEnCarga[]>([]);
  const [siguienteClave, setSiguienteClave] = useState(1);
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});

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
    setGastos([]);
    setErroresCampo({});
  };

  const agregarGasto = () => {
    setGastos((g) => [...g, { clave: siguienteClave, concepto: '', monto: '', comprobante: null }]);
    setSiguienteClave((c) => c + 1);
  };

  const cambiarGasto = (clave: number, cambio: Partial<GastoEnCarga>) =>
    setGastos((g) => g.map((x) => (x.clave === clave ? { ...x, ...cambio } : x)));

  const quitarGasto = (clave: number) => setGastos((g) => g.filter((x) => x.clave !== clave));

  const ejecutar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await cancelacionApi.cancelar(
        torneoId,
        motivo.trim(),
        gastos.map((g) => ({
          concepto: g.concepto.trim(),
          monto: Number(g.monto),
          comprobante: g.comprobante,
        }))
      );
      cerrar();
      onCancelado(
        conGastos
          ? 'Cancelación enviada a revisión de soporte.'
          : 'Torneo cancelado: se devolvió todo a los participantes.'
      );
    } catch (err) {
      const porCampo = mensajesDelBackPorCampo(err);
      setErroresCampo(porCampo);
      setError(
        Object.keys(porCampo).length > 0
          ? null
          : mensajeDeError(err, 'No se pudo cancelar el torneo.')
      );
    } finally {
      setEnviando(false);
    }
  };

  const conGastos = gastos.length > 0;
  const total = gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const faltaComprobante = gastos.some((g) => !g.comprobante);
  const gastosIncompletos = gastos.some((g) => !g.concepto.trim() || !(Number(g.monto) > 0));
  const sobreTope = tope !== null && total > tope.maximoGastos;
  const listo =
    motivo.trim().length > 0 &&
    confirmado &&
    !faltaComprobante &&
    !gastosIncompletos &&
    !sobreTope &&
    (!conGastos || tope !== null);

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
              {conGastos ? 'Enviar a revisión de soporte' : 'Ejecutar cancelación y reintegro'}
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
        <Field
          label="Motivo de la cancelación (lo ven los participantes)"
          required
          error={erroresCampo.motivo}
        >
          <Textarea
            rows={3}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Field>
        <section className="torneos-cancelacion-gastos" aria-label="Gastos a retener">
          <h3>Gastos a retener (opcional)</h3>
          <p className="torneos-subtitulo">
            Si ya pagaste gastos del torneo, declaralos con su comprobante: soporte los revisa antes
            de devolver el resto. Sin gastos, se devuelve todo en el momento.
          </p>
          {gastos.map((g, i) => {
            const n = i + 1;
            const campo = `gastos[${i}]`;
            return (
              <div key={g.clave} className="torneos-cancelacion-gasto">
                <Field label={`Concepto del gasto ${n}`} error={erroresCampo[`${campo}.concepto`]}>
                  <Input
                    maxLength={255}
                    value={g.concepto}
                    onChange={(e) => cambiarGasto(g.clave, { concepto: e.target.value })}
                  />
                </Field>
                <Field label={`Monto del gasto ${n} ($)`} error={erroresCampo[`${campo}.monto`]}>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={g.monto}
                    onChange={(e) => cambiarGasto(g.clave, { monto: e.target.value })}
                  />
                </Field>
                <Field
                  label={`Comprobante del gasto ${n}`}
                  hint="PDF, JPG o PNG, hasta 5 MB"
                  error={erroresCampo[`${campo}.comprobante`]}
                >
                  <Input
                    type="file"
                    accept={FORMATOS}
                    onChange={(e) =>
                      cambiarGasto(g.clave, { comprobante: e.target.files?.[0] ?? null })
                    }
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Quitar el gasto ${n}`}
                  onClick={() => quitarGasto(g.clave)}
                >
                  Quitar
                </Button>
              </div>
            );
          })}
          <Button variant="secondary" size="sm" onClick={agregarGasto}>
            Agregar gasto
          </Button>
          {conGastos && tope && (
            <p className="torneos-subtitulo">
              Total declarado: {pesos(total)} de {pesos(tope.maximoGastos)}
            </p>
          )}
          {faltaComprobante && (
            <div className="alerta alerta-aviso" role="status">
              {SIN_COMPROBANTE}
            </div>
          )}
          {sobreTope && tope && (
            <div className="alerta alerta-peligro" role="alert">
              Los gastos a retener no pueden superar el {tope.pctMaximo}% del pozo. El monto
              excedente debe ser devuelto a los participantes.
            </div>
          )}
        </section>
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
