import React from 'react';
import { RepartoRifa } from '../../api/rifaApi';
import { pesos } from '../../shared/formato';
import { Card } from '../../shared/ui';

interface RecaudadoRifaProps {
  titulo: string;
  reparto: RepartoRifa;
  /** null sin torneo. */
  torneoNombre: string | null;
  pctDestinadoTorneo: number;
  /** Para el organizador: "6 de 100". */
  vendidos?: string;
  /** Al lado del título, como el link a la rifa en la consola del torneo (HU-406). */
  accion?: React.ReactNode;
}

/**
 * Lo recaudado con los números vendidos y cómo se reparte (HU-405): con torneo, su % va al pozo del torneo y el
 * resto a los premios; sin torneo, todo a los premios. Lo ven el organizador y quien compra.
 */
export const RecaudadoRifa: React.FC<RecaudadoRifaProps> = ({
  titulo,
  reparto,
  torneoNombre,
  pctDestinadoTorneo,
  vendidos,
  accion,
}) => {
  const conTorneo = torneoNombre !== null && pctDestinadoTorneo > 0;

  return (
    <Card data-testid="rifa-recaudado">
      <div className="rifas-recaudado-titulo">
        <h2 className="rifas-subtitulo-seccion">{titulo}</h2>
        {accion}
      </div>
      <dl className="rifas-resumen">
        {vendidos && (
          <div>
            <dt>Números vendidos</dt>
            <dd>{vendidos}</dd>
          </div>
        )}
        <div>
          <dt>Recaudado</dt>
          <dd>{pesos(reparto.recaudado)}</dd>
        </div>
        {conTorneo && (
          <div>
            <dt>
              Al pozo del torneo {torneoNombre} ({pctDestinadoTorneo}%)
            </dt>
            <dd>{pesos(reparto.alPozoTorneo)}</dd>
          </div>
        )}
        <div>
          <dt>A premios{conTorneo && ` (${100 - pctDestinadoTorneo}%)`}</dt>
          <dd>{pesos(reparto.aPremios)}</dd>
        </div>
      </dl>
    </Card>
  );
};
