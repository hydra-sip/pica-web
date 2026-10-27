import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BracketTorneo, torneoApi, TorneoInformacion } from '../../api/torneoApi';
import { ObjecionesTorneo } from '../../partidos/components/ObjecionesTorneo';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card } from '../../shared/ui';
import { Bracket } from '../components/Bracket';
import { ESTADO_TORNEO_UI, participantes, TONO_ESTADO_TORNEO } from '../formato';
import '../torneos.css';

const conResultados = (bracket: BracketTorneo): boolean =>
  bracket.rondas.some((r) =>
    r.partidos.some((p) => p.local?.puntaje != null || p.visitante?.puntaje != null)
  );

/**
 * Consola del torneo (wireframe "Consola Operativa del Torneo", PICA-217): el bracket y el botón para sortearlo con
 * la inscripción cerrada, o para volver a sortearlo mientras no haya resultados. Cerrar la inscripción (T206-3) va
 * acá también. Con el bracket sorteado, las objeciones del torneo (PICA-247).
 */
export const TorneoConsolaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [torneo, setTorneo] = useState<TorneoInformacion | null>(null);
  const [bracket, setBracket] = useState<BracketTorneo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [sorteando, setSorteando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([torneoApi.obtener(Number(id)), torneoApi.bracket(Number(id))])
      .then(([t, b]) => {
        if (!vigente) return;
        setTorneo(t);
        setBracket(b);
      })
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar el torneo.')));
    return () => {
      vigente = false;
    };
  }, [id]);

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
              {torneo.estado === 'INSCRIPCION_ABIERTA'
                ? 'La inscripción sigue abierta'
                : bracket.listaHash
                  ? 'Inscripción cerrada y sellada'
                  : 'Inscripción cerrada'}
            </strong>
            <p className="torneos-subtitulo">
              {torneo.estado === 'INSCRIPCION_ABIERTA'
                ? 'El bracket se sortea cuando se cierre la inscripción.'
                : 'Los cruces y los BYE salen de un sorteo con semilla: queda registrado y cualquiera lo puede recalcular.'}
            </p>
          </div>
          <div className="torneos-acciones">
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
        {mensaje && (
          <div
            className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
            role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
          >
            {mensaje.texto}
          </div>
        )}
      </Card>

      <Card>
        <div className="torneos-tarjeta-titulo">
          <h2>Estructura del bracket</h2>
          {torneo.slug && <Link to={`/torneos/${torneo.slug}`}>Ver la ficha pública</Link>}
        </div>
        {generado ? (
          <Bracket bracket={bracket} conEnlaces />
        ) : (
          <p className="torneos-vacio">Todavía no hay bracket.</p>
        )}
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
