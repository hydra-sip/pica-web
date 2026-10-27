import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckinPartido, PartidoDetalle, partidoApi } from '../../api/partidoApi';
import { fechaHora } from '../../shared/formato';
import { Badge } from '../../shared/ui';
import { EN_JUEGO, ESTADO_PARTIDO_UI, TONO_ESTADO_PARTIDO } from '../formato';
import '../partidos.css';

/**
 * En la ficha del torneo, para quien lo juega (PICA-243): su primer partido sin cerrar, con el enlace para cargar o
 * aceptar el resultado. Si no juega, quedó afuera o no se puede consultar, no muestra nada. Antes de jugar, cuándo
 * abre el check-in (HU-308); se confirma desde la ficha del partido.
 */
export const TuProximoCruce: React.FC<{ torneoId: number }> = ({ torneoId }) => {
  const [partido, setPartido] = useState<PartidoDetalle | null>(null);
  const [checkin, setCheckin] = useState<CheckinPartido | null>(null);

  useEffect(() => {
    let vigente = true;
    partidoApi
      .miProximo(torneoId)
      .then((p) => {
        if (!vigente) return;
        setPartido(p);
        if (p && EN_JUEGO.includes(p.estado)) {
          partidoApi
            .checkin(p.id)
            .then((c) => vigente && setCheckin(c))
            .catch(() => vigente && setCheckin(null));
        }
      })
      .catch(() => vigente && setPartido(null));
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  if (!partido) return null;

  const porAceptar =
    partido.estado === 'RESULTADO_CARGADO' &&
    partido.miLado !== null &&
    partido.cargadoPor !== partido.miLado;

  const mio = checkin?.miLado === 'LOCAL' ? checkin.local : checkin?.visitante;
  const lineaCheckin =
    !checkin?.ventana || !checkin.miLado
      ? null
      : mio?.checkinEn
        ? 'Check-in confirmado'
        : checkin.estadoVentana === 'ANTES'
          ? `Check-in: abre el ${fechaHora(checkin.ventana.abreEn)}`
          : checkin.estadoVentana === 'ABIERTA'
            ? 'Check-in abierto: confirmá tu presencia'
            : null;

  return (
    <div className="torneo-block-card">
      <div className="torneo-block-title">
        <span>⚔️</span>
        <span>Tu próximo cruce</span>
      </div>
      <div className="partido-proximo">
        <div>
          <p>
            <strong>{partido.nombreRonda}:</strong> {partido.local?.nombre ?? 'A definir'} vs{' '}
            {partido.visitante?.nombre ?? 'A definir'}
          </p>
          <Badge tone={porAceptar ? 'aviso' : TONO_ESTADO_PARTIDO[partido.estado]}>
            {porAceptar ? 'Tenés un resultado para aceptar' : ESTADO_PARTIDO_UI[partido.estado]}
          </Badge>
          {lineaCheckin && <p className="partido-ayuda">{lineaCheckin}</p>}
        </div>
        <Link to={`/partidos/${partido.id}`} className="btn btn-primary btn-sm">
          Ir al partido
        </Link>
      </div>
    </div>
  );
};
