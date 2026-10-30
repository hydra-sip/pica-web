import React, { useState } from 'react';
import { LineaListaSellada, rifaPublicaApi } from '../../api/rifaApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Card, Modal, Table } from '../../shared/ui';

interface ListaSelladaProps {
  rifaId: number;
  listaHash: string;
  listaSelladaEn: string;
  compromisoHash: string | null;
  compromisoPublicadoEn: string | null;
}

/**
 * La lista de números vendidos sellada al cerrar la venta (HU-407): cuándo se selló y su SHA-256, completo para
 * poder copiarlo y verificarlo, con su desglose en un popup. Con el sello se publica el compromiso del sorteo
 * (HU-502), antes de que exista la semilla. Lo ven el organizador y quien compra.
 */
export const ListaSellada: React.FC<ListaSelladaProps> = ({
  rifaId,
  listaHash,
  listaSelladaEn,
  compromisoHash,
  compromisoPublicadoEn,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<LineaListaSellada[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const desglosar = () => {
    setAbierto(true);
    if (lista) return;
    setError(null);
    rifaPublicaApi
      .listaSellada(rifaId)
      .then(setLista)
      .catch((err) => setError(mensajeDeError(err, 'No se pudo cargar la lista sellada.')));
  };

  return (
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
            <Button variant="ghost" size="sm" onClick={desglosar}>
              Ver desglose
            </Button>
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

      <Modal
        isOpen={abierto}
        title="Desglose de la lista sellada"
        onClose={() => setAbierto(false)}
      >
        <p className="rifas-celda-secundaria">
          Una línea <code>número;ticket</code> por cada número vendido, de menor a mayor. El SHA-256
          de esas líneas, separadas por un salto de línea, es el hash de la lista.
        </p>
        {error && (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        )}
        {!error && !lista && <p className="rifas-vacio">Cargando lista...</p>}
        {lista && lista.length === 0 && <p className="rifas-vacio">No se vendió ningún número.</p>}
        {lista && lista.length > 0 && (
          <Table caption="Números vendidos y su ticket">
            <thead>
              <tr>
                <th>Número</th>
                <th>Ticket</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.numero}>
                  <td>{l.numero}</td>
                  <td>
                    <code>{l.ticketCodigo}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal>
    </Card>
  );
};
