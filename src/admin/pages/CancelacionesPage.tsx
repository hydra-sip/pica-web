import React, { useCallback, useEffect, useState } from 'react';
import { CancelacionEnRevision, cancelacionApi } from '../../api/cancelacionApi';
import { fechaHora, pesos } from '../../shared/formato';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import { Button, Card, Field, Modal, Table, Textarea } from '../../shared/ui';
import { ConfirmModal } from '../components/ConfirmModal';
import './CancelacionesPage.css';

/**
 * HU-605 (T605-3): la cola de soporte. Las cancelaciones con gastos, de la más vieja a la más nueva; al abrir una se ven
 * el motivo y cada gasto, con su comprobante para abrir en otra pestaña. Se aprueban o se rechazan todos los gastos
 * juntos; antes de confirmar se ve el efecto. No hay wireframe propio: sigue el estilo de las demás pantallas del
 * backoffice, y el rechazo, el modal «Congelar fondos».
 */

/** 15,02: el % de su inscripción que se le descuenta a cada uno si se aprueban los gastos. */
const descuento = (c: CancelacionEnRevision): string =>
  c.pozo > 0
    ? (Math.round((c.totalGastos / c.pozo) * 10000) / 100).toString().replace('.', ',')
    : '0';
export const CancelacionesPage: React.FC = () => {
  const [cola, setCola] = useState<CancelacionEnRevision[] | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [aprobando, setAprobando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => {
    cancelacionApi
      .cola()
      .then((pagina) => setCola(pagina.content))
      .catch((err) => setError(mensajeDeError(err, 'No se pudo cargar la cola.')));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const verComprobante = async (torneoId: number, gastoId: number) => {
    // Se abre antes del await: si no, el navegador lo toma como popup y lo bloquea.
    const ventana = window.open('', '_blank');
    try {
      const url = URL.createObjectURL(await cancelacionApi.comprobante(torneoId, gastoId));
      if (ventana) ventana.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      ventana?.close();
      setError(mensajeDeError(err, 'No se pudo abrir el comprobante.'));
    }
  };

  const detalle = cola?.find((c) => c.torneoId === abierta) ?? null;

  const resolver = async (caso: CancelacionEnRevision, aprobar: boolean) => {
    setEnviando(true);
    setError(null);
    setMensaje(null);
    try {
      const resolucion = aprobar
        ? await cancelacionApi.aprobar(caso.torneoId)
        : await cancelacionApi.rechazar(caso.torneoId, motivoRechazo.trim());
      setMensaje(
        aprobar
          ? `Se aprobaron los gastos de ${caso.torneoNombre}: el organizador cobró ${pesos(resolucion.alOrganizador)}.`
          : `Se rechazaron los gastos de ${caso.torneoNombre}: se devolvió todo a los participantes.`
      );
      setAbierta(null);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo resolver la cancelación.'));
      if (codigoDeError(err) !== 'CANCELACION_YA_RESUELTA') return;
      setAbierta(null);
    } finally {
      setEnviando(false);
      setAprobando(false);
      setRechazando(false);
      setMotivoRechazo('');
    }
    cargar();
  };

  return (
    <div className="cancelaciones-page">
      <div>
        <h1>Cancelaciones en revisión</h1>
        <p className="cancelaciones-subtitulo">
          Torneos que el organizador canceló declarando gastos. La plata sigue en custodia hasta que
          los apruebes o los rechaces.
        </p>
      </div>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="alerta alerta-exito" role="status">
          {mensaje}
        </div>
      )}

      {cola === null && !error && <p>Cargando...</p>}

      {cola !== null && cola.length === 0 && (
        <Card>
          <p className="cancelaciones-vacia">No hay cancelaciones esperando revisión.</p>
        </Card>
      )}

      {cola !== null && cola.length > 0 && (
        <Table caption="Cancelaciones en revisión, de la más vieja a la más nueva">
          <thead>
            <tr>
              <th>Torneo</th>
              <th>Organizador</th>
              <th>Pedida</th>
              <th>Pozo</th>
              <th>Gastos</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {cola.map((c) => (
              <tr key={c.torneoId}>
                <td>{c.torneoNombre}</td>
                <td>
                  {c.organizador.nombreCompleto}{' '}
                  <span className="cancelaciones-usuario">@{c.organizador.username}</span>
                </td>
                <td>{fechaHora(c.pedidaEn)}</td>
                <td>{pesos(c.pozo)}</td>
                <td>{pesos(c.totalGastos)}</td>
                <td>
                  <Button
                    size="sm"
                    variant={abierta === c.torneoId ? 'primary' : 'secondary'}
                    aria-label={`Revisar ${c.torneoNombre}`}
                    onClick={() => setAbierta(abierta === c.torneoId ? null : c.torneoId)}
                  >
                    Revisar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {detalle && (
        <section aria-label={`Cancelación de ${detalle.torneoNombre}`}>
          <Card>
            <h2>{detalle.torneoNombre}</h2>
            <h3 className="cancelaciones-titulo">Motivo del organizador</h3>
            <p>{detalle.motivo}</p>
            <h3 className="cancelaciones-titulo">Gastos declarados</h3>
            <ul className="cancelaciones-gastos">
              {detalle.gastos.map((g) => (
                <li key={g.id}>
                  <span>{g.concepto}</span>
                  <span>{pesos(g.monto)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Ver comprobante de ${g.concepto}`}
                    onClick={() => void verComprobante(detalle.torneoId, g.id)}
                  >
                    Ver comprobante
                  </Button>
                </li>
              ))}
              <li className="cancelaciones-total">
                <span>Total</span>
                <span>{pesos(detalle.totalGastos)}</span>
                <span />
              </li>
            </ul>
            <div className="cancelaciones-acciones">
              <Button variant="danger" onClick={() => setRechazando(true)}>
                Rechazar gastos
              </Button>
              <Button onClick={() => setAprobando(true)}>Aprobar gastos</Button>
            </div>
          </Card>
        </section>
      )}

      {detalle && (
        <ConfirmModal
          isOpen={aprobando}
          title={`Aprobar los gastos de ${detalle.torneoNombre}`}
          message={`El organizador cobra ${pesos(detalle.totalGastos)}. A cada inscripto se le descuenta el ${descuento(detalle)} % de su inscripción; los gastos administrativos vuelven enteros.`}
          confirmText="Aprobar"
          variant="primary"
          isLoading={enviando}
          onConfirm={() => void resolver(detalle, true)}
          onClose={() => setAprobando(false)}
        />
      )}

      {detalle && (
        <Modal
          isOpen={rechazando}
          title={`Rechazar los gastos de ${detalle.torneoNombre}`}
          onClose={() => {
            setRechazando(false);
            setMotivoRechazo('');
          }}
          closeDisabled={enviando}
          footer={
            <>
              <Button
                variant="secondary"
                disabled={enviando}
                onClick={() => {
                  setRechazando(false);
                  setMotivoRechazo('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                loading={enviando}
                disabled={!motivoRechazo.trim()}
                onClick={() => void resolver(detalle, false)}
              >
                Rechazar y devolver todo
              </Button>
            </>
          }
        >
          <p>
            Se devuelve el 100 % a cada participante y el organizador no cobra nada. El motivo les
            llega a todos por mail.
          </p>
          <Field label="Motivo del rechazo (obligatorio para la auditoría)" required>
            <Textarea
              rows={3}
              maxLength={500}
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
            />
          </Field>
        </Modal>
      )}
    </div>
  );
};
