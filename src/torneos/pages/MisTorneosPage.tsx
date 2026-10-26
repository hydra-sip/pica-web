import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoTorneo, MiTorneoResumen, MisTorneos, torneoApi } from '../../api/torneoApi';
import { fecha, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card, Input, Select, Table } from '../../shared/ui';
import { ESTADO_TORNEO_UI, TONO_ESTADO_TORNEO } from '../formato';
import '../torneos.css';

const TAMANIO_PAGINA = 10;

const PESTANAS: EstadoTorneo[] = [
  'BORRADOR',
  'INSCRIPCION_ABIERTA',
  'INSCRIPCION_CERRADA',
  'EN_CURSO',
  'FINALIZADO',
  'CANCELADO',
];

const PASOS = ['', 'información y formato', 'cupos', 'esquema económico'];

const detalle = (t: MiTorneoResumen): string =>
  t.estado === 'BORRADOR' && t.pasoPendiente
    ? `Paso ${t.pasoPendiente} de 3 pendiente: ${PASOS[t.pasoPendiente]}`
    : (t.sede ?? 'Online');

/** Un borrador abre el asistente en el paso pendiente; uno publicado, su confirmación con el enlace y el sello (para editarlo está "Editar"). */
const rutaDeEdicion = (t: MiTorneoResumen): string => {
  if (t.estado !== 'BORRADOR') return `/torneos/${t.id}/publicado`;
  const pendiente = t.pasoPendiente ?? 1;
  return pendiente >= 2 ? `/torneos/${t.id}/editar?paso=${pendiente}` : `/torneos/${t.id}/editar`;
};

/**
 * GET /torneos/mis-torneos (PICA-202), como el wireframe "Mis Torneos": búsqueda, deporte, pestañas por
 * estado con su cantidad y una acción por fila. Filtra y pagina el back; las cantidades de las pestañas
 * respetan la búsqueda y el deporte.
 */
export const MisTorneosPage: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<EstadoTorneo | null>(null);
  const [disciplina, setDisciplina] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<MisTorneos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // La búsqueda se manda cuando se deja de escribir.
  useEffect(() => {
    const espera = setTimeout(() => {
      setQ(busqueda.trim());
      setPagina(0);
    }, 300);
    return () => clearTimeout(espera);
  }, [busqueda]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    torneoApi
      .misTorneos({
        q: q || undefined,
        estado: estado ?? undefined,
        disciplina: disciplina || undefined,
        page: pagina,
        size: TAMANIO_PAGINA,
      })
      .then((d) => vigente && setDatos(d))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar tus torneos.'))
      )
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [q, estado, disciplina, pagina]);

  const elegirEstado = (nuevo: EstadoTorneo | null) => {
    setEstado(nuevo);
    setPagina(0);
  };

  const limpiar = () => {
    setBusqueda('');
    setQ('');
    setDisciplina('');
    elegirEstado(null);
  };

  const cantidad = (e: EstadoTorneo) => datos?.porEstado[e] ?? 0;
  const total = PESTANAS.reduce((suma, e) => suma + cantidad(e), 0);
  const hayFiltros = Boolean(q || disciplina || estado);
  const ninguno = datos !== null && total === 0 && !q && !disciplina;
  const desde = datos ? datos.page.number * datos.page.size : 0;

  return (
    <div className="torneos-page">
      <header className="torneos-encabezado">
        <div>
          <div className="torneos-titulo-con-chip">
            <h1>Mis torneos</h1>
            {datos && !hayFiltros && (
              <Badge tone="borde">
                {total} {total === 1 ? 'torneo' : 'torneos'}
              </Badge>
            )}
          </div>
          <p className="torneos-subtitulo">
            Los torneos que organizás. Los podés editar hasta que empiezan; publicados, sin tocar la
            plata ni el reglamento.
          </p>
        </div>
        <Link to="/torneos/nuevo" className="btn btn-primary">
          + Crear nueva competencia
        </Link>
      </header>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      <Card>
        {ninguno ? (
          <div className="torneos-vacio">
            <h2>Todavía no creaste torneos</h2>
            <p>Configurá tu primera competencia en tres pasos.</p>
            <Link to="/torneos/nuevo" className="btn btn-primary">
              + Crear nueva competencia
            </Link>
          </div>
        ) : (
          <>
            <div className="torneos-filtros">
              <Input
                type="search"
                placeholder="Buscar torneo..."
                aria-label="Buscar torneo por nombre"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <Select
                aria-label="Filtrar por deporte"
                value={disciplina}
                onChange={(e) => {
                  setDisciplina(e.target.value);
                  setPagina(0);
                }}
              >
                <option value="">Deporte: todos</option>
                {datos?.disciplinas.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" onClick={limpiar} disabled={!hayFiltros && !busqueda}>
                Limpiar filtros
              </Button>
            </div>

            <div className="torneos-pestanas" role="group" aria-label="Filtrar por estado">
              <button
                type="button"
                className={`torneos-pestana${estado === null ? ' activa' : ''}`}
                aria-pressed={estado === null}
                onClick={() => elegirEstado(null)}
              >
                Todos ({total})
              </button>
              {PESTANAS.filter((e) => cantidad(e) > 0 || e === estado).map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`torneos-pestana${estado === e ? ' activa' : ''}`}
                  aria-pressed={estado === e}
                  onClick={() => elegirEstado(e)}
                >
                  {ESTADO_TORNEO_UI[e]} ({cantidad(e)})
                </button>
              ))}
            </div>

            {!datos && cargando ? (
              <p className="torneos-vacio">Cargando torneos...</p>
            ) : datos && datos.content.length === 0 ? (
              <p className="torneos-vacio">Ningún torneo coincide con el filtro.</p>
            ) : (
              datos && (
                <Table caption="Mis torneos" aria-busy={cargando}>
                  <thead>
                    <tr>
                      <th scope="col">Torneo</th>
                      <th scope="col">Deporte</th>
                      <th scope="col">Inscriptos</th>
                      <th scope="col">Pozo</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Fecha</th>
                      <th scope="col" aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {datos.content.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <span className="torneos-nombre-fila">{t.nombre}</span>
                          <span className="torneos-celda-secundaria">{detalle(t)}</span>
                        </td>
                        <td>{t.disciplina}</td>
                        <td>
                          {t.inscriptos}/{t.cupoMaximo ?? '—'}
                        </td>
                        <td>
                          {t.pozo === null ? '—' : pesos(t.pozo)}
                          {t.pozo !== null && t.pozoEstimado && (
                            <span className="torneos-celda-secundaria">estimado</span>
                          )}
                        </td>
                        <td>
                          <Badge tone={TONO_ESTADO_TORNEO[t.estado]}>
                            {ESTADO_TORNEO_UI[t.estado] ?? t.estado}
                          </Badge>
                        </td>
                        <td>{t.estado === 'BORRADOR' ? 'Sin publicar' : fecha(t.fechaInicio)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {(t.estado === 'INSCRIPCION_ABIERTA' ||
                            t.estado === 'INSCRIPCION_CERRADA') && (
                            <Link
                              to={`/torneos/${t.id}/editar`}
                              className="btn btn-sm btn-ghost torneos-accion-editar"
                            >
                              Editar
                            </Link>
                          )}
                          <Link
                            to={rutaDeEdicion(t)}
                            className={`btn btn-sm ${t.estado === 'BORRADOR' ? 'btn-primary' : 'btn-secondary'}`}
                          >
                            {t.estado === 'BORRADOR' ? 'Continuar edición' : 'Ver torneo'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )
            )}

            {datos && datos.page.totalElements > 0 && (
              <div className="torneos-paginacion">
                <span>
                  Mostrando {desde + 1} a {desde + datos.content.length} de{' '}
                  {datos.page.totalElements}
                </span>
                {datos.page.totalPages > 1 && (
                  <div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagina === 0 || cargando}
                      onClick={() => setPagina((p) => p - 1)}
                    >
                      ← Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagina + 1 >= datos.page.totalPages || cargando}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Siguiente →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
