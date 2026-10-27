import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  EvidenciaDetalle,
  ObjecionComparada,
  ObjecionDetalle,
  PartidoDetalle,
  partidoApi,
} from '../../api/partidoApi';
import { LadoBracket } from '../../api/torneoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card } from '../../shared/ui';
import { CamposMarcador } from '../components/CamposMarcador';
import { ComparativoObjecion } from '../components/ComparativoObjecion';
import { EvidenciasPartido } from '../components/EvidenciasPartido';
import { ObjetarResultado } from '../components/ObjetarResultado';
import { ResolverObjecion } from '../components/ResolverObjecion';
import { abreviarHash } from '../../torneos/formato';
import { formatFecha } from '../../torneos/utils/formatters';
import {
  CERRADOS,
  EN_JUEGO,
  ESTADO_PARTIDO_UI,
  TONO_ESTADO_PARTIDO,
  tiempoRestante,
} from '../formato';
import { MARCADOR_VACIO, Marcador, erroresDelMarcador, payloadDelMarcador } from '../marcador';
import '../partidos.css';

const marcador = (lado: LadoBracket | null): string =>
  lado?.puntaje == null
    ? '-'
    : `${lado.puntaje}${lado.penales == null ? '' : ` (${lado.penales})`}`;

const propuesta = (o: ObjecionDetalle): string =>
  o.penalesLocal == null
    ? `${o.puntajeLocal} - ${o.puntajeVisitante}`
    : `${o.puntajeLocal} (${o.penalesLocal}) - ${o.puntajeVisitante} (${o.penalesVisitante})`;

/** Cuánto falta para `hasta`, actualizado cada segundo; null sin fecha. */
const useCuentaRegresiva = (hasta: string | null): number | null => {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!hasta) return undefined;
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [hasta]);
  return hasta ? new Date(hasta).getTime() - ahora : null;
};

/**
 * El partido (wireframe "Carga y Objeción Resultados", PICA-243 y PICA-245). El capitán de un lado carga el
 * marcador, con evidencia opcional; el del otro ve el resultado recibido con el tiempo para objetarlo, y lo acepta o
 * lo objeta con su resultado, el motivo y evidencia. Objetado, las partes ven la objeción, y el organizador o un
 * árbitro con permiso compara las dos versiones con su evidencia y el historial (PICA-247) y emite el laudo
 * (PICA-249). Los demás ven el resultado.
 */
export const PartidoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [partido, setPartido] = useState<PartidoDetalle | null>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaDetalle[]>([]);
  const [comparada, setComparada] = useState<ObjecionComparada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Marcador>(MARCADOR_VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const restante = useCuentaRegresiva(
    partido?.estado === 'RESULTADO_CARGADO' ? partido.objecionVenceEn : null
  );

  useEffect(() => {
    let vigente = true;
    partidoApi
      .obtener(Number(id))
      .then((p) => {
        if (!vigente) return;
        setPartido(p);
        // La ven las partes, los árbitros y el organizador; a los demás no se les muestra.
        partidoApi
          .evidencias(p.id)
          .then((e) => vigente && setEvidencias(e))
          .catch(() => vigente && setEvidencias([]));
        // El comparativo (HU-303) lo ve quien puede laudar, también después del laudo; a los demás, 403.
        if (p.objecion) {
          partidoApi
            .objecion(p.id)
            .then((c) => vigente && setComparada(c))
            .catch(() => vigente && setComparada(null));
        }
      })
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar el partido.')));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (error || !partido) {
    return (
      <div className="partido-page">
        {error ? (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        ) : (
          <p className="partido-ayuda">Cargando partido...</p>
        )}
      </div>
    );
  }

  const conRivales = Boolean(partido.local && partido.visitante);
  const puedeCargar = Boolean(partido.miLado) && conRivales && EN_JUEGO.includes(partido.estado);
  const puedeAceptar =
    partido.estado === 'RESULTADO_CARGADO' &&
    Boolean(partido.miLado) &&
    partido.cargadoPor !== partido.miLado;
  const esperandoAlRival =
    partido.estado === 'RESULTADO_CARGADO' && partido.miLado === partido.cargadoPor;
  const puedeSubir = Boolean(partido.miLado) && conRivales && !CERRADOS.includes(partido.estado);
  const rival = partido.miLado === 'LOCAL' ? partido.visitante : partido.local;
  const objetor = partido.objecion?.lado === 'LOCAL' ? partido.local : partido.visitante;
  const conEvidenciaPropia = evidencias.some((e) => e.lado === partido.miLado);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const faltan = erroresDelMarcador(form);
    setErrores(faltan);
    if (Object.keys(faltan).length > 0) return;

    setEnviando(true);
    setMensaje(null);
    try {
      setPartido(await partidoApi.cargarResultado(partido.id, payloadDelMarcador(form)));
      setMensaje({
        tipo: 'exito',
        texto: 'Resultado enviado. Ahora lo tiene que aceptar el rival.',
      });
    } catch (err) {
      setErrores(erroresPorCampo(err));
      setMensaje({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo cargar el resultado.') });
    } finally {
      setEnviando(false);
    }
  };

  const aceptar = async () => {
    setEnviando(true);
    setMensaje(null);
    try {
      setPartido(await partidoApi.aceptarResultado(partido.id));
      setMensaje({ tipo: 'exito', texto: 'Resultado aceptado: el cruce quedó cerrado.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo aceptar el resultado.') });
    } finally {
      setEnviando(false);
    }
  };

  const detalle = [
    partido.nombreRonda,
    partido.cancha,
    partido.arbitro && `Árbitro: ${partido.arbitro}`,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="partido-page">
      <header>
        {partido.torneoSlug && (
          <Link to={`/torneos/${partido.torneoSlug}`} className="partido-volver">
            ← {partido.torneo}
          </Link>
        )}
        <div className="partido-titulo">
          <h1>{puedeCargar ? 'Reportar marcador final' : 'Resultado del partido'}</h1>
          <Badge tone={TONO_ESTADO_PARTIDO[partido.estado]}>
            {ESTADO_PARTIDO_UI[partido.estado]}
          </Badge>
        </div>
        <p className="partido-ayuda">{detalle}</p>
        {comparada && (
          <Link to={`/torneos/${partido.torneoId}/objeciones`} className="partido-volver">
            Ver todas las objeciones del torneo →
          </Link>
        )}
      </header>

      {mensaje && (
        <div
          className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
          role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
        >
          {mensaje.texto}
        </div>
      )}

      <Card>
        {puedeCargar ? (
          <form className="partido-form" onSubmit={(e) => void enviar(e)} noValidate>
            <CamposMarcador
              marcador={form}
              errores={errores}
              nombreLocal={partido.local?.nombre}
              nombreVisitante={partido.visitante?.nombre}
              onChange={setForm}
            />
            <EvidenciasPartido
              partidoId={partido.id}
              evidencias={evidencias}
              puedeSubir={puedeSubir}
              onSubida={(e) => setEvidencias([...evidencias, e])}
            />
            <Button type="submit" loading={enviando} block>
              Confirmar y enviar resultado
            </Button>
          </form>
        ) : (
          <div className="partido-form">
            <div className="partido-resultado">
              <span className={partido.local?.ganador ? 'partido-ganador' : undefined}>
                {partido.local?.nombre ?? 'A definir'}
              </span>
              <strong>
                {marcador(partido.local)} - {marcador(partido.visitante)}
              </strong>
              <span className={partido.visitante?.ganador ? 'partido-ganador' : undefined}>
                {partido.visitante?.nombre ?? (partido.bye ? 'BYE' : 'A definir')}
              </span>
            </div>

            {puedeAceptar && (
              <div className="partido-rival">
                <p className="partido-rotulo">Vista del capitán rival</p>
                <p>
                  Resultado recibido:{' '}
                  <strong>
                    {marcador(partido.local)} - {marcador(partido.visitante)}
                  </strong>
                </p>
                {restante !== null && (
                  <p className="partido-plazo">
                    {restante > 0
                      ? `Tiempo límite para objetar: ${tiempoRestante(restante)}`
                      : 'Venció el plazo: el resultado se confirma solo en unos segundos.'}
                  </p>
                )}
                <Button loading={enviando} block onClick={() => void aceptar()}>
                  Aceptar marcador y cerrar cruce
                </Button>
              </div>
            )}

            {partido.objecion && (
              <div className="partido-objecion" role="status">
                <p className="partido-rotulo">
                  {partido.objecion.decision ? 'Objeción resuelta' : 'Resultado objetado'}
                </p>
                <p>
                  {objetor?.nombre ?? 'El rival'} propone{' '}
                  <strong>{propuesta(partido.objecion)}</strong>.
                </p>
                <p>Motivo: {partido.objecion.motivo}</p>
                {partido.estado === 'OBJETADO' && !partido.puedoResolver && (
                  <p className="partido-ayuda">
                    Lo resuelve el árbitro: hasta el laudo, el cruce no avanza. Podés sumar
                    evidencia.
                  </p>
                )}
                {partido.objecion.decision && (
                  <>
                    <p>
                      <strong>Laudo:</strong>{' '}
                      {partido.objecion.decision === 'CORREGIDO'
                        ? 'se corrigió el resultado'
                        : 'se confirmó el resultado cargado'}
                      , por {partido.objecion.resueltaPor}
                      {partido.objecion.resueltaEn &&
                        ` el ${formatFecha(partido.objecion.resueltaEn)}`}
                      .
                    </p>
                    <p>Justificación: {partido.objecion.justificacion}</p>
                    {partido.objecion.laudoHash && (
                      <p className="partido-hash">
                        Sello SHA-256{' '}
                        <code title={partido.objecion.laudoHash}>
                          {abreviarHash(partido.objecion.laudoHash)}
                        </code>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {comparada && <ComparativoObjecion partidoId={partido.id} comparada={comparada} />}

            {partido.puedoResolver && partido.objecion && (
              <ResolverObjecion
                partido={partido}
                evidencias={evidencias}
                onLaudado={(p) => {
                  setPartido(p);
                  partidoApi
                    .objecion(p.id)
                    .then(setComparada)
                    .catch(() => setComparada(null));
                  setMensaje({
                    tipo: 'exito',
                    texto: 'Laudo emitido: el resultado quedó firme y la llave avanzó.',
                  });
                }}
              />
            )}

            {esperandoAlRival && (
              <p className="partido-ayuda" role="status">
                Esperando que {rival?.nombre ?? 'el rival'} acepte el resultado.
                {restante !== null &&
                  (restante > 0
                    ? ` Si no lo objeta, se confirma solo en ${tiempoRestante(restante)}.`
                    : ' Venció el plazo: se confirma solo en unos segundos.')}
              </p>
            )}

            {!comparada && (
              <EvidenciasPartido
                partidoId={partido.id}
                evidencias={evidencias}
                puedeSubir={puedeSubir}
                onSubida={(e) => setEvidencias([...evidencias, e])}
              />
            )}

            {puedeAceptar && (
              <ObjetarResultado
                partido={partido}
                conEvidencia={conEvidenciaPropia}
                onObjetado={(p) => {
                  setPartido(p);
                  setMensaje({
                    tipo: 'exito',
                    texto:
                      'Resultado objetado: se avisó al árbitro y el cruce queda frenado hasta el laudo.',
                  });
                }}
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
