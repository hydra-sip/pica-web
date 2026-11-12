import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HonorarioDesignacion, MiDesignacion, torneoApi } from '../../api/torneoApi';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Button, Card, Field, Modal, Textarea } from '../../shared/ui';
import { IconoAlerta } from '../../shared/ui/Iconos';
import { COMPROMISOS, ESTADO_DESIGNACION, PERMISO_DESIGNACION, periodo } from '../designaciones';
import '../torneos.css';

const MAX_MOTIVO = 500;

const HONORARIO: Record<
  HonorarioDesignacion['estado'],
  { texto: string; tono: BadgeTone; nota: string }
> = {
  EN_CUSTODIA: {
    texto: 'Retenido en custodia',
    tono: 'solido',
    nota: 'La liquidación te lo transfiere a tu billetera de PICA cuando finaliza el torneo.',
  },
  ACREDITADO: {
    texto: 'Acreditado',
    tono: 'exito',
    nota: 'La liquidación ya te lo acreditó en tu billetera.',
  },
  REINTEGRADO: {
    texto: 'Devuelto',
    tono: 'neutral',
    nota: 'El torneo se canceló y el honorario volvió al organizador.',
  },
};

/**
 * Una designación de árbitro (HU-807, PICA-315; wireframes 48 y 49 "Aceptar Designación de Árbitro"): la ficha del
 * torneo, los permisos que propone el organizador y el código de imparcialidad, que hay que aceptar para arbitrar.
 * Rechazar pide confirmación y deja escribir un motivo, que le llega al organizador. Arriba del código, la custodia de
 * honorarios (HU-604): lo que el organizador le depositó, retenido hasta que la liquidación se lo acredita.
 */
export const DesignacionPage: React.FC = () => {
  const { torneoId } = useParams();
  const [designacion, setDesignacion] = useState<MiDesignacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compromisos, setCompromisos] = useState<boolean[]>(COMPROMISOS.map(() => false));
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    torneoApi
      .misDesignaciones()
      .then(
        (d) => vigente && setDesignacion(d.find((x) => x.torneoId === Number(torneoId)) ?? null)
      )
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar la designación.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  const responder = async (aceptar: boolean) => {
    if (!designacion) return;
    setOcupado(true);
    setError(null);
    try {
      setDesignacion(
        aceptar
          ? await torneoApi.aceptarDesignacion(designacion.torneoId)
          : await torneoApi.rechazarDesignacion(designacion.torneoId, motivo.trim() || null)
      );
      setRechazando(false);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo responder la designación.'));
    } finally {
      setOcupado(false);
    }
  };

  const volver = (
    <Link to="/mis-designaciones" className="torneos-volver">
      ← Mis designaciones
    </Link>
  );

  if (cargando) return <div className="torneos-page">{volver}Cargando la designación...</div>;
  if (!designacion) {
    return (
      <div className="torneos-page">
        {volver}
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>{error ?? 'No figurás como árbitro de ese torneo.'}</span>
        </div>
      </div>
    );
  }

  const d = designacion;
  const pendiente = d.estado === 'PENDIENTE';
  const todosAceptados = compromisos.every(Boolean);

  return (
    <div className="torneos-page">
      <div>
        {volver}
        <header className="torneos-encabezado">
          <div>
            <h1 className="designacion-titulo">
              {pendiente ? 'Aceptar designación como árbitro' : 'Designación como árbitro'}
            </h1>
            <p className="torneos-subtitulo">
              {pendiente
                ? 'Confirmá tu disponibilidad y aceptá el código de imparcialidad del torneo.'
                : d.respondidoEn
                  ? `La respondiste el ${fechaHora(d.respondidoEn)}.`
                  : 'Ya respondiste esta designación.'}
            </p>
          </div>
          <Badge tone={ESTADO_DESIGNACION[d.estado].tono}>
            Estado: {ESTADO_DESIGNACION[d.estado].texto}
          </Badge>
        </header>
      </div>

      {error && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="designacion-grilla">
        <div className="designacion-columna">
          <Card as="section" className="designacion-seccion">
            <h2>Ficha de la competencia</h2>
            <p className="designacion-dato">Te designó {d.organizador}, que organiza el torneo.</p>
            <dl className="designacion-ficha">
              <div>
                <dt>Torneo</dt>
                <dd>{d.slug ? <Link to={`/torneos/${d.slug}`}>{d.torneo}</Link> : d.torneo}</dd>
              </div>
              <div>
                <dt>Disciplina</dt>
                <dd>{d.disciplina}</dd>
              </div>
              <div>
                <dt>Período</dt>
                <dd>{periodo(d)}</dd>
              </div>
            </dl>
          </Card>

          <Card as="section" className="designacion-seccion">
            <h2>Permisos que te da el organizador</h2>
            <ul className="designacion-permisos">
              {d.permisos.map((p) => (
                <li key={p}>{PERMISO_DESIGNACION[p]}</li>
              ))}
            </ul>
          </Card>

          <Card as="section" className="designacion-seccion">
            <h2>Partidos asignados</h2>
            <p className="designacion-dato">
              {d.estado === 'ACEPTADO'
                ? 'Los partidos se reparten entre los árbitros que aceptaron cuando el organizador genera el bracket; ahí figura el árbitro de cada uno.'
                : 'Si aceptás, vas a recibir partidos cuando el organizador genere el bracket.'}
            </p>
            {d.estado === 'ACEPTADO' && d.slug && (
              <Link to={`/torneos/${d.slug}`} className="btn btn-secondary">
                Ver el torneo y su bracket
              </Link>
            )}
          </Card>
        </div>

        <div className="designacion-columna">
          <Card as="section" className="designacion-seccion">
            <h2>Custodia de honorarios</h2>
            <p className="designacion-dato">Fondos garantizados en la custodia del torneo.</p>
            {d.honorario ? (
              <>
                <div className="designacion-honorario">
                  <div>
                    <span>Total de honorarios acordados</span>
                    <strong>{pesos(d.honorario.monto)}</strong>
                  </div>
                  <Badge tone={HONORARIO[d.honorario.estado].tono}>
                    {HONORARIO[d.honorario.estado].texto}
                  </Badge>
                </div>
                <p className="designacion-nota">{HONORARIO[d.honorario.estado].nota}</p>
                {d.honorario.estado === 'ACREDITADO' && (
                  <Link to="/billetera" className="btn btn-secondary">
                    Ver mi billetera
                  </Link>
                )}
              </>
            ) : (
              <p className="designacion-nota">
                El organizador todavía no depositó honorarios para vos. Cuando lo haga, quedan
                retenidos acá y la liquidación te los acredita al finalizar el torneo.
              </p>
            )}
          </Card>

          <Card as="section" className="designacion-seccion designacion-respuesta">
            <h2>Código de imparcialidad</h2>
            {pendiente ? (
              <>
                <p className="designacion-dato">Para arbitrar tenés que aceptar los tres puntos.</p>
                <ul className="designacion-compromisos">
                  {COMPROMISOS.map((texto, i) => (
                    <li key={texto}>
                      <label>
                        <input
                          type="checkbox"
                          checked={compromisos[i]}
                          disabled={ocupado}
                          onChange={(e) =>
                            setCompromisos((actuales) =>
                              actuales.map((v, j) => (j === i ? e.target.checked : v))
                            )
                          }
                        />
                        <span>{texto}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="designacion-acciones">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={ocupado}
                    onClick={() => setRechazando(true)}
                  >
                    Rechazar designación
                  </Button>
                  <Button
                    type="button"
                    disabled={ocupado || !todosAceptados}
                    onClick={() => responder(true)}
                  >
                    Aceptar y confirmar
                  </Button>
                </div>
                <p className="designacion-nota">
                  Al responder, le avisamos al organizador por mail.
                </p>
              </>
            ) : d.estado === 'ACEPTADO' ? (
              <>
                <p className="designacion-dato">
                  Lo aceptaste: ya podés arbitrar con los permisos que te dieron.
                </p>
                {d.permisos.includes('RESOLVER_OBJECIONES') && (
                  <Link to={`/torneos/${d.torneoId}/objeciones`} className="btn btn-secondary">
                    Ver objeciones
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="designacion-dato">
                  Rechazaste la designación: no vas a arbitrar este torneo.
                </p>
                {d.motivoRechazo && <p className="designacion-dato">Motivo: {d.motivoRechazo}</p>}
              </>
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={rechazando}
        title="¿Rechazar la designación?"
        onClose={() => setRechazando(false)}
        closeDisabled={ocupado}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={ocupado}
              onClick={() => setRechazando(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={ocupado}
              onClick={() => responder(false)}
            >
              Rechazar
            </Button>
          </>
        }
      >
        <p>
          No vas a arbitrar {d.torneo}. El organizador recibe un aviso y puede designar a otro; si
          después cambiás de idea, te tiene que volver a designar.
        </p>
        <Field
          label="Motivo (opcional)"
          hint={`Le llega al organizador. Hasta ${MAX_MOTIVO} caracteres.`}
        >
          <Textarea
            rows={3}
            maxLength={MAX_MOTIVO}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={ocupado}
          />
        </Field>
      </Modal>
    </div>
  );
};
