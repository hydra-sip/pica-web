import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoRifa, rifaApi, RifaResumen } from '../../api/rifaApi';
import { mensajeDeError } from '../../admin/mensajesError';
import { ESTADO_RIFA_UI, formatearFecha, formatearPrecio } from '../formato';
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
    <div className="container rifas-page">
      <div className="rifas-encabezado">
        <div>
          <div className="rifas-titulo-con-chip">
            <h1>Mis rifas</h1>
            {!cargando && (
              <span className="chip-contador">
                {total} {total === 1 ? 'rifa' : 'rifas'}
              </span>
            )}
          </div>
          <p>Las rifas que organizás. Mientras están en borrador las podés editar.</p>
        </div>
        <Link to="/rifas/nueva" className="btn btn-primary">
          + Crear nueva rifa
        </Link>
      </div>

      {error && <div className="rifas-aviso rifas-aviso-error">{error}</div>}

      <div className="glass-card">
        <div className="rifas-filtros">
          <input
            type="search"
            className="rifas-input"
            placeholder="Buscar rifa por título..."
            aria-label="Buscar rifa por título"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="chips-estado" role="group" aria-label="Filtrar por estado">
            {CHIPS.filter((c) => c.estado === 'TODAS' || cantidades[c.estado]).map((c) => (
              <button
                key={c.estado}
                type="button"
                className={`chip-estado ${filtro === c.estado ? 'activo' : ''}`}
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
            <h3>Todavía no organizaste ninguna rifa</h3>
            <p>Creá la primera con el botón &quot;Crear nueva rifa&quot;.</p>
          </div>
        ) : visibles.length === 0 ? (
          <p className="rifas-vacio">Ninguna rifa coincide con el filtro.</p>
        ) : (
          <div className="rifas-tabla-contenedor">
            <table className="rifas-tabla">
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Números</th>
                  <th>Precio</th>
                  <th>Venta</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {visibles.map((rifa) => (
                  <tr key={rifa.id}>
                    <td>
                      <span className="titulo">{rifa.titulo}</span>
                      <span className="secundario" style={{ display: 'block' }}>
                        Sin torneo · creada el {formatearFecha(rifa.creadoEn)}
                      </span>
                    </td>
                    <td>
                      {rifa.numeroDesde} – {rifa.numeroHasta}
                      <span className="secundario" style={{ display: 'block' }}>
                        {rifa.numeroHasta - rifa.numeroDesde + 1} números
                      </span>
                    </td>
                    <td>{formatearPrecio(rifa.precioNumero)}</td>
                    <td className="secundario">
                      {rifa.ventaDesde ? (
                        <>
                          {formatearFecha(rifa.ventaDesde)}
                          <br />
                          {formatearFecha(rifa.ventaHasta)}
                        </>
                      ) : (
                        'Sin definir'
                      )}
                    </td>
                    <td>
                      <span className={`estado-rifa ${rifa.estado}`}>
                        {ESTADO_RIFA_UI[rifa.estado] ?? rifa.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/rifas/${rifa.id}/editar`}
                        className={`btn ${rifa.estado === 'BORRADOR' ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {rifa.estado === 'BORRADOR' ? 'Continuar edición' : 'Ver rifa'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!cargando && rifas.length > 0 && (
          <div className="rifas-paginado">
            <span>
              Mostrando {visibles.length} de {total} {total === 1 ? 'rifa' : 'rifas'}
              {total > MAXIMO && ` (solo las ${MAXIMO} más nuevas)`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
