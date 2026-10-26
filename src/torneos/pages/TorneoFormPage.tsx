import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FaltanteTorneo,
  GastoDetalle,
  OpcionesTorneo,
  torneoApi,
  TorneoInformacion,
} from '../../api/torneoApi';
import { PasosAsistente } from '../../shared/components/PasosAsistente';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card } from '../../shared/ui';
import { PasoCupos } from '../components/PasoCupos';
import { PasoEconomia } from '../components/PasoEconomia';
import { PasoInformacion } from '../components/PasoInformacion';
import {
  aPayloadEconomia,
  desdeEconomia,
  ErroresEconomia,
  FALTANTES,
  faltantesDe,
  FormEconomia,
  validarEconomia,
} from '../economia';
import { ESTADO_TORNEO_UI, participantes, TONO_ESTADO_TORNEO } from '../formato';
import {
  aPayload,
  CAMPOS_PASO_2,
  desdeTorneo,
  ErroresTorneo,
  FormTorneo,
  validarBorrador,
  validarPaso,
} from '../validacion';
import '../torneos.css';

type Paso = 1 | 2 | 3;

const TITULOS: Record<Paso, string> = {
  1: 'Paso 1: Configuración general del torneo',
  2: 'Paso 2: Configuración de cupos',
  3: 'Paso 3: Esquema económico y premios',
};

const pasoDe = (valor: string | null): Paso => (valor === '3' ? 3 : valor === '2' ? 2 : 1);

// RANGO_INVALIDO dice "rango de números" para las rifas; acá son cupos, fechas y nómina.
const MENSAJES_DE_CAMPO = { RANGO_INVALIDO: 'Está fuera de lo permitido.' };

/**
 * Asistente "Crear Nueva Competencia" (PICA-202 y PICA-205). Los pasos 1 y 2 editan el mismo formulario y se
 * guardan juntos, porque PUT /torneos/{id}/informacion reemplaza todo: el alta es POST /torneos y después cada
 * guardado es un PUT. El paso 3 se guarda aparte (PUT /torneos/{id}/economia; los gastos, cada uno en el momento)
 * y desde ahí se publica. "Continuar edición" abre en el paso que quedó pendiente. Fuera de BORRADOR todo queda
 * de solo lectura.
 */
export const TorneoFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [torneo, setTorneo] = useState<TorneoInformacion | null>(null);
  const [opciones, setOpciones] = useState<OpcionesTorneo | null>(null);
  const [form, setForm] = useState<FormTorneo>(() => desdeTorneo(null));
  const [errores, setErrores] = useState<ErroresTorneo>({});
  const [formEco, setFormEco] = useState<FormEconomia | null>(null);
  const [erroresEco, setErroresEco] = useState<ErroresEconomia>({});
  const [gastos, setGastos] = useState<GastoDetalle[]>([]);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [faltantes, setFaltantes] = useState<FaltanteTorneo[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [sugerenciasCanchas, setSugerenciasCanchas] = useState<string[]>([]);
  // El alta navega a la URL de edición: ese torneo ya está cargado y no hace falta pedirlo de nuevo.
  const recienCreado = useRef<number | null>(null);
  // El paso 3 se arma una vez por torneo, cuando están el torneo y el tope de comisión.
  const economiaDe = useRef<number | null | undefined>(undefined);

  const pedido = pasoDe(searchParams.get('paso'));
  // Sin el borrador guardado no hay paso 3: los gastos y la economía cuelgan del torneo.
  const paso: Paso = !torneo && pedido === 3 ? 2 : pedido;
  const editable = !torneo || torneo.estado === 'BORRADOR';
  const estado = torneo?.estado ?? 'BORRADOR';
  const cupoTope = opciones?.cupoMaximo ?? 64;

  useEffect(() => {
    let vigente = true;
    torneoApi
      .opciones()
      .then((o) => vigente && setOpciones(o))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar las opciones.'))
      );
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setTorneo(null);
      setForm(desdeTorneo(null));
      setGastos([]);
      setCargando(false);
      return;
    }
    if (recienCreado.current === Number(id)) {
      recienCreado.current = null;
      return;
    }
    let vigente = true;
    setCargando(true);
    setError(null);
    Promise.all([torneoApi.obtener(Number(id)), torneoApi.gastos(Number(id))])
      .then(([t, g]) => {
        if (!vigente) return;
        setTorneo(t);
        setForm(desdeTorneo(t));
        setGastos(g);
        // Sin ?paso, "Continuar edición" abre donde quedó.
        const pendiente = t.pasoPendiente ?? 1;
        if (!searchParams.get('paso') && pendiente >= 2) {
          setSearchParams({ paso: String(pendiente) }, { replace: true });
        }
      })
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar el torneo.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // searchParams solo se lee al cargar; no hace falta volver a pedir el torneo al cambiar de paso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!opciones || economiaDe.current === (torneo?.id ?? null)) return;
    economiaDe.current = torneo?.id ?? null;
    setFormEco(desdeEconomia(torneo?.economia ?? null, opciones.comisionMaxima));
  }, [torneo, opciones]);

  // Canchas que ya existen en la sede, para sugerirlas mientras se escribe.
  useEffect(() => {
    const sede = form.sede.trim();
    if (!editable || form.modalidad === 'ONLINE' || !sede) {
      setSugerenciasCanchas([]);
      return;
    }
    let vigente = true;
    const espera = setTimeout(() => {
      torneoApi
        .opciones(sede)
        .then((o) => vigente && setSugerenciasCanchas(o.canchas))
        .catch(() => vigente && setSugerenciasCanchas([]));
    }, 400);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [form.sede, form.modalidad, editable]);

  const cambiar = (cambios: Partial<FormTorneo>) => {
    setForm((prev) => ({ ...prev, ...cambios }));
    setErrores((prev) => {
      const siguen = { ...prev };
      (Object.keys(cambios) as (keyof FormTorneo)[]).forEach((campo) => delete siguen[campo]);
      return siguen;
    });
  };

  const cambiarEco = (cambios: Partial<FormEconomia>) => {
    setFormEco((prev) => (prev ? { ...prev, ...cambios } : prev));
    setErroresEco((prev) => {
      const siguen = { ...prev };
      (Object.keys(cambios) as (keyof FormEconomia)[]).forEach((campo) => delete siguen[campo]);
      // el reparto se marca en competidores aunque se haya cambiado la rifa o la comisión
      if ('pctPremioRifa' in cambios || 'pctComision' in cambios) delete siguen.pctPozoCompetidores;
      return siguen;
    });
  };

  const irAPaso = (destino: Paso) => {
    setSearchParams(destino === 1 ? {} : { paso: String(destino) }, { replace: true });
    setMensaje(null);
    setFaltantes([]);
  };

  /** Pasos 1 y 2. `seguir`: guardó con "Siguiente" y pasa al paso que sigue. */
  const guardar = async (seguir: boolean) => {
    setMensaje(null);
    const encontrados = seguir
      ? validarPaso(paso === 1 ? 1 : 2, form, cupoTope)
      : validarBorrador(form, cupoTope);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setMensaje({ tipo: 'error', texto: 'Revisá los campos marcados.' });
      return;
    }

    setGuardando(true);
    try {
      const guardado = torneo
        ? await torneoApi.actualizarInformacion(torneo.id, aPayload(form))
        : await torneoApi.crear(aPayload(form));
      setTorneo(guardado);
      setForm(desdeTorneo(guardado));
      setMensaje({ tipo: 'exito', texto: 'Borrador guardado.' });
      const destino: Paso = seguir ? (paso === 1 ? 2 : 3) : paso;
      if (!torneo) {
        // Recién creado: pasa a la URL de edición, que es la que se puede recargar o compartir.
        recienCreado.current = guardado.id;
        navigate(`/torneos/${guardado.id}/editar${destino === 1 ? '' : `?paso=${destino}`}`, {
          replace: true,
        });
      } else if (destino !== paso) {
        irAPaso(destino);
        setMensaje({ tipo: 'exito', texto: 'Borrador guardado.' });
      }
    } catch (err) {
      const delBack = erroresPorCampo(err, MENSAJES_DE_CAMPO) as ErroresTorneo;
      setErrores(delBack);
      const enElOtroPaso = (Object.keys(delBack) as (keyof FormTorneo)[]).some(
        (campo) => CAMPOS_PASO_2.includes(campo) !== (paso === 2)
      );
      setMensaje({
        tipo: 'error',
        texto: enElOtroPaso
          ? `Hay campos marcados en el paso ${paso === 1 ? 2 : 1}.`
          : mensajeDeError(err, 'No se pudo guardar el torneo.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  /** Paso 3: guarda la economía y devuelve el torneo guardado, o null si no se pudo. */
  const guardarEconomia = async (alPublicar: boolean): Promise<TorneoInformacion | null> => {
    if (!torneo || !formEco || !opciones) return null;
    setMensaje(null);
    setFaltantes([]);
    const encontrados = validarEconomia(
      formEco,
      opciones.comisionMaxima,
      torneo.cupoMaximo,
      alPublicar
    );
    setErroresEco(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setMensaje({ tipo: 'error', texto: 'Revisá los campos marcados.' });
      return null;
    }
    try {
      const guardado = await torneoApi.actualizarEconomia(torneo.id, aPayloadEconomia(formEco));
      setTorneo(guardado);
      setFormEco(desdeEconomia(guardado.economia, opciones.comisionMaxima));
      return guardado;
    } catch (err) {
      setErroresEco(erroresPorCampo(err) as ErroresEconomia);
      setMensaje({
        tipo: 'error',
        texto: mensajeDeError(err, 'No se pudo guardar el esquema económico.'),
      });
      return null;
    }
  };

  const guardarBorradorEconomia = async () => {
    setGuardando(true);
    const guardado = await guardarEconomia(false);
    setGuardando(false);
    if (guardado) setMensaje({ tipo: 'exito', texto: 'Borrador guardado.' });
  };

  /** Guarda el paso 3 y publica; si al torneo le falta algo, el back dice qué y en qué paso. */
  const publicar = async () => {
    if (!torneo) return;
    if (!aceptaTerminos) {
      setMensaje({
        tipo: 'error',
        texto: 'Para publicar tenés que aceptar los términos de custodia de fondos.',
      });
      return;
    }
    setGuardando(true);
    try {
      if (!(await guardarEconomia(true))) return;
      await torneoApi.publicar(torneo.id);
      navigate(`/torneos/${torneo.id}/publicado`);
    } catch (err) {
      const lista = faltantesDe(err);
      setFaltantes(lista);
      setMensaje({
        tipo: 'error',
        texto: lista.length
          ? 'Todavía no se puede publicar. Falta:'
          : mensajeDeError(err, 'No se pudo publicar el torneo.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    void (paso === 3 ? guardarBorradorEconomia() : guardar(false));
  };

  const volver = (
    <Link to="/mis-torneos" className="torneos-volver">
      ← Volver a mis torneos
    </Link>
  );

  if (cargando || (!opciones && !error)) {
    return (
      <div className="torneos-page">
        <p className="torneos-vacio">Cargando torneo...</p>
      </div>
    );
  }

  if (error || !opciones) {
    return (
      <div className="torneos-page">
        <div>
          {volver}
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const habilitado = editable && !guardando;

  return (
    <div className="torneos-page">
      <header>
        {volver}
        <div className="torneos-titulo-con-chip">
          <h1>{torneo ? torneo.nombre : 'Crear nueva competencia'}</h1>
          <Badge tone={TONO_ESTADO_TORNEO[estado]}>{ESTADO_TORNEO_UI[estado]}</Badge>
        </div>
        <p className="torneos-subtitulo">
          {torneo
            ? `${torneo.disciplina} · Eliminación directa`
            : 'Configurá la competencia en tres pasos.'}
        </p>
      </header>

      {!editable && torneo && (
        <div className="alerta alerta-info" role="status">
          El torneo ya no está en borrador: se muestra de solo lectura.{' '}
          {torneo.slug && (
            <Link to={`/torneos/${torneo.id}/publicado`}>Ver el enlace y el sello</Link>
          )}
        </div>
      )}

      <PasosAsistente
        actual={paso - 1}
        onIr={(i) => irAPaso((i + 1) as Paso)}
        pasos={[
          { titulo: 'Información y formato', subtitulo: 'Datos generales, sede y reglamento' },
          { titulo: 'Cupos', subtitulo: 'Equipos o jugadores y nómina' },
          {
            titulo: 'Esquema económico',
            subtitulo: torneo ? 'Reparto, gastos y premios' : 'Después de guardar el borrador',
            bloqueado: !torneo,
          },
        ]}
      />

      <Card>
        <form className="torneos-form" onSubmit={enviar} noValidate>
          <div className="torneos-tarjeta-titulo">
            <h2>{TITULOS[paso]}</h2>
            {editable && <span>Los campos con * hacen falta para publicar</span>}
          </div>

          {mensaje && (
            <div
              className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
              role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
            >
              {mensaje.texto}
              {faltantes.length > 0 && (
                <ul className="torneos-faltantes">
                  {faltantes.map((f) => (
                    <li key={f}>
                      {FALTANTES[f].texto}{' '}
                      {FALTANTES[f].paso !== paso && (
                        <button
                          type="button"
                          className="torneos-ir-paso"
                          onClick={() => irAPaso(FALTANTES[f].paso)}
                        >
                          Ir al paso {FALTANTES[f].paso}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {paso === 1 && (
            <PasoInformacion
              form={form}
              onCambio={cambiar}
              errores={errores}
              habilitado={habilitado}
              opciones={opciones}
              sugerenciasCanchas={sugerenciasCanchas}
            />
          )}
          {paso === 2 && (
            <PasoCupos
              form={form}
              onCambio={cambiar}
              errores={errores}
              habilitado={habilitado}
              cupoTope={cupoTope}
            />
          )}
          {paso === 3 && torneo && formEco && (
            <PasoEconomia
              torneoId={torneo.id}
              form={formEco}
              onCambio={cambiarEco}
              errores={erroresEco}
              habilitado={habilitado}
              cupo={torneo.cupoMaximo}
              quienes={participantes(torneo.tipoParticipante)}
              comisionMaxima={opciones.comisionMaxima}
              gastos={gastos}
              onGastos={setGastos}
            />
          )}

          {paso === 3 && editable && (
            <label className="torneos-terminos">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                disabled={guardando}
              />
              <span>
                <strong>Acepto los términos de custodia de fondos.</strong> Lo recaudado queda en
                custodia de la plataforma y el esquema económico se sella al publicar: después no se
                puede cambiar.
              </span>
            </label>
          )}

          <div className="torneos-pie">
            <span>
              Paso {paso} de 3{editable && ' · Los cambios se guardan como borrador'}
            </span>
            <div className="torneos-acciones">
              {paso > 1 && (
                <Button
                  variant="ghost"
                  disabled={guardando}
                  onClick={() => irAPaso((paso - 1) as Paso)}
                >
                  ← Volver al paso {paso - 1}
                </Button>
              )}
              {editable && (
                <Button type="submit" variant="secondary" loading={guardando}>
                  Guardar como borrador
                </Button>
              )}
              {paso === 1 && (
                <Button
                  disabled={guardando}
                  onClick={() => (editable ? void guardar(true) : irAPaso(2))}
                >
                  {editable ? 'Siguiente: Cupos →' : 'Ver cupos →'}
                </Button>
              )}
              {paso === 2 && (editable || torneo) && (
                <Button
                  disabled={guardando}
                  onClick={() => (editable ? void guardar(true) : irAPaso(3))}
                >
                  {editable ? 'Siguiente: Esquema económico →' : 'Ver esquema económico →'}
                </Button>
              )}
              {paso === 3 && editable && (
                <Button disabled={guardando || !aceptaTerminos} onClick={() => void publicar()}>
                  Publicar torneo e iniciar inscripción
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};
