import React, { useCallback, useEffect, useState } from 'react';
import { CancelacionEnRevision, cancelacionApi } from '../../api/cancelacionApi';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Card, Table } from '../../shared/ui';
import './CancelacionesPage.css';

/**
 * HU-605 (T605-3): la cola de soporte. Las cancelaciones con gastos, de la más vieja a la más nueva; al abrir una se ven
 * el motivo y cada gasto, con su comprobante para abrir en otra pestaña. No hay wireframe propio: sigue el estilo de las
 * demás pantallas del backoffice.
 */
export const CancelacionesPage: React.FC = () => {
  const [cola, setCola] = useState<CancelacionEnRevision[] | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    cancelacionApi
      .cola()
      .then((pagina) => setCola(pagina.content))
      .catch((err) => setError(mensajeDeError(err, 'No se pudo cargar la cola.')));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const verComprobante = async (torneoId: number, gastoId: number) => {
    // Se abre antes del await: si no, el navegador lo toma como popup y lo bloquea.
    const ventana = window.open('', '_blank');
    try {
      const url = URL.createObjectURL(await cancelacionApi.comprobante(torneoId, gastoId));
      if (ventana) ventana.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      ventana?.close();
      setError(mensajeDeError(err, 'No se pudo abrir el comprobante.'));
    }
  };

  const detalle = cola?.find((c) => c.torneoId === abierta) ?? null;

  return (
    <div className="cancelaciones-page">
      <div>
        <h1>Cancelaciones en revisión</h1>
        <p className="cancelaciones-subtitulo">
          Torneos que el organizador canceló declarando gastos. La plata sigue en custodia hasta que
          los apruebes o los rechaces.
        </p>
      </div>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      {cola === null && !error && <p>Cargando...</p>}

      {cola !== null && cola.length === 0 && (
        <Card>
          <p className="cancelaciones-vacia">No hay cancelaciones esperando revisión.</p>
        </Card>
      )}

      {cola !== null && cola.length > 0 && (
        <Table caption="Cancelaciones en revisión, de la más vieja a la más nueva">
          <thead>
            <tr>
              <th>Torneo</th>
              <th>Organizador</th>
              <th>Pedida</th>
              <th>Pozo</th>
              <th>Gastos</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {cola.map((c) => (
              <tr key={c.torneoId}>
                <td>{c.torneoNombre}</td>
                <td>
                  {c.organizador.nombreCompleto}{' '}
                  <span className="cancelaciones-usuario">@{c.organizador.username}</span>
                </td>
                <td>{fechaHora(c.pedidaEn)}</td>
                <td>{pesos(c.pozo)}</td>
                <td>{pesos(c.totalGastos)}</td>
                <td>
                  <Button
                    size="sm"
                    variant={abierta === c.torneoId ? 'primary' : 'secondary'}
                    aria-label={`Revisar ${c.torneoNombre}`}
                    onClick={() => setAbierta(abierta === c.torneoId ? null : c.torneoId)}
                  >
                    Revisar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {detalle && (
        <section aria-label={`Cancelación de ${detalle.torneoNombre}`}>
          <Card>
            <h2>{detalle.torneoNombre}</h2>
            <h3 className="cancelaciones-titulo">Motivo del organizador</h3>
            <p>{detalle.motivo}</p>
            <h3 className="cancelaciones-titulo">Gastos declarados</h3>
            <ul className="cancelaciones-gastos">
              {detalle.gastos.map((g) => (
                <li key={g.id}>
                  <span>{g.concepto}</span>
                  <span>{pesos(g.monto)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Ver comprobante de ${g.concepto}`}
                    onClick={() => void verComprobante(detalle.torneoId, g.id)}
                  >
                    Ver comprobante
                  </Button>
                </li>
              ))}
              <li className="cancelaciones-total">
                <span>Total</span>
                <span>{pesos(detalle.totalGastos)}</span>
                <span />
              </li>
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
};
