import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageResponse } from '../../api/usuarioApi';
import { rifaPublicaApi, RifaPublicaResumen } from '../../api/rifaApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { fechaHora, pesos } from '../../shared/formato';
import { Button, Card } from '../../shared/ui';
import '../rifas.css';

const TAMANIO_PAGINA = 12;

const venta = (rifa: RifaPublicaResumen): string =>
  new Date(rifa.ventaDesde).getTime() > Date.now()
    ? `La venta empieza el ${fechaHora(rifa.ventaDesde)}`
    : `La venta cierra el ${fechaHora(rifa.ventaHasta)}`;

/** GET /rifas/publicas (PICA-221): las rifas en venta, sin login. Primero las que cierran antes. */
export const RifasEnVentaPage: React.FC = () => {
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<PageResponse<RifaPublicaResumen> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    rifaPublicaApi
      .enVenta({ page: pagina, size: TAMANIO_PAGINA })
      .then((d) => vigente && setDatos(d))
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar las rifas.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [pagina]);

  const rifas = datos?.content ?? [];

  return (
    <div className="rifas-page">
      <header>
        <div className="rifas-titulo-con-chip">
          <h1>Rifas</h1>
        </div>
        <p className="rifas-subtitulo">
          Elegí una rifa y comprá tus números mientras la venta está abierta.
        </p>
      </header>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      {cargando ? (
        <p className="rifas-vacio">Cargando rifas...</p>
      ) : rifas.length === 0 && !error ? (
        <div className="rifas-vacio">
          <h2>No hay rifas en venta</h2>
          <p>Volvé más tarde para ver las próximas.</p>
        </div>
      ) : (
        <div className="rifas-catalogo">
          {rifas.map((rifa) => (
            <Card key={rifa.id} className="rifa-tarjeta">
              <h2>
                <Link to={`/rifas/${rifa.id}`}>{rifa.titulo}</Link>
              </h2>
              {rifa.torneoNombre && (
                <p className="rifas-celda-secundaria">Rifa del torneo {rifa.torneoNombre}</p>
              )}
              <dl className="rifas-resumen">
                <div>
                  <dt>Precio por número</dt>
                  <dd>{pesos(rifa.precioNumero)}</dd>
                </div>
                <div>
                  <dt>Números</dt>
                  <dd>
                    {rifa.numeroDesde} – {rifa.numeroHasta}
                  </dd>
                </div>
                <div>
                  <dt>Sorteo</dt>
                  <dd>{fechaHora(rifa.fechaSorteo)}</dd>
                </div>
              </dl>
              <p className="rifas-celda-secundaria">{venta(rifa)}</p>
              <Link to={`/rifas/${rifa.id}`} className="btn btn-primary">
                Ver rifa
              </Link>
            </Card>
          ))}
        </div>
      )}

      {datos && datos.page.totalPages > 1 && (
        <div className="rifas-pie">
          <span>
            Página {datos.page.number + 1} de {datos.page.totalPages}
          </span>
          <div className="rifas-acciones">
            <Button
              variant="secondary"
              disabled={pagina === 0 || cargando}
              onClick={() => setPagina((p) => p - 1)}
            >
              ← Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={pagina + 1 >= datos.page.totalPages || cargando}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
