import React, { useState } from 'react';
import { TicketDetalle, ReclamoRifa, rifaApi } from '../../api/rifaApi';
import { Button, Modal } from '../../shared/ui';
import { IconoAlerta, IconoListo, IconoEspera } from '../../shared/ui/Iconos';
import { mensajeDeError } from '../../shared/mensajesError';
import { fechaHora } from '../../shared/formato';

export interface BotonReclamarTicketProps {
  ticket: TicketDetalle;
  /** El último reclamo propio en la rifa, de GET /rifas/{id}/reclamos. */
  reclamo?: ReclamoRifa | null;
  onReclamoExitoso?: (nuevoReclamo: ReclamoRifa) => void;
  className?: string;
}

export const BotonReclamarTicket: React.FC<BotonReclamarTicketProps> = ({
  ticket,
  reclamo,
  onReclamoExitoso,
  className = '',
}) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Si la rifa está en revisión por el reclamo de otro comprador, este todavía puede reclamar
  const tieneReclamoPendiente = reclamo?.estado === 'PENDIENTE';

  const abrirModal = () => {
    setError(null);
    setExito(null);
    setMotivo('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (!enviando) {
      setModalAbierto(false);
      setError(null);
      setExito(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('El motivo del reclamo es obligatorio.');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const nuevoReclamo = await rifaApi.reclamar(ticket.rifaId, { motivo: motivo.trim() });

      setExito('Reclamo registrado con éxito. Se notificó al organizador y el estado de la rifa ahora está en revisión.');
      onReclamoExitoso?.(nuevoReclamo);

      setTimeout(() => {
        setModalAbierto(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = mensajeDeError(err, 'No se pudo registrar el reclamo. Verificá los requisitos.');
      setError(msg);
    } finally {
      setEnviando(false);
    }
  };

  if (tieneReclamoPendiente) {
    return (
      <div className={`ticket-reclamo-en-curso ${className}`}>
        <span className="badge badge-aviso">
          <IconoEspera size={14} />
          <span>Reclamo en revisión</span>
        </span>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={abrirModal}
        disabled={!ticket.ventanaReclamoAbierta}
        className={className}
        aria-label="Reclamar resultado del sorteo"
      >
        <IconoAlerta size={16} />
        <span>Reclamar resultado</span>
      </Button>

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        closeDisabled={enviando}
        title="Reclamar resultado del sorteo"
        size="md"
      >
        <form onSubmit={handleSubmit} noValidate className="ticket-modal-reclamo">
          <div className="ticket-modal-info">
            <p>
              Como comprador podés disputar el resultado de la rifa dentro de las{' '}
              <strong>48 horas posteriores a su finalización</strong> si detectás una irregularidad.
            </p>
            <div className="ticket-modal-datos">
              <div>
                <span className="ticket-modal-label">Rifa:</span> {ticket.rifaTitulo}
              </div>
              <div>
                <span className="ticket-modal-label">Ticket:</span> {ticket.codigo}
              </div>
              {ticket.sorteadaEn && (
                <div>
                  <span className="ticket-modal-label">Fecha del sorteo:</span>{' '}
                  {fechaHora(ticket.sorteadaEn)}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div role="alert" className="alerta alerta-peligro">
              <IconoAlerta size={18} />
              <span>{error}</span>
            </div>
          )}

          {exito && (
            <div role="status" className="alerta alerta-exito">
              <IconoListo size={18} />
              <span>{exito}</span>
            </div>
          )}

          <div className="field-group">
            <label htmlFor="motivo-reclamo" className="field-label">
              Motivo del reclamo / Irregularidad detectada
            </label>
            <textarea
              id="motivo-reclamo"
              name="motivo"
              rows={4}
              className="field-textarea"
              placeholder="Describí detalladamente la irregularidad observada en el sorteo o los resultados..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={enviando || !!exito}
              required
            />
            <span className="field-ayuda">
              Al confirmar, el reclamo quedará registrado, se notificará al organizador y el estado
              de la rifa pasará a &quot;En revisión&quot; mientras se evalúa la disputa.
            </span>
          </div>

          <div className="modal-acciones">
            <Button
              type="button"
              variant="secondary"
              onClick={cerrarModal}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={enviando || !!exito}
            >
              {enviando ? 'Enviando...' : 'Confirmar reclamo'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
