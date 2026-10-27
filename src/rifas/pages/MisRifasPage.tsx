import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoRifa, rifaApi, RifaResumen } from '../../api/rifaApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { fechaHora, pesos } from '../../shared/formato';
import { Badge, Card, Input, Table } from '../../shared/ui';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../formato';
import '../rifas.css';

// El contrato permite hasta 100 por página. Un organizador no suele tener más, así que se traen
// todas juntas y el buscador y los chips filtran acá (el back no filtra por estado ni por texto).
const MAXIMO = 100;

const CHIPS: { estado: EstadoRifa | 'TODAS'; etiqueta: string }[] = [
  { estado: 'TODAS', etiqueta: 'Todas' },
  { estado: 'BORRADOR', etiqueta: 'Borrador' },
  { estado: 'EN_VENTA', etiqueta: 'En venta' },
  { estado: 'CERRADA', etiqueta: 'Cerradas' },
  { estado: 'SORTEADA', etiqueta: 'Sorteadas' },
  { estado: 'LIQUIDADA', etiqueta: 'Liquidadas' },
  { estado: 'CANCELADA', etiqueta: 'Canceladas' },
];

/** GET /rifas/mis-rifas (PICA-227), con el formato de "Mis Torneos": chips por estado y una acción por fila. */
export const MisRifasPage: React.FC = () => {
  const [rifas, setRifas] = useState<RifaResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<EstadoRifa | 'TODAS'>('TODAS');

  useEffect(() => {
    let vigente = true;
    rifaApi
      .listarMias({ page: 0, size: MAXIMO })
      .then((respuesta) => {
        if (vigente) {
          setRifas(respuesta.content);
          setTotal(respuesta.page.totalElements);
        }
      })
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar tus rifas.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, []);

  const cantidades = useMemo(() => {
    const porEstado: Partial<Record<EstadoRifa | 'TODAS', number>> = { TODAS: rifas.length };
    rifas.forEach((r) => {
      porEstado[r.estado] = (porEstado[r.estado] ?? 0) + 1;
    });
    return porEstado;
  }, [rifas]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return rifas.filter(
      (r) =>
        (filtro === 'TODAS' || r.estado === filtro) &&
        (!texto || r.titulo.toLowerCase().includes(texto))
    );
  }, [rifas, filtro, busqueda]);

  return (
    <div className="rifas-page">
      <header className="rifas-encabezado">
        <div>
          <div className="rifas-titulo-con-chip">
            <h1>Mis rifas</h1>
            {!cargando && (
              <Badge tone="borde">
                {total} {total === 1 ? 'rifa' : 'rifas'}
              </Badge>
            )}
          </div>
          <p className="rifas-subtitulo">
            Las rifas que organizás. Mientras están en borrador las podés editar.
          </p>
        </div>
        <Link to="/rifas/nueva" className="btn btn-primary">
          Crear nueva rifa
        </Link>
      </header>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      <Card>
        <div className="rifas-filtros">
          <Input
            type="search"
            placeholder="Buscar rifa por título"
            aria-label="Buscar rifa por título"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="chips-estado" role="group" aria-label="Filtrar por estado">
            {CHIPS.filter((c) => c.estado === 'TODAS' || cantidades[c.estado]).map((c) => (
              <button
                key={c.estado}
                type="button"
                className={`chip-estado${filtro === c.estado ? ' activo' : ''}`}
                aria-pressed={filtro === c.estado}
                onClick={() => setFiltro(c.estado)}
              >
                {c.etiqueta} ({cantidades[c.estado] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <p className="rifas-vacio">Cargando rifas...</p>
        ) : rifas.length === 0 && !error ? (
          <div className="rifas-vacio">
            <h2>Todavía no organizaste ninguna rifa</h2>
            <p>Creá la primera con el botón &quot;Crear nueva rifa&quot;.</p>
          </div>
        ) : visibles.length === 0 ? (
          <p className="rifas-vacio">Ninguna rifa coincide con el filtro.</p>
        ) : (
          <Table caption="Mis rifas">
            <thead>
              <tr>
                <th scope="col">Rifa</th>
                <th scope="col">Números</th>
                <th scope="col">Precio</th>
                <th scope="col">Venta</th>
                <th scope="col">Estado</th>
                <th scope="col" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((rifa) => (
                <tr key={rifa.id}>
                  <td>
                    <span className="rifas-titulo-fila">{rifa.titulo}</span>
                    <span className="rifas-celda-secundaria">
                      {rifa.torneoNombre ? `Torneo ${rifa.torneoNombre}` : 'Sin torneo'} · creada el{' '}
                      {fechaHora(rifa.creadoEn)}
                    </span>
                  </td>
                  <td>
                    {rifa.numeroDesde} – {rifa.numeroHasta}
                    <span className="rifas-celda-secundaria">
                      {rifa.numeroHasta - rifa.numeroDesde + 1} números
                    </span>
                  </td>
                  <td>{pesos(rifa.precioNumero)}</td>
                  <td>
                    {rifa.ventaDesde ? (
                      <>
                        {fechaHora(rifa.ventaDesde)}
                        <span className="rifas-celda-secundaria">
                          hasta {fechaHora(rifa.ventaHasta)}
                        </span>
                      </>
                    ) : (
                      <span className="rifas-celda-secundaria">Sin definir</span>
                    )}
                  </td>
                  <td>
                    <Badge tone={TONO_ESTADO_RIFA[rifa.estado]}>
                      {ESTADO_RIFA_UI[rifa.estado] ?? rifa.estado}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/rifas/${rifa.id}/editar`}
                      className={`btn btn-sm ${rifa.estado === 'BORRADOR' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {rifa.estado === 'BORRADOR' ? 'Continuar edición' : 'Ver rifa'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {!cargando && rifas.length > 0 && (
          <p className="rifas-pie-tabla">
            Mostrando {visibles.length} de {total} {total === 1 ? 'rifa' : 'rifas'}
            {total > MAXIMO && ` (solo las ${MAXIMO} más nuevas)`}
          </p>
        )}
      </Card>
    </div>
  );
};
