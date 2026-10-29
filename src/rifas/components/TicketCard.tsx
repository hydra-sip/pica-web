import React from 'react';
import { Link } from 'react-router-dom';
import { EstadoReclamo, TicketDetalle, ReclamoRifa } from '../../api/rifaApi';
import { Badge, BadgeTone, Card } from '../../shared/ui';
import {
  IconoTicket,
  IconoAlerta,
  IconoDescargar,
  IconoEspera,
  IconoListo,
  IconoHash,
} from '../../shared/ui/Iconos';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../formato';
import { fechaHora, pesos } from '../../shared/formato';
import { BotonReclamarTicket } from './BotonReclamarTicket';

export interface TicketCardProps {
  ticket: TicketDetalle;
  /** El último reclamo propio en la rifa, si hay. */
  reclamo?: ReclamoRifa | null;
  onReclamoExitoso?: (nuevoReclamo: ReclamoRifa) => void;
  className?: string;
}

const RECLAMO_UI: Record<EstadoReclamo, { texto: string; tono: BadgeTone }> = {
  PENDIENTE: { texto: 'En revisión', tono: 'aviso' },
  ACEPTADO: { texto: 'Aceptado', tono: 'exito' },
  RECHAZADO: { texto: 'Rechazado', tono: 'peligro' },
};

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  reclamo,
  onReclamoExitoso,
  className = '',
}) => {
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
          {reclamo?.estado === 'PENDIENTE' && (
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
            <span className="ticket-dato-titulo">Pagaste</span>
            <span className="ticket-monto-valor" data-testid="ticket-total">
              {pesos(ticket.monto + ticket.comision)}
            </span>
            <span className="ticket-dato-detalle">
              {pesos(ticket.monto)} de números + {pesos(ticket.comision)} de gastos administrativos
            </span>
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
        {reclamo && (
          <div className="ticket-reclamo-box" data-testid="seccion-reclamo-activo">
            <div className="ticket-reclamo-cabecera">
              <div className="ticket-reclamo-titulo-box">
                <IconoAlerta size={18} />
                <h3>Reclamo Registrado en Disputa</h3>
              </div>
              <Badge tone={RECLAMO_UI[reclamo.estado].tono}>{RECLAMO_UI[reclamo.estado].texto}</Badge>
            </div>
            <p className="ticket-reclamo-motivo">
              <strong>Motivo:</strong> {reclamo.motivo}
            </p>
            <div className="ticket-reclamo-meta">
              <span>Registrado el {fechaHora(reclamo.creadoEn)}</span>
            </div>
            {reclamo.estado === 'PENDIENTE' ? (
              <div className="ticket-reclamo-aviso-organizador">
                <IconoListo size={16} />
                <span>
                  El reclamo fue notificado al organizador. El estado de la rifa permanece en
                  revisión mientras se evalúa la disputa.
                </span>
              </div>
            ) : (
              reclamo.resolucion && (
                <p className="ticket-reclamo-motivo">
                  <strong>Resolución:</strong> {reclamo.resolucion}
                </p>
              )
            )}
          </div>
        )}
      </div>

      <div className="ticket-pie">
        <div className="ticket-acciones">
          {esRifaFinalizada && ticket.esComprador && (
            <BotonReclamarTicket
              ticket={ticket}
              reclamo={reclamo}
              onReclamoExitoso={onReclamoExitoso}
            />
          )}

          {/* HU-404: se guarda como PDF desde la impresión del navegador */}
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <IconoDescargar size={16} />
            <span>Descargar comprobante</span>
          </button>

          <Link to="/verificacion" className="btn btn-secondary ticket-btn-verificar">
            <IconoHash size={16} />
            <span>Verificar sorteo en portal público</span>
          </Link>
        </div>
      </div>
    </Card>
  );
};
