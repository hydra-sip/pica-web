import React, { useEffect, useState } from 'react';
import {
  AccionAuditoria,
  auditoriaApi,
  EntidadAuditoria,
  FiltrosAuditoria,
  RegistroAuditoria,
} from '../../api/auditoriaApi';
import { PageResponse, usuarioApi } from '../../api/usuarioApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Card, Field, Input, Modal, Select, Table } from '../../shared/ui';
import { BuscadorFiltro, OpcionFiltro } from '../components/BuscadorFiltro';
import './AuditoriaPage.css';

/**
 * HU-704 (T704-2): el libro de auditoría. Filtros por entidad e id, usuario, acción y fechas que se combinan, y la
 * tabla paginada del más nuevo al más viejo; el detalle de cada registro se abre completo. La entidad Torneo trae
 * además lo suyo (partidos, rifa y custodias), y la entidad de cada fila filtra por ella al tocarla. Sigue la
 * pantalla «Auditoría 2» del Figma (filtros arriba y la tabla de registros) con los estilos del backoffice.
 */

const TAMANIO_PAGINA = 20;

const ACCIONES: Record<AccionAuditoria, string> = {
  LOGIN: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Inicio de sesión fallido',
  LOGOUT: 'Cierre de sesión',
  ALTA: 'Alta',
  MODIFICACION: 'Modificación',
  BAJA: 'Baja',
  BLOQUEO: 'Bloqueo',
  DESBLOQUEO: 'Desbloqueo',
  PAGO: 'Pago',
  LAUDO: 'Laudo',
  SORTEO: 'Sorteo',
  CIERRE_INSCRIPCION: 'Cierre de inscripción',
  CIERRE_VENTA: 'Cierre de venta',
  LIQUIDACION: 'Liquidación',
  CANCELACION: 'Cancelación',
  REINTEGRO: 'Reintegro',
};

const ENTIDADES: Record<EntidadAuditoria, string> = {
  TORNEO: 'Torneo',
  PARTIDO: 'Partido',
  RIFA: 'Rifa',
  CUSTODIA: 'Custodia',
  BILLETERA: 'Billetera',
  CARGA_CRIPTO: 'Carga con cripto',
  USUARIO: 'Usuario',
  PARAMETRO: 'Parámetro',
};

const buscarUsuarios = (q: string): Promise<OpcionFiltro[]> =>
  usuarioApi
    .getUsuarios({ q, size: 8 })
    .then((pagina) =>
      pagina.content.map((u) => ({ id: u.id, texto: `${u.persona.nombreCompleto} (@${u.username})` }))
    );

/** `2026-11-05` del input → las 00:00 de ese día en la hora del navegador; `diasDespues` corre el día. */
const inicioDelDia = (dia: string, diasDespues = 0): string | undefined => {
  if (!dia) return undefined;
  const d = new Date(`${dia}T00:00`);
  d.setDate(d.getDate() + diasDespues);
  return d.toISOString();
};

const entidad = (r: RegistroAuditoria): string =>
  r.entidad ? `${ENTIDADES[r.entidad] ?? r.entidad} ${r.entidadId ?? ''}`.trim() : '-';

/** Quién lo hizo. Un login con un usuario que no existe no tiene a quién: va lo que se escribió. */
const quien = (r: RegistroAuditoria): string | null => {
  if (r.username) return `@${r.username}`;
  const identificador = r.detalle?.identificador;
  if (r.accion === 'LOGIN_FALLIDO' && typeof identificador === 'string') return `${identificador} (no existe)`;
  return null;
};

const resumen = (detalle: RegistroAuditoria['detalle']): string =>
  detalle
    ? Object.entries(detalle)
        .map(([clave, valor]) => `${clave}: ${typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}`)
        .join(' · ')
    : '-';

export const AuditoriaPage: React.FC = () => {
  const [tipoEntidad, setTipoEntidad] = useState<EntidadAuditoria | ''>('');
  const [entidadId, setEntidadId] = useState('');
  const [usuario, setUsuario] = useState<OpcionFiltro | null>(null);
  const [accion, setAccion] = useState<AccionAuditoria | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(0);
  const [resultado, setResultado] = useState<PageResponse<RegistroAuditoria> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<RegistroAuditoria | null>(null);
  const [idsConRegistros, setIdsConRegistros] = useState<string[]>([]);

  useEffect(() => {
    setIdsConRegistros([]);
    if (!tipoEntidad) return;
    let vigente = true;
    auditoriaApi
      .ids(tipoEntidad)
      .then((ids) => vigente && setIdsConRegistros(ids))
      // sin la lista igual se puede escribir el id
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [tipoEntidad]);

  useEffect(() => {
    const filtros: FiltrosAuditoria = {
      entidad: tipoEntidad || undefined,
      entidadId: (tipoEntidad && entidadId.trim()) || undefined,
      usuario: usuario?.id,
      accion: accion || undefined,
      desde: inicioDelDia(desde),
      // hasta no incluye ese instante: el día elegido entra entero
      hasta: inicioDelDia(hasta, 1),
    };
    let vigente = true;
    setError(null);
    auditoriaApi
      .listar(filtros, pagina, TAMANIO_PAGINA)
      .then((r) => vigente && setResultado(r))
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar la auditoría.')));
    return () => {
      vigente = false;
    };
  }, [tipoEntidad, entidadId, usuario, accion, desde, hasta, pagina]);

  /** Cambiar un filtro vuelve a la primera página. */
  const filtrar = <T,>(set: (valor: T) => void) => (valor: T) => {
    set(valor);
    setPagina(0);
  };

  const elegirEntidad = (tipo: EntidadAuditoria | '', id = '') => {
    setTipoEntidad(tipo);
    setEntidadId(id);
    setPagina(0);
  };

  const limpiar = () => {
    elegirEntidad('');
    setUsuario(null);
    setAccion('');
    setDesde('');
    setHasta('');
  };

  const hayFiltros = !!(tipoEntidad || usuario || accion || desde || hasta);
  const total = resultado?.page.totalElements ?? 0;
  const totalPaginas = resultado?.page.totalPages ?? 1;
  const primero = total === 0 ? 0 : pagina * TAMANIO_PAGINA + 1;
  const ultimo = Math.min((pagina + 1) * TAMANIO_PAGINA, total);

  return (
    <div className="auditoria-page">
      <div>
        <h1>Auditoría</h1>
        <p className="auditoria-subtitulo">
          Lo que pasó en la plataforma, del más nuevo al más viejo. Los filtros se combinan.
        </p>
      </div>

      <Card>
        <div className="auditoria-filtros" role="search" aria-label="Filtros de la auditoría">
          <Field label="Entidad">
            <Select
              value={tipoEntidad}
              onChange={(e) => elegirEntidad(e.target.value as EntidadAuditoria | '')}
            >
              <option value="">Todas</option>
              {Object.entries(ENTIDADES).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={tipoEntidad === 'PARAMETRO' ? 'Clave' : 'Id'}
            hint={tipoEntidad === 'TORNEO' ? 'Trae también sus partidos, su rifa y sus pagos.' : undefined}
          >
            <Select
              value={entidadId}
              disabled={!tipoEntidad}
              onChange={(e) => filtrar(setEntidadId)(e.target.value)}
            >
              <option value="">{tipoEntidad ? 'Todos' : 'Elegí una entidad'}</option>
              {/* el elegido tocando una fila puede no estar entre los 200 de la lista */}
              {(entidadId && !idsConRegistros.includes(entidadId)
                ? [entidadId, ...idsConRegistros]
                : idsConRegistros
              ).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </Select>
          </Field>
          <BuscadorFiltro
            label="Usuario"
            placeholder="Buscar por nombre o @usuario..."
            buscar={buscarUsuarios}
            elegido={usuario}
            onElegir={filtrar(setUsuario)}
          />
          <Field label="Acción">
            <Select
              value={accion}
              onChange={(e) => filtrar(setAccion)(e.target.value as AccionAuditoria | '')}
            >
              <option value="">Todas</option>
              {Object.entries(ACCIONES).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Desde">
            <Input type="date" value={desde} max={hasta || undefined} onChange={(e) => filtrar(setDesde)(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={hasta} min={desde || undefined} onChange={(e) => filtrar(setHasta)(e.target.value)} />
          </Field>
        </div>
        {hayFiltros && (
          <div className="auditoria-limpiar">
            <Button size="sm" variant="ghost" onClick={limpiar}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      {resultado === null && !error && <p>Cargando...</p>}

      {resultado !== null && resultado.content.length === 0 && (
        <Card>
          <p className="auditoria-vacia">
            {hayFiltros
              ? 'No hay registros que cumplan con los filtros.'
              : 'Todavía no hay registros en la auditoría.'}
          </p>
        </Card>
      )}

      {resultado !== null && resultado.content.length > 0 && (
        <>
          <Table caption="Registros de la auditoría, del más nuevo al más viejo">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Descripción</th>
                <th>IP</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {resultado.content.map((r) => (
                <tr key={r.id}>
                  <td className="auditoria-fecha">{fechaHora(r.fecha)}</td>
                  <td>{quien(r) ?? <span className="auditoria-sistema">Sistema</span>}</td>
                  <td>{ACCIONES[r.accion] ?? r.accion}</td>
                  <td>
                    {r.entidad && r.entidadId ? (
                      <button
                        type="button"
                        className="auditoria-entidad"
                        title="Filtrar por esta entidad"
                        onClick={() => elegirEntidad(r.entidad!, r.entidadId!)}
                      >
                        {entidad(r)}
                      </button>
                    ) : (
                      entidad(r)
                    )}
                  </td>
                  <td>{r.descripcion ?? '-'}</td>
                  <td>{r.ip ?? '-'}</td>
                  <td>
                    <div className="auditoria-detalle">
                      <span className="auditoria-resumen">{resumen(r.detalle)}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={`Ver detalle del registro ${r.id}`}
                        onClick={() => setAbierto(r)}
                      >
                        Ver
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="auditoria-paginacion">
            <span>
              Mostrando {primero} a {ultimo} de {total} registros
            </span>
            <nav aria-label="Paginación" className="auditoria-paginas">
              <Button size="sm" variant="secondary" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
                &laquo; Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pagina + 1 >= totalPaginas}
                onClick={() => setPagina(pagina + 1)}
              >
                Siguiente &raquo;
              </Button>
            </nav>
          </div>
        </>
      )}

      {abierto && (
        <Modal isOpen title={`Registro ${abierto.id}`} onClose={() => setAbierto(null)} size="lg">
          <dl className="auditoria-ficha">
            <dt>Fecha y hora</dt>
            <dd>{fechaHora(abierto.fecha)}</dd>
            <dt>Usuario</dt>
            <dd>{quien(abierto) ?? 'Sistema'}</dd>
            <dt>Acción</dt>
            <dd>{ACCIONES[abierto.accion] ?? abierto.accion}</dd>
            <dt>Entidad</dt>
            <dd>{entidad(abierto)}</dd>
            <dt>Descripción</dt>
            <dd>{abierto.descripcion ?? '-'}</dd>
            <dt>IP</dt>
            <dd>{abierto.ip ?? '-'}</dd>
          </dl>
          <h3 className="auditoria-titulo">Detalle</h3>
          <pre className="auditoria-json">{abierto.detalle ? JSON.stringify(abierto.detalle, null, 2) : '-'}</pre>
        </Modal>
      )}
    </div>
  );
};
