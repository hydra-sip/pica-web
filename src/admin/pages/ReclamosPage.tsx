import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoReclamo, reclamoAdminApi, ReclamoAdminResumen } from '../../api/reclamoAdminApi';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../../rifas/formato';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card, Table } from '../../shared/ui';
import { ESTADO_RECLAMO_UI } from '../reclamosUi';
import './ReclamosPage.css';

const PAGE_SIZE = 20;

const FILTROS: { estado: EstadoReclamo | ''; etiqueta: string }[] = [
  { estado: '', etiqueta: 'Todos' },
  { estado: 'PENDIENTE', etiqueta: 'Pendientes' },
  { estado: 'ACEPTADO', etiqueta: 'Aceptados' },
  { estado: 'RECHAZADO', etiqueta: 'Rechazados' },
];

/**
 * Listado de reclamos sobre sorteos de rifas en el backoffice (HU-706 / T706-2).
 * Muestra los PENDIENTE primero y permite filtrar por estado y abrir cada reclamo para verificar el sorteo y resolverlo.
 */
export const ReclamosPage: React.FC = () => {
  const [reclamos, setReclamos] = useState<ReclamoAdminResumen[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoReclamo | ''>('');
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);

    reclamoAdminApi
      .listar({
        estado: estadoFiltro || undefined,
        page,
        size: PAGE_SIZE,
      })
      .then((res) => {
        if (!vigente) return;
        setReclamos(res.content ?? []);
        setTotalElements(res.page?.totalElements ?? res.content.length);
        setTotalPages(Math.max(1, res.page?.totalPages ?? 1));
      })
      .catch((err) => {
        if (vigente) {
          setError(mensajeDeError(err, 'No se pudieron cargar los reclamos.'));
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [estadoFiltro, page]);

  const seleccionarFiltro = (nuevoEstado: EstadoReclamo | '') => {
    setEstadoFiltro(nuevoEstado);
    setPage(0);
  };

  const inicio = totalElements > 0 ? page * PAGE_SIZE + 1 : 0;
  const fin = Math.min((page + 1) * PAGE_SIZE, totalElements);

  return (
    <div className="reclamos-page">
      <header className="reclamos-encabezado">
        <div>
          <h1>Reclamos de rifas</h1>
          <p className="reclamos-subtitulo">
            Disputas sobre resultados de sorteos. Los reclamos pendientes aparecen primero para su
            revisión criptográfica y resolución.
          </p>
        </div>
      </header>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      <Card>
        <div className="reclamos-filtros">
          <div className="reclamos-chips" role="group" aria-label="Filtrar reclamos por estado">
            {FILTROS.map((f) => (
              <button
                key={f.estado || 'TODOS'}
                type="button"
                className={`reclamos-chip${estadoFiltro === f.estado ? ' activo' : ''}`}
                aria-pressed={estadoFiltro === f.estado}
                onClick={() => seleccionarFiltro(f.estado)}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>
          {!cargando && (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {totalElements} {totalElements === 1 ? 'reclamo' : 'reclamos'}
            </span>
          )}
        </div>

        {cargando ? (
          <p className="reclamos-vacio">Cargando reclamos...</p>
        ) : reclamos.length === 0 && !error ? (
          <div className="reclamos-vacio">
            <p>
              {estadoFiltro
                ? 'No hay reclamos en el estado seleccionado.'
                : 'No hay reclamos registrados.'}
            </p>
          </div>
        ) : (
          <>
            <Table caption="Listado de reclamos de rifas">
              <thead>
                <tr>
                  <th scope="col">Reclamo</th>
                  <th scope="col">Rifa</th>
                  <th scope="col">Reclamante</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Estado</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {reclamos.map((r) => {
                  const estadoUi = ESTADO_RECLAMO_UI[r.estado];
                  const rifaEstadoUi = ESTADO_RIFA_UI[r.rifa.estado] ?? r.rifa.estado;
                  const rifaTono = TONO_ESTADO_RIFA[r.rifa.estado] ?? 'neutral';

                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="reclamos-celda-principal">#{r.id}</span>
                        <span className="reclamos-celda-secundaria">{fechaHora(r.creadoEn)}</span>
                      </td>
                      <td>
                        <span className="reclamos-celda-principal">{r.rifa.titulo}</span>
                        <span className="reclamos-celda-secundaria">
                          {r.rifa.torneoNombre ?? 'Sin torneo'} ·{' '}
                          <Badge tone={rifaTono}>{rifaEstadoUi}</Badge>
                        </span>
                      </td>
                      <td>
                        <span className="reclamos-celda-principal">@{r.reclamante.username}</span>
                        <span className="reclamos-celda-secundaria">{r.reclamante.email}</span>
                      </td>
                      <td>
                        <div className="reclamos-motivo-celda" title={r.motivo}>
                          {r.motivo}
                        </div>
                      </td>
                      <td>
                        <Badge tone={estadoUi.tono}>{estadoUi.texto}</Badge>
                        {r.resueltoPor && (
                          <span className="reclamos-celda-secundaria">Por {r.resueltoPor}</span>
                        )}
                        {r.estado !== 'PENDIENTE' &&
                          (r.fondosLiberadosEn ? (
                            <span className="reclamos-celda-secundaria">Fondos liberados</span>
                          ) : r.rifa.estado !== 'LIQUIDADA' && r.rifa.estado !== 'CANCELADA' ? (
                            <span className="reclamos-celda-secundaria">
                              Pendiente de liberar fondos
                            </span>
                          ) : null)}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link
                          to={`/admin/reclamos/${r.id}`}
                          className={`btn btn-sm ${r.estado === 'PENDIENTE' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {r.estado === 'PENDIENTE' ? 'Revisar y resolver' : 'Ver detalle'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            <div className="reclamos-paginacion">
              <span>
                Mostrando {inicio} a {fin} de {totalElements} reclamos
              </span>

              {totalPages > 1 && (
                <nav aria-label="Paginación de reclamos" className="reclamos-paginacion-botones">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    &laquo; Anterior
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={i === page ? 'primary' : 'secondary'}
                      aria-current={i === page ? 'page' : undefined}
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    Siguiente &raquo;
                  </Button>
                </nav>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

