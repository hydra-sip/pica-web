import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PartidoDetalle } from '../../api/partidoApi';
import { BracketTorneo, EstadoTorneo, torneoApi, TorneoInformacion } from '../../api/torneoApi';
import { useTorneoRealtime } from '../../realtime/useTorneoRealtime';
import { ObjecionesTorneo } from '../../partidos/components/ObjecionesTorneo';
import { sinFechaParaJugar } from '../../partidos/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card } from '../../shared/ui';
import { Bracket } from '../components/Bracket';
import { CheckinTorneo } from '../components/CheckinTorneo';
import { InscripcionesDelTorneo } from '../components/InscripcionesDelTorneo';
import { ProgramacionPartido } from '../components/ProgramacionPartido';
import { RifaDelTorneo } from '../components/RifaDelTorneo';
import { abreviarHash, ESTADO_TORNEO_UI, participantes, TONO_ESTADO_TORNEO } from '../formato';
import { formatFecha } from '../utils/formatters';
import '../torneos.css';

const conResultados = (bracket: BracketTorneo): boolean =>
  bracket.rondas.some((r) =>
    r.partidos.some((p) => p.local?.puntaje != null || p.visitante?.puntaje != null)
  );

/**
 * Consola del torneo (wireframe "Consola Operativa del Torneo", PICA-217): el bracket y el botón para sortearlo con
 * la inscripción cerrada, o para volver a sortearlo mientras no haya resultados. Con la inscripción abierta, el
 * organizador la cierra desde acá (HU-206); cerrada, se ve cuándo y el sello de la lista. Abajo, las inscripciones.
 * Con el bracket sorteado, las objeciones del torneo (PICA-247). La ventana de check-in del torneo y la fecha de cada
 * partido, en el bracket (HU-308). Si el torneo tiene rifa, lo que lleva vendido y su pozo (HU-406).
 */
export const TorneoConsolaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [torneo, setTorneo] = useState<TorneoInformacion | null>(null);
  const [bracket, setBracket] = useState<BracketTorneo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [sorteando, setSorteando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  /** Cambia para volver a pedir las inscripciones: el cierre cancela las pendientes. */
  const [recargaInscripciones, setRecargaInscripciones] = useState(0);

  const recargarConsola = useCallback(() => {
    if (!id) return;
    Promise.all([torneoApi.obtener(Number(id)), torneoApi.bracket(Number(id))])
      .then(([t, b]) => {
        setTorneo(t);
        setBracket(b);
      })
      .catch((err) => setError(mensajeDeError(err, 'No se pudo cargar el torneo.')));
  }, [id]);

  useEffect(() => {
    recargarConsola();
  }, [recargarConsola]);

  useTorneoRealtime(id ? Number(id) : null, {
    onBracketChange: (nuevoBracket) => {
      setBracket(nuevoBracket);
    },
    onEstadoChange: (nuevoEstado) => {
      setTorneo((prev) => (prev ? { ...prev, estado: nuevoEstado as EstadoTorneo } : prev));
    },
    onActualizar: (data) => {
      if (data.bracket) {
        setBracket(data.bracket);
      }
      if (data.estado) {
        setTorneo((prev) => (prev ? { ...prev, estado: data.estado as EstadoTorneo } : prev));
      }
      if (!data.bracket && !data.estado) {
        recargarConsola();
      }
    },
    onReconnect: () => {
      recargarConsola();
    },
  });

  const volver = (
    <Link to="/mis-torneos" className="torneos-volver">
      ← Volver a mis torneos
    </Link>
  );

  if (error) {
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

  if (!torneo || !bracket) {
    return (
      <div className="torneos-page">
        <p className="torneos-vacio">Cargando torneo...</p>
      </div>
    );
  }

  if (torneo.estado === 'BORRADOR') {
    return <Navigate to={`/torneos/${torneo.id}/editar`} replace />;
  }

  const generado = bracket.rondas.length > 0;
  const puedeGenerar = torneo.estado === 'INSCRIPCION_CERRADA' && !generado;
  const puedeRegenerar =
    generado &&
    (torneo.estado === 'INSCRIPCION_CERRADA' || torneo.estado === 'EN_CURSO') &&
    !conResultados(bracket);

  const programable = torneo.estado === 'INSCRIPCION_CERRADA' || torneo.estado === 'EN_CURSO';
  const enCurso = torneo.estado === 'EN_CURSO';
  const sinFecha = enCurso
    ? bracket.rondas.flatMap((r) => r.partidos).filter(sinFechaParaJugar).length
    : 0;

  const programado = (partido: PartidoDetalle) =>
    setBracket({
      ...bracket,
      rondas: bracket.rondas.map((r) => ({
        ...r,
        partidos: r.partidos.map((p) =>
          p.id === partido.id ? { ...p, fechaProgramada: partido.fechaProgramada } : p
        ),
      })),
    });

  const sortear = async () => {
    setSorteando(true);
    setMensaje(null);
    try {
      const nuevo = generado
        ? await torneoApi.regenerarBracket(torneo.id)
        : await torneoApi.generarBracket(torneo.id);
      setBracket(nuevo);
      // generarlo pone el torneo EN_CURSO
      setTorneo(await torneoApi.obtener(torneo.id));
      setMensaje({
        tipo: 'exito',
        texto: generado ? 'Bracket sorteado de nuevo.' : 'Bracket generado.',
      });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo sortear el bracket.') });
    } finally {
      setSorteando(false);
      setConfirmando(false);
    }
  };

  const cerrarInscripcion = async () => {
    setCerrando(true);
    setMensaje(null);
    try {
      setTorneo(await torneoApi.cerrarInscripcion(torneo.id));
      setMensaje({ tipo: 'exito', texto: 'Inscripción cerrada: la lista quedó fija.' });
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: mensajeDeError(err, 'No se pudo cerrar la inscripción.'),
      });
      // pudo haberse cerrado sola mientras tanto, por el cupo o por la fecha
      torneoApi
        .obtener(torneo.id)
        .then(setTorneo)
        .catch(() => undefined);
    } finally {
      setCerrando(false);
      setConfirmandoCierre(false);
      setRecargaInscripciones((n) => n + 1);
    }
  };

  const abierta = torneo.estado === 'INSCRIPCION_ABIERTA';

  return (
    <div className="torneos-page">
      <header>
        {volver}
        <div className="torneos-titulo-con-chip">
          <h1>{torneo.nombre}</h1>
          <Badge tone={TONO_ESTADO_TORNEO[torneo.estado]}>{ESTADO_TORNEO_UI[torneo.estado]}</Badge>
        </div>
        <p className="torneos-subtitulo">
          Consola del torneo · {torneo.disciplina} · Hasta {torneo.cupoMaximo}{' '}
          {participantes(torneo.tipoParticipante)}
        </p>
      </header>

      <Card>
        <div className="torneos-consola-aviso">
          <div>
            <strong>
              {abierta
                ? 'La inscripción sigue abierta'
                : torneo.inscripcionCerradaEn
                  ? `Inscripción cerrada el ${formatFecha(torneo.inscripcionCerradaEn)}`
                  : 'Inscripción cerrada'}
            </strong>
            <p className="torneos-subtitulo">
              {abierta
                ? 'Se cierra sola al completarse el cupo o al llegar la fecha de cierre, y el bracket se sortea después.'
                : 'Los cruces y los BYE salen de un sorteo con semilla: queda registrado y cualquiera lo puede recalcular.'}
            </p>
            {torneo.listaHash && (
              <p className="torneos-subtitulo">
                Lista sellada:{' '}
                <code title={torneo.listaHash}>{abreviarHash(torneo.listaHash)}</code>
              </p>
            )}
          </div>
          <div className="torneos-acciones">
            {abierta && !confirmandoCierre && (
              <Button onClick={() => setConfirmandoCierre(true)}>Cerrar inscripción</Button>
            )}
            {abierta && confirmandoCierre && (
              <>
                <Button
                  variant="ghost"
                  disabled={cerrando}
                  onClick={() => setConfirmandoCierre(false)}
                >
                  Cancelar
                </Button>
                <Button loading={cerrando} onClick={() => void cerrarInscripcion()}>
                  Sí, cerrar la inscripción
                </Button>
              </>
            )}
            {puedeGenerar && (
              <Button loading={sorteando} onClick={() => void sortear()}>
                Generar bracket aleatorio
              </Button>
            )}
            {puedeRegenerar && !confirmando && (
              <Button variant="secondary" disabled={sorteando} onClick={() => setConfirmando(true)}>
                Regenerar bracket
              </Button>
            )}
            {puedeRegenerar && confirmando && (
              <>
                <Button variant="ghost" disabled={sorteando} onClick={() => setConfirmando(false)}>
                  Cancelar
                </Button>
                <Button loading={sorteando} onClick={() => void sortear()}>
                  Sí, sortear de nuevo
                </Button>
              </>
            )}
          </div>
        </div>
        {confirmando && (
          <p className="torneos-subtitulo" role="status">
            El sorteo anterior queda en la auditoría junto con el nuevo.
          </p>
        )}
        {confirmandoCierre && (
          <p className="torneos-subtitulo" role="status">
            Es definitivo: la lista queda fija y se cancelan los borradores y las pendientes de
            pago.
          </p>
        )}
        {mensaje && (
          <div
            className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
            role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
          >
            {mensaje.texto}
          </div>
        )}
      </Card>

      <RifaDelTorneo torneoId={torneo.id} />

      <InscripcionesDelTorneo torneoId={torneo.id} recarga={recargaInscripciones} />

      <Card>
        <div className="torneos-tarjeta-titulo">
          <h2>Estructura del bracket</h2>
          {torneo.slug && <Link to={`/torneos/${torneo.slug}`}>Ver la ficha pública</Link>}
        </div>
        {sinFecha > 0 && (
          <div className="alerta alerta-aviso" role="status">
            {sinFecha === 1
              ? 'Hay 1 partido sin fecha: ponéle una para que se juegue.'
              : `Hay ${sinFecha} partidos sin fecha: ponéles una para que se jueguen.`}
          </div>
        )}
        {generado ? (
          <Bracket
            bracket={bracket}
            conEnlaces
            pie={(p) => (
              <ProgramacionPartido
                partido={p}
                editable={programable}
                resaltarSinFecha={enCurso}
                onProgramado={programado}
              />
            )}
          />
        ) : (
          <p className="torneos-vacio">Todavía no hay bracket.</p>
        )}
      </Card>

      <Card>
        <div className="torneos-tarjeta-titulo">
          <h2>Check-in</h2>
        </div>
        <CheckinTorneo torneo={torneo} onGuardado={setTorneo} />
      </Card>

      {generado && (
        <Card>
          <div className="torneos-tarjeta-titulo">
            <h2>Objeciones</h2>
          </div>
          <ObjecionesTorneo torneoId={torneo.id} />
        </Card>
      )}
    </div>
  );
};
