import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EvidenciaDetalle, PartidoDetalle, partidoApi } from '../../api/partidoApi';
import { LadoBracket } from '../../api/torneoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card, Field, Input } from '../../shared/ui';
import { EvidenciasPartido } from '../components/EvidenciasPartido';
import {
  CERRADOS,
  EN_JUEGO,
  ESTADO_PARTIDO_UI,
  TONO_ESTADO_PARTIDO,
  tiempoRestante,
} from '../formato';
import '../partidos.css';

interface Marcador {
  local: string;
  visitante: string;
  penalesLocal: string;
  penalesVisitante: string;
}

const VACIO: Marcador = { local: '', visitante: '', penalesLocal: '', penalesVisitante: '' };

const numero = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));

const marcador = (lado: LadoBracket | null): string =>
  lado?.puntaje == null
    ? '-'
    : `${lado.puntaje}${lado.penales == null ? '' : ` (${lado.penales})`}`;

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
 * El partido (wireframe "Carga y Objeción Resultados", PICA-243). El capitán de un lado carga el marcador, con
 * evidencia opcional; el del otro ve el resultado recibido con el tiempo para objetarlo y lo acepta. Objetar es la
 * HU-302. Los demás ven el resultado.
 */
export const PartidoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [partido, setPartido] = useState<PartidoDetalle | null>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaDetalle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Marcador>(VACIO);
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
  const empate = form.local !== '' && form.local === form.visitante;
  const rival = partido.miLado === 'LOCAL' ? partido.visitante : partido.local;

  const cambiar = (campo: keyof Marcador) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const faltan: Record<string, string> = {};
    if (form.local === '') faltan.puntajeLocal = 'Es obligatorio.';
    if (form.visitante === '') faltan.puntajeVisitante = 'Es obligatorio.';
    if (empate && form.penalesLocal === '')
      faltan.penalesLocal = 'Con empate, se define por penales.';
    if (empate && form.penalesVisitante === '')
      faltan.penalesVisitante = 'Con empate, se define por penales.';
    if (empate && form.penalesLocal !== '' && form.penalesLocal === form.penalesVisitante)
      faltan.penalesVisitante = 'Los penales tienen que definir un ganador.';
    setErrores(faltan);
    if (Object.keys(faltan).length > 0) return;

    setEnviando(true);
    setMensaje(null);
    try {
      setPartido(
        await partidoApi.cargarResultado(partido.id, {
          puntajeLocal: Number(form.local),
          puntajeVisitante: Number(form.visitante),
          penalesLocal: empate ? numero(form.penalesLocal) : null,
          penalesVisitante: empate ? numero(form.penalesVisitante) : null,
        })
      );
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
            <div className="partido-marcador">
              <Field label={partido.local?.nombre} error={errores.puntajeLocal}>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.local}
                  onChange={cambiar('local')}
                />
              </Field>
              <span className="partido-guion" aria-hidden="true">
                -
              </span>
              <Field label={partido.visitante?.nombre} error={errores.puntajeVisitante}>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.visitante}
                  onChange={cambiar('visitante')}
                />
              </Field>
            </div>
            {empate && (
              <div className="partido-marcador">
                <Field label="Penales local" error={errores.penalesLocal}>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.penalesLocal}
                    onChange={cambiar('penalesLocal')}
                  />
                </Field>
                <span className="partido-guion" aria-hidden="true">
                  -
                </span>
                <Field label="Penales visitante" error={errores.penalesVisitante}>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.penalesVisitante}
                    onChange={cambiar('penalesVisitante')}
                  />
                </Field>
              </div>
            )}
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

            {esperandoAlRival && (
              <p className="partido-ayuda" role="status">
                Esperando que {rival?.nombre ?? 'el rival'} acepte el resultado.
                {restante !== null &&
                  (restante > 0
                    ? ` Si no lo objeta, se confirma solo en ${tiempoRestante(restante)}.`
                    : ' Venció el plazo: se confirma solo en unos segundos.')}
              </p>
            )}

            <EvidenciasPartido
              partidoId={partido.id}
              evidencias={evidencias}
              puedeSubir={puedeSubir}
              onSubida={(e) => setEvidencias([...evidencias, e])}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
