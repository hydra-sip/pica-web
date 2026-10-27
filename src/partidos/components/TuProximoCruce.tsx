import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PartidoDetalle, partidoApi } from '../../api/partidoApi';
import { useTorneoRealtime } from '../../realtime/useTorneoRealtime';
import { Badge } from '../../shared/ui';
import { ESTADO_PARTIDO_UI, TONO_ESTADO_PARTIDO } from '../formato';
import '../partidos.css';

/**
 * En la ficha del torneo, para quien lo juega (PICA-243): su primer partido sin cerrar, con el enlace para cargar o
 * aceptar el resultado. Si no juega, quedó afuera o no se puede consultar, no muestra nada.
 * Suscripto a `/topic/torneos/{id}` para actualizar el próximo cruce cuando avanza la llave.
 */
export const TuProximoCruce: React.FC<{ torneoId: number }> = ({ torneoId }) => {
  const [partido, setPartido] = useState<PartidoDetalle | null>(null);

  const cargarProximo = useCallback(() => {
    let vigente = true;
    partidoApi
      .miProximo(torneoId)
      .then((p) => vigente && setPartido(p))
      .catch(() => vigente && setPartido(null));
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  useEffect(() => {
    return cargarProximo();
  }, [cargarProximo]);

  useTorneoRealtime(torneoId, {
    onActualizar: () => {
      cargarProximo();
    },
    onReconnect: () => {
      cargarProximo();
    },
  });

  if (!partido) return null;

  const porAceptar =
    partido.estado === 'RESULTADO_CARGADO' &&
    partido.miLado !== null &&
    partido.cargadoPor !== partido.miLado;

  return (
    <div className="torneo-block-card">
      <div className="torneo-block-title">
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
        </div>
        <Link to={`/partidos/${partido.id}`} className="btn btn-primary btn-sm">
          Ir al partido
        </Link>
      </div>
    </div>
  );
};
