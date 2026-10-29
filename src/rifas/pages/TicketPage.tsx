import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TicketDetalle, ReclamoRifa, rifaApi } from '../../api/rifaApi';
import { TicketCard } from '../components/TicketCard';
import { IconoAlerta, IconoListo, IconoRefrescar } from '../../shared/ui/Iconos';
import { mensajeDeError } from '../../shared/mensajesError';
import '../rifas.css';

export const TicketPage: React.FC = () => {
  const { ticketId, id } = useParams<{ ticketId?: string; id?: string }>();
  const idABuscar = ticketId || id;

  const [ticket, setTicket] = useState<TicketDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    if (!idABuscar) {
      setError('Identificador de ticket no proporcionado.');
      setCargando(false);
      return;
    }

    let montado = true;
    setCargando(true);
    setError(null);

    rifaApi
      .obtenerTicket(idABuscar)
      .then((datos) => {
        if (montado) {
          setTicket(datos);
        }
      })
      .catch((err: unknown) => {
        if (montado) {
          setError(mensajeDeError(err, 'No se pudo cargar la información del ticket.'));
        }
      })
      .finally(() => {
        if (montado) {
          setCargando(false);
        }
      });

    return () => {
      montado = false;
    };
  }, [idABuscar]);

  const handleReclamoExitoso = (nuevoReclamo: ReclamoRifa) => {
    setTicket((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rifaEstado: 'EN_REVISION',
        reclamo: nuevoReclamo,
      };
    });
    setMensajeExito(
      'Reclamo registrado con éxito. El organizador fue notificado y la rifa pasó a estado "En revisión".'
    );
  };

  return (
    <div className="rifas-page ticket-page-contenedor">
      <div className="rifas-encabezado">
        <div>
          <Link to="/mis-tickets" className="rifas-volver">
            &larr; Mis tickets
          </Link>
          <h1 className="ticket-page-titulo">Detalle de Ticket de Rifa</h1>
        </div>
      </div>

      {cargando && (
        <div className="ticket-cargando">
          <IconoRefrescar size={28} className="spin" />
          <p>Cargando información del ticket...</p>
        </div>
      )}

      {error && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>{error}</span>
        </div>
      )}

      {mensajeExito && (
        <div role="status" className="alerta alerta-exito" data-testid="alerta-exito-reclamo">
          <IconoListo size={20} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {!cargando && ticket && (
        <TicketCard ticket={ticket} onReclamoExitoso={handleReclamoExitoso} />
      )}
    </div>
  );
};
