import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketDetalle, rifaApi } from '../../api/rifaApi';
import { Badge, Card } from '../../shared/ui';
import { IconoTicket, IconoAlerta, IconoRefrescar, IconoEspera } from '../../shared/ui/Iconos';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../formato';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import '../rifas.css';

export const MisTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<TicketDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;
    setCargando(true);
    rifaApi
      .misTickets()
      .then((data) => {
        if (montado) setTickets(data);
      })
      .catch((err: unknown) => {
        if (montado) {
          setError(mensajeDeError(err, 'No se pudieron cargar tus tickets.'));
        }
      })
      .finally(() => {
        if (montado) setCargando(false);
      });

    return () => {
      montado = false;
    };
  }, []);

  return (
    <div className="rifas-page mis-tickets-contenedor">
      <div className="rifas-encabezado">
        <div>
          <h1 className="ticket-page-titulo">Mis Tickets de Rifa</h1>
          <p className="rifas-subtitulo">
            Consultá los tickets que compraste, el estado de los sorteos y disputá resultados si detectás irregularidades.
          </p>
        </div>
      </div>

      {cargando && (
        <div className="ticket-cargando">
          <IconoRefrescar size={28} className="spin" />
          <p>Cargando tus tickets...</p>
        </div>
      )}

      {error && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>{error}</span>
        </div>
      )}

      {!cargando && !error && tickets.length === 0 && (
        <Card className="rifas-vacio">
          <IconoTicket size={36} />
          <h2>No tenés tickets comprados</h2>
          <p>Los tickets que compres en rifas aparecerán listados acá.</p>
          <Link to="/rifas" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
            Ver rifas en venta
          </Link>
        </Card>
      )}

      {!cargando && tickets.length > 0 && (
        <div className="mis-tickets-grilla">
          {tickets.map((t) => (
            <Card key={t.id} className="mis-tickets-item">
              <div className="mis-tickets-item-cabecera">
                <div className="mis-tickets-codigo">
                  <IconoTicket size={18} />
                  <span>{t.codigo}</span>
                </div>
                <div className="ticket-badges-box">
                  <Badge tone={TONO_ESTADO_RIFA[t.rifaEstado]}>
                    {ESTADO_RIFA_UI[t.rifaEstado]}
                  </Badge>
                  {t.reclamo && <Badge tone="aviso">Reclamo en trámite</Badge>}
                </div>
              </div>

              <div className="mis-tickets-item-cuerpo">
                <h3 className="mis-tickets-rifa-titulo">{t.rifaTitulo}</h3>
                {t.torneoNombre && (
                  <p className="mis-tickets-torneo-nombre">{t.torneoNombre}</p>
                )}

                <div className="mis-tickets-numeros">
                  <span>Números:</span>
                  <div className="ticket-numeros-grilla">
                    {t.numeros.map((n) => (
                      <span key={n} className="ticket-numero-chip">
                        #{String(n).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mis-tickets-meta">
                  <span>Pagaste: {pesos(t.monto + t.comision)}</span>
                  <span>Comprado: {fechaHora(t.creadoEn)}</span>
                </div>

                {t.sorteadaEn && (
                  <div className="mis-tickets-ventana-status">
                    {t.ventanaReclamoAbierta ? (
                      <span className="badge badge-info">
                        <IconoEspera size={14} />
                        <span>Ventana de reclamo abierta (48h)</span>
                      </span>
                    ) : (
                      <span className="badge badge-neutral">
                        <span>Plazo de 48h finalizado</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mis-tickets-item-pie">
                <Link to={`/tickets/${t.id}`} className="btn btn-secondary" style={{ width: '100%' }}>
                  Ver comprobante y acciones
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
