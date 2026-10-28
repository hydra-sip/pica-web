import React from 'react';
import { Link } from 'react-router-dom';
import { TicketDetalle, ReclamoRifa } from '../../api/rifaApi';
import { Badge, Card } from '../../shared/ui';
import {
  IconoTicket,
  IconoAlerta,
  IconoEspera,
  IconoListo,
  IconoHash,
} from '../../shared/ui/Iconos';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../formato';
import { fechaHora, pesos } from '../../shared/formato';
import { BotonReclamarTicket } from './BotonReclamarTicket';

export interface TicketCardProps {
  ticket: TicketDetalle;
  onReclamoExitoso?: (nuevoReclamo: ReclamoRifa) => void;
  className?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onReclamoExitoso,
  className = '',
}) => {
  const tieneReclamo = !!ticket.reclamo || ticket.rifaEstado === 'EN_REVISION';
  const esRifaFinalizada = ticket.rifaEstado === 'SORTEADA' || ticket.rifaEstado === 'EN_REVISION';

  return (
    <Card className={`ticket-card ${className}`} data-testid="ticket-card">
      <div className="ticket-encabezado">
        <div className="ticket-codigo-box">
          <IconoTicket size={24} className="ticket-icono" />
          <div>
            <span className="ticket-etiqueta">Comprobante de Ticket</span>
            <h2 className="ticket-codigo">{ticket.codigo}</h2>
          </div>
        </div>

        <div className="ticket-badges-box">
          <Badge tone={TONO_ESTADO_RIFA[ticket.rifaEstado]}>
            {ESTADO_RIFA_UI[ticket.rifaEstado]}
          </Badge>
          {ticket.reclamo && (
            <Badge tone="aviso" data-testid="badge-reclamo-tramite">
              Reclamo en trámite
            </Badge>
          )}
        </div>
      </div>

      <div className="ticket-cuerpo">
        <div className="ticket-info-principal">
          <div>
            <span className="ticket-dato-titulo">Rifa</span>
            <div className="ticket-dato-valor ticket-rifa-titulo">{ticket.rifaTitulo}</div>
          </div>
          {ticket.torneoNombre && (
            <div>
              <span className="ticket-dato-titulo">Torneo Asociado</span>
              <div className="ticket-dato-valor">{ticket.torneoNombre}</div>
            </div>
          )}
          <div>
            <span className="ticket-dato-titulo">Comprador</span>
            <div className="ticket-dato-valor">
              {ticket.compradorNombre}{' '}
              {ticket.compradorUsername && (
                <span className="ticket-username">(@{ticket.compradorUsername})</span>
              )}
            </div>
          </div>
        </div>

        <div className="ticket-seccion-numeros">
          <span className="ticket-dato-titulo">Números Asignados ({ticket.numeros.length})</span>
          <div className="ticket-numeros-grilla">
            {ticket.numeros.map((num) => (
              <span key={num} className="ticket-numero-chip">
                #{String(num).padStart(2, '0')}
              </span>
            ))}
          </div>
        </div>

        <div className="ticket-datos-pago">
          <div className="ticket-dato-item">
            <span className="ticket-dato-titulo">Monto Pagado</span>
            <span className="ticket-monto-valor">{pesos(ticket.monto)}</span>
          </div>
          <div className="ticket-dato-item">
            <span className="ticket-dato-titulo">Fecha de Compra</span>
            <span className="ticket-dato-valor">{fechaHora(ticket.creadoEn)}</span>
          </div>
          {ticket.sorteadaEn && (
            <div className="ticket-dato-item">
              <span className="ticket-dato-titulo">Fecha del Sorteo</span>
              <span className="ticket-dato-valor">{fechaHora(ticket.sorteadaEn)}</span>
            </div>
          )}
        </div>

        {/* Ventana de reclamo de 48 horas */}
        {esRifaFinalizada && (
          <div
            className={`ticket-ventana-aviso ${
              ticket.ventanaReclamoAbierta ? 'ventana-abierta' : 'ventana-cerrada'
            }`}
            data-testid="aviso-ventana-reclamo"
          >
            {ticket.ventanaReclamoAbierta ? (
              <>
                <IconoEspera size={20} className="ticket-icono-ventana" />
                <div>
                  <strong>Ventana de reclamo abierta:</strong> Tenés hasta 48 horas posteriores al
                  sorteo para disputar el resultado ante cualquier irregularidad.
                  {ticket.horasRestantesParaReclamar !== undefined &&
                    ticket.horasRestantesParaReclamar !== null && (
                      <span className="ticket-horas-restantes">
                        {' '}
                        (Quedan aprox. {ticket.horasRestantesParaReclamar} horas).
                      </span>
                    )}
                </div>
              </>
            ) : (
              <>
                <IconoAlerta size={20} className="ticket-icono-ventana" />
                <div>
                  <strong>Ventana de reclamo cerrada:</strong> El plazo reglamentario de 48 horas
                  posteriores a la finalización del sorteo ya venció.
                </div>
              </>
            )}
          </div>
        )}

        {/* Detalle del reclamo activo */}
        {tieneReclamo && ticket.reclamo && (
          <div className="ticket-reclamo-box" data-testid="seccion-reclamo-activo">
            <div className="ticket-reclamo-cabecera">
              <div className="ticket-reclamo-titulo-box">
                <IconoAlerta size={18} />
                <h3>Reclamo Registrado en Disputa</h3>
              </div>
              <Badge tone="aviso">En revisión</Badge>
            </div>
            <p className="ticket-reclamo-motivo">
              <strong>Motivo:</strong> {ticket.reclamo.motivo}
            </p>
            <div className="ticket-reclamo-meta">
              <span>Registrado el {fechaHora(ticket.reclamo.creadoEn)}</span>
              <span>Por {ticket.reclamo.usuarioNombre}</span>
            </div>
            <div className="ticket-reclamo-aviso-organizador">
              <IconoListo size={16} />
              <span>
                El reclamo fue notificado al organizador. El estado de la rifa permanece en revisión
                mientras se evalúa la disputa.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="ticket-pie">
        <div className="ticket-acciones">
          {esRifaFinalizada && (
            <BotonReclamarTicket
              ticket={ticket}
              onReclamoExitoso={onReclamoExitoso}
            />
          )}

          <Link to="/verificacion" className="btn btn-secundario ticket-btn-verificar">
            <IconoHash size={16} />
            <span>Verificar sorteo en portal público</span>
          </Link>
        </div>
      </div>
    </Card>
  );
};
