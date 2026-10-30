import React from 'react';
import { Link } from 'react-router-dom';
import { PremioRifa } from '../../api/rifaApi';
import { Card } from '../../shared/ui';

interface ResultadoSorteoProps {
  rifaId: number;
  premios: PremioRifa[];
}

/**
 * El resultado del sorteo (HU-504): el número que ganó cada premio, por puesto. Si hubo más premios que números
 * vendidos, los que sobran quedan sin ganador. Lo ven el organizador y quien compra, con el acceso al portal para
 * verificarlo.
 */
export const ResultadoSorteo: React.FC<ResultadoSorteoProps> = ({ rifaId, premios }) => (
  <Card data-testid="rifa-resultado-sorteo">
    <h2 className="rifas-subtitulo-seccion">Resultado del sorteo</h2>
    <ul className="rifas-ganadores">
      {premios.map((p) => (
        <li key={p.puesto}>
          <span className="rifas-ganador-puesto">{p.puesto}º</span>
          <span className="rifas-ganador-numero">
            {p.numeroGanador !== null ? `#${p.numeroGanador}` : 'Sin ganador'}
          </span>
          <span className="rifas-celda-secundaria">
            {p.pct}%{p.descripcion && ` · ${p.descripcion}`}
          </span>
        </li>
      ))}
    </ul>
    <Link to={`/verificacion?tipo=RIFA&id=${rifaId}`} className="rifas-verificar">
      Verificar el sorteo en el portal público
    </Link>
  </Card>
);
