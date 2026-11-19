import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertaFraudeDetalle,
  alertaFraudeApi,
  EstadoAlertaFraude,
  ESTADOS_ALERTA_FRAUDE,
  FiltrosAlertaFraude,
  notificarAlertasActualizadas,
  ReglaFraude,
  REGLAS_FRAUDE,
} from '../../api/alertaFraudeApi';
import { PageResponse, usuarioApi, UsuarioDetalle, UsuarioResumen } from '../../api/usuarioApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { fechaHora, pesos } from '../../shared/formato';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Table,
  Textarea,
} from '../../shared/ui';
import { BloqueoModal } from '../components/BloqueoModal';
import { BuscadorFiltro, OpcionFiltro } from '../components/BuscadorFiltro';
import './AlertasFraudePage.css';

const TAMANIO_PAGINA = 20;

const ETIQUETA_DATO: Record<string, string> = {
  numerosComprados: 'Números comprados',
  umbralNumeros: 'Umbral de números',
  ventanaMinutos: 'Ventana temporal',
  rifaId: 'Rifa',
  torneoId: 'Torneo',
  cargas: 'Cargas',
  retiros: 'Retiros',
  totalOperaciones: 'Total de operaciones',
  montoCargas: 'Monto total cargado',
  montoRetiros: 'Monto total retirado',
  umbralOperaciones: 'Umbral de operaciones',
  torneosCancelados: 'Torneos cancelados',
  umbralCancelaciones: 'Umbral de cancelaciones',
  torneoIds: 'Torneos cancelados (IDs)',
  totalObjeciones: 'Total de objeciones',
  objecionesEnTorneo: 'Objeciones en el torneo',
  umbralObjeciones: 'Umbral de objeciones',
  partidoId: 'Partido',
  tipoCuenta: 'Tipo de cuenta',
  valor: 'CBU / CVU / Alias',
  cantidadUsuarios: 'Usuarios distintos',
  umbralUsuarios: 'Umbral de usuarios',
  usuariosIds: 'IDs de usuarios',
  usernames: 'Usuarios involucrados',
};

const CAMPOS_MONTO = new Set(['montoCargas', 'montoRetiros']);

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

const enteroPositivo = (valor: string): number | undefined => {
  const n = Number(valor);
  return valor.trim() && Number.isInteger(n) && n > 0 ? n : undefined;
};

const formatearDato = (clave: string, valor: unknown): string => {
  if (valor === null || valor === undefined) return '-';
  if (CAMPOS_MONTO.has(clave)) return pesos(typeof valor === 'number' || typeof valor === 'string' ? valor : null);
  if (clave === 'ventanaMinutos') return `${String(valor)} min`;
  if (Array.isArray(valor)) {
    if (clave === 'usernames') return valor.map((v) => `@${String(v)}`).join(', ');
    return valor.map((v) => String(v)).join(', ');
  }
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

const aUsuarioResumen = (alerta: AlertaFraudeDetalle, detalle: UsuarioDetalle | null): UsuarioResumen => {
  if (detalle) {
    return {
      id: detalle.id,
      username: detalle.username,
      email: detalle.email,
      estado: detalle.estado,
      eliminado: detalle.eliminado,
      protegido: detalle.protegido,
      persona: {
        id: alerta.usuario.id,
        nombreCompleto: `${detalle.persona.apellidos}, ${detalle.persona.nombres}`,
        tipoDoc: detalle.persona.tipoDoc,
        nroDoc: detalle.persona.nroDoc,
      },
      roles: detalle.roles,
      creadoEn: detalle.creadoEn,
    };
  }
  return {
    id: alerta.usuario.id,
    username: alerta.usuario.username,
    email: alerta.usuario.email,
    estado: 'ACTIVO',
    eliminado: false,
    protegido: false,
    persona: {
      id: alerta.usuario.id,
      nombreCompleto: `@${alerta.usuario.username}`,
    },
    roles: [],
    creadoEn: alerta.creadaEn,
  };
};

/**
 * Panel administrativo de alertas de fraude (HU-705 / PICA-417).
 * Lista alertas con PENDIENTE primero, combina filtros equivalentes a Auditoría y permite inspeccionar evidencia,
 * marcar como revisada con nota obligatoria y acceder directo al bloqueo o auditoría del usuario involucrado.
 */
export const AlertasFraudePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const puedeBloquear = hasPermission(['USUARIO_BLOQUEAR', 'USUARIO_EDITAR']);
  const puedeVerUsuario = hasPermission('USUARIO_VER');
  const puedeVerAuditoria = hasPermission('AUDITORIA_VER');

  const [estado, setEstado] = useState<EstadoAlertaFraude | ''>('');
  const [regla, setRegla] = useState<ReglaFraude | ''>('');
  const [usuario, setUsuario] = useState<OpcionFiltro | null>(null);
  const [torneoId, setTorneoId] = useState('');
  const [rifaId, setRifaId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(0);
  const [recarga, setRecarga] = useState(0);

  const [resultado, setResultado] = useState<PageResponse<AlertaFraudeDetalle> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avisoGlobal, setAvisoGlobal] = useState<string | null>(null);

  const [abierta, setAbierta] = useState<AlertaFraudeDetalle | null>(null);
  const [usuarioDetalle, setUsuarioDetalle] = useState<UsuarioDetalle | null>(null);
  const [usuariosBloqueados, setUsuariosBloqueados] = useState<Record<number, boolean>>({});
  const [nota, setNota] = useState('');
  const [errorNota, setErrorNota] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [exitoModal, setExitoModal] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [aBloquear, setABloquear] = useState<UsuarioResumen | null>(null);

  useEffect(() => {
    const filtros: FiltrosAlertaFraude = {
      estado: estado || undefined,
      regla: regla || undefined,
      usuarioId: usuario?.id,
      torneoId: enteroPositivo(torneoId),
      rifaId: enteroPositivo(rifaId),
      desde: inicioDelDia(desde),
      // hasta no incluye ese instante: el día elegido entra entero
      hasta: inicioDelDia(hasta, 1),
    };
    let vigente = true;
    setError(null);
    alertaFraudeApi
      .listar(filtros, pagina, TAMANIO_PAGINA)
      .then((res) => vigente && setResultado(res))
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar las alertas.')));
    return () => {
      vigente = false;
    };
  }, [estado, regla, usuario, torneoId, rifaId, desde, hasta, pagina, recarga]);

  const filtrar = <T,>(setter: (valor: T) => void) => (valor: T) => {
    setter(valor);
    setPagina(0);
  };

  const limpiar = () => {
    setEstado('');
    setRegla('');
    setUsuario(null);
    setTorneoId('');
    setRifaId('');
    setDesde('');
    setHasta('');
    setPagina(0);
  };

  const abrirDetalle = (alerta: AlertaFraudeDetalle) => {
    setAbierta(alerta);
    setUsuarioDetalle(null);
    setNota('');
    setErrorNota(null);
    setErrorModal(null);
    setExitoModal(null);

    alertaFraudeApi
      .obtener(alerta.id)
      .then((detalle) => setAbierta((actual) => (actual?.id === detalle.id ? detalle : actual)))
      .catch(() => {
        // Si falla la recarga puntual, ya se muestra el resumen completo recibido en la tabla.
      });

    if (puedeVerUsuario) {
      usuarioApi
        .getUsuario(alerta.usuario.id)
        .then((u) => {
          setUsuarioDetalle(u);
          if (u.estado === 'BLOQUEADO') {
            setUsuariosBloqueados((prev) => ({ ...prev, [u.id]: true }));
          }
        })
        .catch(() => {
          // Opcional: si no responde, se usa el resumen de usuario de la alerta.
        });
    }
  };

  const cerrarDetalle = () => {
    setAbierta(null);
    setUsuarioDetalle(null);
    setErrorNota(null);
    setErrorModal(null);
    setExitoModal(null);
  };

  const marcarRevisada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abierta) return;
    const notaLimpia = nota.trim();
    if (!notaLimpia) {
      setErrorNota('Ingresá una nota explicando la revisión.');
      return;
    }
    setEnviando(true);
    setErrorNota(null);
    setErrorModal(null);
    try {
      const actualizada = await alertaFraudeApi.revisar(abierta.id, notaLimpia);
      setAbierta(actualizada);
      setAvisoGlobal(`Alerta #${actualizada.id} marcada como revisada.`);
      setExitoModal('Alerta marcada como revisada.');
      setRecarga((n) => n + 1);
    } catch (err) {
      const msg = mensajeDeError(err, 'No se pudo marcar la alerta como revisada.');
      setErrorModal(msg);
      if (codigoDeError(err) === 'ALERTA_FRAUDE_YA_REVISADA') {
        alertaFraudeApi
          .obtener(abierta.id)
          .then((detalle) => {
            setAbierta(detalle);
            notificarAlertasActualizadas();
            setRecarga((n) => n + 1);
          })
          .catch(() => undefined);
      }
    } finally {
      setEnviando(false);
    }
  };

  const hayFiltros = !!(estado || regla || usuario || torneoId.trim() || rifaId.trim() || desde || hasta);
  const total = resultado?.page.totalElements ?? 0;
  const totalPaginas = Math.max(1, resultado?.page.totalPages ?? 1);
  const primero = total === 0 ? 0 : pagina * TAMANIO_PAGINA + 1;
  const ultimo = Math.min((pagina + 1) * TAMANIO_PAGINA, total);

  const usuarioAbiertoBloqueado =
    abierta !== null &&
    (usuariosBloqueados[abierta.usuario.id] === true || usuarioDetalle?.estado === 'BLOQUEADO');

  return (
    <div className="alertas-page">
      <div>
        <h1>Alertas de fraude</h1>
        <p className="alertas-subtitulo">
          Conductas sospechosas detectadas automáticamente en torneos, rifas y billeteras. Las pendientes aparecen primero.
        </p>
      </div>

      {avisoGlobal && (
        <div className="alerta alerta-exito" role="status">
          {avisoGlobal}
        </div>
      )}

      <Card>
        <div className="alertas-filtros" role="search" aria-label="Filtros de las alertas de fraude">
          <Field label="Estado">
            <Select
              value={estado}
              onChange={(e) => filtrar(setEstado)(e.target.value as EstadoAlertaFraude | '')}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="REVISADA">Revisadas</option>
            </Select>
          </Field>
          <Field label="Regla">
            <Select
              value={regla}
              onChange={(e) => filtrar(setRegla)(e.target.value as ReglaFraude | '')}
            >
              <option value="">Todas</option>
              {Object.entries(REGLAS_FRAUDE).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
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
          <Field label="Torneo (ID)">
            <Input
              type="number"
              min={1}
              placeholder="Ej.: 3"
              value={torneoId}
              onChange={(e) => filtrar(setTorneoId)(e.target.value)}
            />
          </Field>
          <Field label="Rifa (ID)">
            <Input
              type="number"
              min={1}
              placeholder="Ej.: 10"
              value={rifaId}
              onChange={(e) => filtrar(setRifaId)(e.target.value)}
            />
          </Field>
          <Field label="Desde">
            <Input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => filtrar(setDesde)(e.target.value)}
            />
          </Field>
          <Field label="Hasta">
            <Input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => filtrar(setHasta)(e.target.value)}
            />
          </Field>
        </div>
        {hayFiltros && (
          <div className="alertas-limpiar">
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

      {resultado === null && !error && <p>Cargando alertas...</p>}

      {resultado !== null && resultado.content.length === 0 && (
        <Card>
          <p className="alertas-vacia">
            {hayFiltros
              ? 'No hay alertas que cumplan con los filtros.'
              : 'No hay alertas de fraude registradas.'}
          </p>
        </Card>
      )}

      {resultado !== null && resultado.content.length > 0 && (
        <>
          <Table caption="Listado de alertas de fraude">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Regla</th>
                <th scope="col">Torneo o rifa</th>
                <th scope="col">Usuario</th>
                <th scope="col">Motivo</th>
                <th scope="col">Estado</th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {resultado.content.map((a) => {
                const estadoUi = ESTADOS_ALERTA_FRAUDE[a.estado];
                return (
                  <tr key={a.id}>
                    <td className="alertas-fecha">{fechaHora(a.creadaEn)}</td>
                    <td>
                      <span className="alertas-celda-principal">
                        {REGLAS_FRAUDE[a.regla] ?? a.regla}
                      </span>
                      <span className="alertas-celda-secundaria">#{a.id}</span>
                    </td>
                    <td>
                      {a.rifa && (
                        <div>
                          <Link className="alertas-enlace" to={`/rifas/${a.rifa.id}`}>
                            {a.rifa.titulo}
                          </Link>
                          <span className="alertas-celda-secundaria">Rifa #{a.rifa.id}</span>
                        </div>
                      )}
                      {a.torneo && (
                        <div>
                          <Link
                            className="alertas-enlace"
                            to={a.torneo.slug ? `/torneos/${a.torneo.slug}` : '/torneos'}
                          >
                            {a.torneo.nombre}
                          </Link>
                          <span className="alertas-celda-secundaria">Torneo #{a.torneo.id}</span>
                        </div>
                      )}
                      {!a.rifa && !a.torneo && (
                        <span className="alertas-celda-secundaria">Billetera / Cuenta</span>
                      )}
                    </td>
                    <td>
                      <div className="alertas-usuario-fila">
                        <span className="alertas-celda-principal">@{a.usuario.username}</span>
                        {usuariosBloqueados[a.usuario.id] && (
                          <Badge tone="peligro">Bloqueado</Badge>
                        )}
                      </div>
                      <span className="alertas-celda-secundaria">{a.usuario.email}</span>
                    </td>
                    <td>
                      <div className="alertas-motivo">{a.motivo}</div>
                    </td>
                    <td>
                      <Badge tone={estadoUi.tono}>{estadoUi.texto}</Badge>
                      {a.revisadaPor && (
                        <span className="alertas-celda-secundaria">Por @{a.revisadaPor}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button
                        size="sm"
                        variant={a.estado === 'PENDIENTE' ? 'primary' : 'secondary'}
                        aria-label={`Ver detalle de la alerta ${a.id}`}
                        onClick={() => abrirDetalle(a)}
                      >
                        {a.estado === 'PENDIENTE' ? 'Revisar' : 'Ver detalle'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          <div className="alertas-paginacion">
            <span>
              Mostrando {primero} a {ultimo} de {total} alertas
            </span>
            <nav aria-label="Paginación" className="alertas-paginas">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagina === 0}
                onClick={() => setPagina(pagina - 1)}
              >
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

      {abierta && (
        <Modal
          isOpen={aBloquear === null}
          title={`Alerta #${abierta.id} · ${REGLAS_FRAUDE[abierta.regla] ?? abierta.regla}`}
          onClose={cerrarDetalle}
          closeDisabled={enviando}
          size="lg"
        >
          <div className="alertas-detalle">
            {errorModal && (
              <div className="alerta alerta-peligro" role="alert">
                {errorModal}
              </div>
            )}
            {exitoModal && (
              <div className="alerta alerta-exito" role="status">
                {exitoModal}
              </div>
            )}

            <dl className="alertas-ficha">
              <dt>Estado</dt>
              <dd>
                <Badge tone={ESTADOS_ALERTA_FRAUDE[abierta.estado].tono}>
                  {ESTADOS_ALERTA_FRAUDE[abierta.estado].texto}
                </Badge>
              </dd>
              <dt>Detectada el</dt>
              <dd>{fechaHora(abierta.creadaEn)}</dd>
              <dt>Usuario involucrado</dt>
              <dd className="alertas-usuario-fila">
                <span>
                  @{abierta.usuario.username} ({abierta.usuario.email})
                </span>
                {usuarioAbiertoBloqueado && <Badge tone="peligro">Bloqueado</Badge>}
              </dd>
              {abierta.torneo && (
                <>
                  <dt>Torneo</dt>
                  <dd>
                    <Link
                      className="alertas-enlace"
                      to={abierta.torneo.slug ? `/torneos/${abierta.torneo.slug}` : '/torneos'}
                    >
                      {abierta.torneo.nombre}
                    </Link>
                  </dd>
                </>
              )}
              {abierta.rifa && (
                <>
                  <dt>Rifa</dt>
                  <dd>
                    <Link className="alertas-enlace" to={`/rifas/${abierta.rifa.id}`}>
                      {abierta.rifa.titulo}
                    </Link>
                  </dd>
                </>
              )}
              <dt>Motivo</dt>
              <dd>{abierta.motivo}</dd>
            </dl>

            <div>
              <h3 className="alertas-seccion-titulo">Datos de la regla</h3>
              <div className="alertas-datos">
                {Object.entries(abierta.datos).map(([clave, valor]) => (
                  <div key={clave} className="alertas-dato">
                    <span className="alertas-dato-clave">{ETIQUETA_DATO[clave] ?? clave}</span>
                    <span className="alertas-dato-valor">{formatearDato(clave, valor)}</span>
                  </div>
                ))}
              </div>
            </div>

            {(puedeVerAuditoria || puedeBloquear) && (
              <div className="alertas-accesos">
                {puedeVerAuditoria && (
                  <Link
                    to={`/admin/auditoria?usuario=${abierta.usuario.id}&username=${encodeURIComponent(
                      abierta.usuario.username
                    )}`}
                    className="btn btn-secondary btn-sm"
                  >
                    Ver auditoría
                  </Link>
                )}
                {puedeBloquear && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={usuarioAbiertoBloqueado}
                    onClick={() => setABloquear(aUsuarioResumen(abierta, usuarioDetalle))}
                  >
                    {usuarioAbiertoBloqueado ? 'Usuario bloqueado' : 'Bloquear usuario'}
                  </Button>
                )}
              </div>
            )}

            {abierta.estado === 'PENDIENTE' ? (
              <form className="alertas-revision-form" onSubmit={(e) => void marcarRevisada(e)} noValidate>
                <Field label="Nota de revisión" required error={errorNota ?? undefined}>
                  <Textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="Indicá qué verificaste o qué acción se tomó sobre el caso..."
                    value={nota}
                    onChange={(e) => {
                      setNota(e.target.value);
                      if (errorNota) setErrorNota(null);
                    }}
                    disabled={enviando}
                  />
                </Field>
                <div className="alertas-revision-acciones">
                  <Button type="button" variant="secondary" onClick={cerrarDetalle} disabled={enviando}>
                    Cerrar
                  </Button>
                  <Button type="submit" loading={enviando}>
                    Marcar como revisada
                  </Button>
                </div>
              </form>
            ) : (
              <div className="alertas-revision-form">
                <h3 className="alertas-seccion-titulo">Resolución registrada</h3>
                <dl className="alertas-ficha">
                  <dt>Revisada por</dt>
                  <dd>{abierta.revisadaPor ? `@${abierta.revisadaPor}` : '-'}</dd>
                  <dt>Revisada el</dt>
                  <dd>{fechaHora(abierta.revisadaEn)}</dd>
                  <dt>Nota</dt>
                  <dd>{abierta.nota ?? '-'}</dd>
                </dl>
              </div>
            )}
          </div>
        </Modal>
      )}

      <BloqueoModal
        usuario={aBloquear}
        onClose={() => setABloquear(null)}
        onBloqueado={() => {
          if (aBloquear) {
            setUsuariosBloqueados((prev) => ({ ...prev, [aBloquear.id]: true }));
            setUsuarioDetalle((actual) =>
              actual && actual.id === aBloquear.id ? { ...actual, estado: 'BLOQUEADO' } : actual
            );
            setExitoModal(
              `Usuario @${aBloquear.username} bloqueado y sus sesiones quedaron cerradas.`
            );
          }
          setABloquear(null);
        }}
      />
    </div>
  );
};
