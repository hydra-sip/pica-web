import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DecisionReclamo,
  reclamoAdminApi,
  ReclamoAdminResumen,
} from '../../api/reclamoAdminApi';
import { rifaPublicaApi, SorteoRifa } from '../../api/rifaApi';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../../rifas/formato';
import { fechaHora } from '../../shared/formato';
import { codigoDeError, erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card, Field, Modal, Textarea } from '../../shared/ui';
import { IconoAlerta, IconoListo } from '../../shared/ui/Iconos';
import { VerificacionRifa } from '../../verificacion/components/VerificacionRifa';
import '../../verificacion/verificacion.css';
import { DECISION_RECLAMO_UI, decisionDeEstado, ESTADO_RECLAMO_UI } from '../reclamosUi';
import './ReclamosPage.css';

const DECISIONES: DecisionReclamo[] = ['SIN_FRAUDE', 'FRAUDE_CONFIRMADO'];

/**
 * Detalle de un reclamo de rifa y resolución en el admin (HU-706 / T706-2).
 * Reutiliza GET /rifas/publicas/{rifaId}/sorteo y el motor de verificación criptográfica para auditar el sorteo
 * antes de emitir la decisión (SIN_FRAUDE → RECHAZADO, FRAUDE_CONFIRMADO → ACEPTADO).
 */
export const ReclamoDetallePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const reclamoId = Number(id);

  const [reclamo, setReclamo] = useState<ReclamoAdminResumen | null>(null);
  const [sorteo, setSorteo] = useState<SorteoRifa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoSorteo, setCargandoSorteo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSorteo, setErrorSorteo] = useState<string | null>(null);

  // Formulario de resolución
  const [decision, setDecision] = useState<DecisionReclamo | null>(null);
  const [resolucion, setResolucion] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorResolucion, setErrorResolucion] = useState<string | null>(null);
  const [exitoResolucion, setExitoResolucion] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(reclamoId) || reclamoId <= 0) {
      setError('Identificador de reclamo inválido.');
      setCargando(false);
      return;
    }

    let vigente = true;
    setCargando(true);
    setError(null);
    setReclamo(null);
    setSorteo(null);
    setErrorSorteo(null);

    reclamoAdminApi
      .obtener(reclamoId)
      .then((datos) => {
        if (!vigente) return;
        setReclamo(datos);
        setCargandoSorteo(true);
        rifaPublicaApi
          .sorteo(datos.rifa.id)
          .then((datosSorteo) => {
            if (vigente) setSorteo(datosSorteo);
          })
          .catch((err) => {
            if (vigente) {
              setErrorSorteo(
                mensajeDeError(err, 'No se pudieron cargar los datos criptográficos del sorteo.')
              );
            }
          })
          .finally(() => {
            if (vigente) setCargandoSorteo(false);
          });
      })
      .catch((err) => {
        if (vigente) {
          setError(mensajeDeError(err, 'No se pudo cargar el reclamo.'));
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [reclamoId]);

  const abrirConfirmacion = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorResolucion(null);
    setExitoResolucion(null);

    const faltan: Record<string, string> = {};
    if (!decision) {
      faltan.decision = 'Seleccioná una decisión.';
    }
    if (!resolucion.trim()) {
      faltan.resolucion = 'Ingresá la fundamentación de la resolución.';
    }
    setErrores(faltan);
    if (Object.keys(faltan).length > 0) return;

    setConfirmarAbierto(true);
  };

  const confirmarResolucion = async () => {
    if (!reclamo || !decision) return;
    setEnviando(true);
    setErrorResolucion(null);

    try {
      const actualizado = await reclamoAdminApi.resolver(reclamo.id, {
        decision,
        resolucion: resolucion.trim(),
      });
      setReclamo(actualizado);
      setConfirmarAbierto(false);
      setExitoResolucion(
        decision === 'FRAUDE_CONFIRMADO'
          ? 'Resolución registrada: se confirmó fraude y el reclamo quedó aceptado.'
          : 'Resolución registrada: sin fraude, el reclamo quedó rechazado.'
      );
    } catch (err) {
      setConfirmarAbierto(false);
      if (codigoDeError(err) === 'RECLAMO_YA_RESUELTO') {
        setErrorResolucion(mensajeDeError(err, 'Este reclamo ya fue resuelto anteriormente.'));
        reclamoAdminApi
          .obtener(reclamo.id)
          .then(setReclamo)
          .catch(() => undefined);
      } else {
        setErrores(erroresPorCampo(err));
        setErrorResolucion(mensajeDeError(err, 'No se pudo registrar la resolución.'));
      }
    } finally {
      setEnviando(false);
    }
  };

  const volver = (
    <Link to="/admin/reclamos" className="reclamos-volver">
      &larr; Volver a reclamos
    </Link>
  );

  if (cargando) {
    return (
      <div className="reclamos-page">
        {volver}
        <p className="reclamos-vacio">Cargando detalle del reclamo...</p>
      </div>
    );
  }

  if (error || !reclamo) {
    return (
      <div className="reclamos-page">
        {volver}
        <div className="alerta alerta-peligro" role="alert">
          {error || 'No se pudo cargar el reclamo.'}
        </div>
      </div>
    );
  }

  const estadoUi = ESTADO_RECLAMO_UI[reclamo.estado];
  const rifaEstadoUi = ESTADO_RIFA_UI[reclamo.rifa.estado] ?? reclamo.rifa.estado;
  const rifaTono = TONO_ESTADO_RIFA[reclamo.rifa.estado] ?? 'neutral';
  const decisionEmitida = decisionDeEstado(reclamo.estado);

  return (
    <div className="reclamos-page">
      <header>
        {volver}
        <div className="reclamos-titulo-row">
          <h1 style={{ margin: 0 }}>Reclamo #{reclamo.id}</h1>
          <Badge tone={estadoUi.tono}>{estadoUi.texto}</Badge>
          <Badge tone={rifaTono}>Rifa: {rifaEstadoUi}</Badge>
        </div>
        <p className="reclamos-subtitulo">
          {reclamo.rifa.titulo}
          {reclamo.rifa.torneoNombre && ` · ${reclamo.rifa.torneoNombre}`}
        </p>
      </header>

      {exitoResolucion && (
        <div className="alerta alerta-exito" role="status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconoListo size={18} />
          <span>{exitoResolucion}</span>
        </div>
      )}

      {errorResolucion && (
        <div className="alerta alerta-peligro" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconoAlerta size={18} />
          <span>{errorResolucion}</span>
        </div>
      )}

      {/* Resumen del reclamo y de la rifa */}
      <Card as="section" className="reclamo-detalle-card" aria-labelledby="reclamo-info-titulo">
        <h2 id="reclamo-info-titulo">Datos del reclamo y la rifa</h2>

        <dl className="reclamo-grilla-datos">
          <div>
            <dt>Reclamante</dt>
            <dd>
              <strong>@{reclamo.reclamante.username}</strong>
              <span className="reclamos-celda-secundaria">{reclamo.reclamante.email}</span>
            </dd>
          </div>
          <div>
            <dt>Fecha del reclamo</dt>
            <dd>{fechaHora(reclamo.creadoEn)}</dd>
          </div>
          <div>
            <dt>Rifa</dt>
            <dd>
              <strong>{reclamo.rifa.titulo}</strong>
              <span className="reclamos-celda-secundaria">
                <Link to={`/rifas/${reclamo.rifa.id}`}>Ver ficha pública</Link>
              </span>
            </dd>
          </div>
          <div>
            <dt>Torneo asociado</dt>
            <dd>{reclamo.rifa.torneoNombre ?? 'Sin torneo'}</dd>
          </div>
          <div>
            <dt>Fecha programada del sorteo</dt>
            <dd>{fechaHora(reclamo.rifa.fechaSorteo)}</dd>
          </div>
          <div>
            <dt>Semilla obtenida</dt>
            <dd>{fechaHora(reclamo.rifa.semillaObtenidaEn)}</dd>
          </div>
          {sorteo && (
            <>
              <div>
                <dt>Lista sellada</dt>
                <dd>{fechaHora(sorteo.listaSelladaEn)}</dd>
              </div>
              <div>
                <dt>Compromiso publicado</dt>
                <dd>{fechaHora(sorteo.compromisoPublicadoEn)}</dd>
              </div>
            </>
          )}
        </dl>

        <div className="reclamo-motivo-bloque">
          <h3>Motivo del reclamo</h3>
          <p>{reclamo.motivo}</p>
        </div>
      </Card>

      {/* Datos completos del sorteo y verificación criptográfica */}
      <section className="reclamo-sorteo-seccion" aria-labelledby="reclamo-sorteo-titulo">
        <div className="reclamo-sorteo-cabecera">
          <h2 id="reclamo-sorteo-titulo">Verificación criptográfica del sorteo</h2>
          <Link to={`/verificacion?tipo=RIFA&id=${reclamo.rifa.id}`} className="btn btn-sm btn-secondary">
            Abrir en portal de verificación
          </Link>
        </div>

        {cargandoSorteo && <p className="reclamos-subtitulo">Cargando datos del sorteo...</p>}

        {errorSorteo && !cargandoSorteo && (
          <div className="alerta alerta-aviso" role="alert">
            {errorSorteo}
          </div>
        )}

        {sorteo && !cargandoSorteo && <VerificacionRifa key={sorteo.id} datos={sorteo} />}
      </section>

      {/* Resolución o formulario de resolución */}
      <Card as="section" className="reclamo-resolucion-card" aria-labelledby="reclamo-resolucion-titulo">
        {reclamo.estado === 'PENDIENTE' ? (
          <>
            <h2 id="reclamo-resolucion-titulo">Resolver reclamo</h2>
            <form onSubmit={abrirConfirmacion} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <fieldset className="reclamo-decision-grupo">
                <legend>
                  Decisión <span className="field-requerido" aria-hidden="true">*</span>
                </legend>
                <div className="reclamo-decision-opciones">
                  {DECISIONES.map((op) => {
                    const info = DECISION_RECLAMO_UI[op];
                    const seleccionada = decision === op;
                    const claseSeleccion = seleccionada
                      ? op === 'FRAUDE_CONFIRMADO'
                        ? ' seleccionada-fraude'
                        : ' seleccionada'
                      : '';
                    return (
                      <label
                        key={op}
                        className={`reclamo-decision-opcion${claseSeleccion}`}
                      >
                        <input
                          type="radio"
                          name="decision"
                          value={op}
                          checked={seleccionada}
                          onChange={() => {
                            setDecision(op);
                            setErrores((prev) => ({ ...prev, decision: '' }));
                          }}
                          disabled={enviando}
                        />
                        <span>
                          <span className="reclamo-decision-titulo">{info.titulo}</span>
                          <span className="reclamo-decision-desc">{info.descripcion}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errores.decision && (
                  <span className="field-error" role="alert">
                    {errores.decision}
                  </span>
                )}
              </fieldset>

              <Field
                label="Resolución / Fundamentación"
                required
                error={errores.resolucion}
                hint="Dejá constancia del resultado de la verificación criptográfica y de los motivos de la decisión."
              >
                <Textarea
                  rows={4}
                  maxLength={2000}
                  value={resolucion}
                  onChange={(e) => {
                    setResolucion(e.target.value);
                    if (errores.resolucion) {
                      setErrores((prev) => ({ ...prev, resolucion: '' }));
                    }
                  }}
                  placeholder="Detallá el análisis realizado sobre la semilla, la lista sellada, el compromiso y los ganadores..."
                  disabled={enviando}
                />
              </Field>

              <div className="reclamo-acciones-form">
                <Button type="submit" disabled={enviando}>
                  Emitir resolución
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 id="reclamo-resolucion-titulo">Resolución emitida</h2>
            <div className="reclamo-resolucion-emitida" data-testid="reclamo-resolucion-emitida">
              <dl className="reclamo-grilla-datos" style={{ padding: 0, background: 'transparent' }}>
                <div>
                  <dt>Decisión</dt>
                  <dd>
                    <strong>
                      {decisionEmitida ? DECISION_RECLAMO_UI[decisionEmitida].resultado : estadoUi.texto}
                    </strong>
                  </dd>
                </div>
                <div>
                  <dt>Resuelto por</dt>
                  <dd>{reclamo.resueltoPor ?? '-'}</dd>
                </div>
                <div>
                  <dt>Fecha de resolución</dt>
                  <dd>{fechaHora(reclamo.resueltoEn)}</dd>
                </div>
              </dl>
              <div>
                <span className="reclamo-subetiqueta">Fundamentación</span>
                <p className="reclamo-resolucion-texto">{reclamo.resolucion ?? '-'}</p>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={confirmarAbierto}
        onClose={() => !enviando && setConfirmarAbierto(false)}
        closeDisabled={enviando}
        title="Confirmar resolución del reclamo"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmarAbierto(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              variant={decision === 'FRAUDE_CONFIRMADO' ? 'danger' : 'primary'}
              loading={enviando}
              onClick={() => void confirmarResolucion()}
            >
              Confirmar resolución
            </Button>
          </>
        }
      >
        {decision && (
          <div className="reclamo-modal-resumen">
            <p>
              Vas a resolver el <strong>Reclamo #{reclamo.id}</strong> sobre la rifa{' '}
              <strong>{reclamo.rifa.titulo}</strong> con la decisión:
            </p>
            <p>
              <strong>{DECISION_RECLAMO_UI[decision].resultado}</strong>
            </p>
            <p className="reclamos-subtitulo">{DECISION_RECLAMO_UI[decision].descripcion}</p>
            <blockquote>{resolucion.trim()}</blockquote>
            <p className="reclamos-subtitulo">Esta acción es definitiva y no se puede revertir.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
