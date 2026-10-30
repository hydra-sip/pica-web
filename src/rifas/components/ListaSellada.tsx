import React from 'react';
import { fechaHora } from '../../shared/formato';
import { Card } from '../../shared/ui';

interface ListaSelladaProps {
  listaHash: string;
  listaSelladaEn: string;
}

/**
 * La lista de números vendidos sellada al cerrar la venta (HU-407): cuándo se selló y su SHA-256, completo para
 * poder copiarlo y verificarlo. Lo ven el organizador y quien compra.
 */
export const ListaSellada: React.FC<ListaSelladaProps> = ({ listaHash, listaSelladaEn }) => (
  <Card data-testid="rifa-lista-sellada">
    <h2 className="rifas-subtitulo-seccion">Lista sellada</h2>
    <dl className="rifas-resumen">
      <div>
        <dt>Fecha del sellado</dt>
        <dd>{fechaHora(listaSelladaEn)}</dd>
      </div>
      <div className="rifas-resumen-ancho">
        <dt>Hash SHA-256</dt>
        <dd>
          <code className="rifas-hash">{listaHash}</code>
        </dd>
      </div>
    </dl>
  </Card>
);
