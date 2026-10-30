import React from 'react';
import { fechaHora } from '../../shared/formato';
import { Card } from '../../shared/ui';

interface ListaSelladaProps {
  listaHash: string;
  listaSelladaEn: string;
  compromisoHash: string | null;
  compromisoPublicadoEn: string | null;
}

/**
 * La lista de números vendidos sellada al cerrar la venta (HU-407): cuándo se selló y su SHA-256, completo para
 * poder copiarlo y verificarlo. Con el sello se publica el compromiso del sorteo (HU-502), antes de que exista la
 * semilla. Lo ven el organizador y quien compra.
 */
export const ListaSellada: React.FC<ListaSelladaProps> = ({
  listaHash,
  listaSelladaEn,
  compromisoHash,
  compromisoPublicadoEn,
}) => (
  <Card data-testid="rifa-lista-sellada">
    <h2 className="rifas-subtitulo-seccion">Lista sellada</h2>
    <dl className="rifas-resumen">
      <div>
        <dt>Fecha del sellado</dt>
        <dd>{fechaHora(listaSelladaEn)}</dd>
      </div>
      <div className="rifas-resumen-ancho">
        <dt>Hash de la lista</dt>
        <dd>
          <code className="rifas-hash">{listaHash}</code>
        </dd>
      </div>
      {compromisoHash && compromisoPublicadoEn && (
        <>
          <div>
            <dt>Compromiso publicado</dt>
            <dd>{fechaHora(compromisoPublicadoEn)}</dd>
          </div>
          <div className="rifas-resumen-ancho">
            <dt>Hash de compromiso</dt>
            <dd>
              <code className="rifas-hash">{compromisoHash}</code>
            </dd>
          </div>
        </>
      )}
    </dl>
  </Card>
);
