import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { OpcionesTorneo, torneoApi, TorneoInformacion } from '../../api/torneoApi';
import { PasosAsistente } from '../../shared/components/PasosAsistente';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card } from '../../shared/ui';
import { PasoCupos } from '../components/PasoCupos';
import { PasoInformacion } from '../components/PasoInformacion';
import { ESTADO_TORNEO_UI, TONO_ESTADO_TORNEO } from '../formato';
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

type Paso = 1 | 2;

// RANGO_INVALIDO dice "rango de números" para las rifas; acá son cupos, fechas y nómina.
const MENSAJES_DE_CAMPO = { RANGO_INVALIDO: 'Está fuera de lo permitido.' };

/**
 * Asistente "Crear Nueva Competencia" (PICA-202), pasos 1 y 2. Los dos pasos editan el mismo formulario
 * y se guardan juntos, porque PUT /torneos/{id}/informacion reemplaza todo: el alta es POST /torneos y
 * después cada guardado es un PUT. "Continuar edición" abre en el paso que quedó pendiente. El paso 3
 * (esquema económico) llega con la T601-3. Fuera de BORRADOR todo queda de solo lectura.
 */
export const TorneoFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [torneo, setTorneo] = useState<TorneoInformacion | null>(null);
  const [opciones, setOpciones] = useState<OpcionesTorneo | null>(null);
  const [form, setForm] = useState<FormTorneo>(() => desdeTorneo(null));
  const [errores, setErrores] = useState<ErroresTorneo>({});
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [sugerenciasCanchas, setSugerenciasCanchas] = useState<string[]>([]);
  // El alta navega a la URL de edición: ese torneo ya está cargado y no hace falta pedirlo de nuevo.
  const recienCreado = useRef<number | null>(null);

  const paso: Paso = searchParams.get('paso') === '2' ? 2 : 1;
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
    torneoApi
      .obtener(Number(id))
      .then((t) => {
        if (!vigente) return;
        setTorneo(t);
        setForm(desdeTorneo(t));
        // Sin ?paso, "Continuar edición" abre donde quedó (el 3 todavía no está: va al 2).
        if (!searchParams.get('paso') && (t.pasoPendiente ?? 1) >= 2) {
          setSearchParams({ paso: '2' }, { replace: true });
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

  const irAPaso = (destino: Paso) => {
    setSearchParams(destino === 2 ? { paso: '2' } : {}, { replace: true });
    setMensaje(null);
  };

  /** `seguir`: guardó con "Siguiente" y pasa al paso 2 (solo desde el 1). */
  const guardar = async (seguir: boolean) => {
    setMensaje(null);
    const encontrados = seguir
      ? validarPaso(paso, form, cupoTope)
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
      const destino: Paso = seguir ? 2 : paso;
      if (!torneo) {
        // Recién creado: pasa a la URL de edición, que es la que se puede recargar o compartir.
        recienCreado.current = guardado.id;
        navigate(`/torneos/${guardado.id}/editar${destino === 2 ? '?paso=2' : ''}`, {
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

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    void guardar(false);
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

      {!editable && (
        <div className="alerta alerta-info" role="status">
          El torneo ya no está en borrador: se muestra de solo lectura.
        </div>
      )}

      <PasosAsistente
        actual={paso - 1}
        onIr={(i) => irAPaso(i === 1 ? 2 : 1)}
        pasos={[
          { titulo: 'Información y formato', subtitulo: 'Datos generales, sede y reglamento' },
          { titulo: 'Cupos', subtitulo: 'Equipos o jugadores y nómina' },
          { titulo: 'Esquema económico', subtitulo: 'Próximamente', bloqueado: true },
        ]}
      />

      <Card>
        <form className="torneos-form" onSubmit={enviar} noValidate>
          <div className="torneos-tarjeta-titulo">
            <h2>
              {paso === 1
                ? 'Paso 1: Configuración general del torneo'
                : 'Paso 2: Configuración de cupos'}
            </h2>
            {editable && <span>Los campos con * hacen falta para publicar</span>}
          </div>

          {mensaje && (
            <div
              className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
              role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
            >
              {mensaje.texto}
            </div>
          )}

          {paso === 1 ? (
            <PasoInformacion
              form={form}
              onCambio={cambiar}
              errores={errores}
              habilitado={habilitado}
              opciones={opciones}
              sugerenciasCanchas={sugerenciasCanchas}
            />
          ) : (
            <PasoCupos
              form={form}
              onCambio={cambiar}
              errores={errores}
              habilitado={habilitado}
              cupoTope={cupoTope}
            />
          )}

          <div className="torneos-pie">
            <span>
              Paso {paso} de 3{editable && ' · Los cambios se guardan como borrador'}
            </span>
            <div className="torneos-acciones">
              {paso === 2 && (
                <Button variant="ghost" disabled={guardando} onClick={() => irAPaso(1)}>
                  ← Volver al paso 1
                </Button>
              )}
              {editable && (
                <Button type="submit" variant="secondary" loading={guardando}>
                  Guardar como borrador
                </Button>
              )}
              {paso === 1 ? (
                <Button
                  disabled={guardando}
                  onClick={() => (editable ? void guardar(true) : irAPaso(2))}
                >
                  {editable ? 'Siguiente: Cupos →' : 'Ver cupos →'}
                </Button>
              ) : (
                editable && (
                  <Button disabled title="Llega con el paso 3">
                    Siguiente: Esquema económico →
                  </Button>
                )
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};
