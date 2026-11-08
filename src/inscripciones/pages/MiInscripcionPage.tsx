import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { InscripcionDetalle, inscripcionApi } from '../../api/inscripcionApi';
import { torneoApi } from '../../api/torneoApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { TorneoDetalle } from '../../torneos/types/torneo';
import { Card } from '../../shared/ui';
import { AvisoInscripcionTerminada } from '../components/AvisoInscripcionTerminada';
import { ComprobanteInscripcion } from '../../billetera/components/ComprobanteInscripcion';
import { HistorialReemplazos } from '../components/HistorialReemplazos';
import { VolverAlTorneo } from '../components/VolverAlTorneo';
import { NominaConfirmada } from '../components/NominaConfirmada';
import { inscripcionAbierta } from '../inscripcionAbierta';
import { MENSAJES_MI_INSCRIPCION, MENSAJES_REEMPLAZO } from '../mensajesInscripcion';
import '../inscripciones.css';

/** El capitán o el participante individual: los demás roles la ven en solo lectura. */
const esDelQueMira = (i: InscripcionDetalle): boolean =>
  i.rol === 'CAPITAN' || i.rol === 'INDIVIDUAL';

/**
 * `/inscripciones/:id`: la inscripción confirmada del capitán, con el equipo, el torneo y la nómina.
 * La individual muestra el participante y no tiene nómina. Un borrador lleva al paso 1, una pendiente
 * de pago al paso 2, y una cancelada o reintegrada muestra el aviso de que ya no participa.
 *
 * Reemplazar se ofrece solo mientras el torneo tenga la inscripción abierta y quede cupo: con el cupo
 * completo la lista también queda fija. Si el torneo no carga, no se ofrece.
 *
 * Un jugador de la nómina o el organizador la ven en solo lectura (HU-209): sin reemplazar ni el aviso de la
 * lista fija, y sin que un borrador o una pendiente los lleven a editarla o pagarla.
 */
export const MiInscripcionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [inscripcion, setInscripcion] = useState<InscripcionDetalle | null>(null);
  const [torneo, setTorneo] = useState<TorneoDetalle | null>(null);
  /** El back rechazó un reemplazo porque la inscripción del torneo cerró mientras tanto. */
  const [cerrada, setCerrada] = useState(false);
  /** Cambia para volver a cargar la inscripción. */
  const [carga, setCarga] = useState(0);
  /** Por qué se volvió a cargar: sigue a la vista después de la recarga, sea cual sea el estado nuevo. */
  const [motivoRecarga, setMotivoRecarga] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Reemplazos hechos desde que se abrió la pantalla: cada uno vuelve a pedir el historial. */
  const [reemplazos, setReemplazos] = useState(0);

  // El motivo es de esta inscripción: con otra no aplica.
  useEffect(() => setMotivoRecarga(null), [id]);

  useEffect(() => {
    let vigente = true;
    setInscripcion(null);
    setTorneo(null);
    setCerrada(false);
    setError(null);
    (async () => {
      try {
        const detalle = await inscripcionApi.obtener(Number(id));
        if (vigente) setInscripcion(detalle);
        if (!esDelQueMira(detalle)) return;
        if (detalle.estado !== 'CONFIRMADA' || !detalle.equipo || !detalle.torneo.slug) return;
        const delTorneo = await torneoApi.getTorneoBySlug(detalle.torneo.slug).catch(() => null);
        if (vigente) setTorneo(delTorneo);
      } catch (err) {
        if (vigente) {
          setError(
            mensajeDeError(err, 'No se pudo cargar la inscripción.', MENSAJES_MI_INSCRIPCION)
          );
        }
      }
    })();
    return () => {
      vigente = false;
    };
  }, [id, carga]);

  if (error) {
    return (
      <div className="inscripcion-page">
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      </div>
    );
  }
  if (!inscripcion) {
    return (
      <div className="inscripcion-page">
        <p className="inscripcion-cargando" role="status">
          Cargando inscripción...
        </p>
      </div>
    );
  }

  const propia = esDelQueMira(inscripcion);
  if (propia && inscripcion.estado === 'BORRADOR') {
    return <Navigate to={`/inscripciones/${inscripcion.id}/nomina`} replace />;
  }
  if (propia && inscripcion.estado === 'PENDIENTE_PAGO') {
    return <Navigate to={`/inscripciones/${inscripcion.id}/pago`} replace />;
  }
  if (inscripcion.estado === 'CANCELADA' || inscripcion.estado === 'REINTEGRADA') {
    return (
      <AvisoInscripcionTerminada
        estado={inscripcion.estado}
        motivo={motivoRecarga}
        slug={inscripcion.torneo.slug}
      />
    );
  }

  const puedeReemplazar =
    propia &&
    torneo !== null &&
    !cerrada &&
    inscripcionAbierta(torneo) &&
    torneo.cupoDisponible > 0;
  const listaFija = propia && (cerrada || (torneo !== null && !puedeReemplazar));

  return (
    <div className="inscripcion-page">
      <VolverAlTorneo slug={inscripcion.torneo.slug} />
      <header className="inscripcion-encabezado">
        <h1>{inscripcion.rol === 'ORGANIZADOR' ? 'Inscripción' : 'Mi inscripción'}</h1>
      </header>
      {motivoRecarga && (
        <div className="alerta alerta-peligro" role="alert">
          {motivoRecarga}
        </div>
      )}
      <Card className="inscripcion-torneo">
        <strong>{inscripcion.torneo.nombre}</strong>
        <span>
          {inscripcion.equipo
            ? `Equipo: ${inscripcion.equipo.nombre}`
            : propia
              ? `Participante: ${user?.name}`
              : 'Inscripción individual'}
        </span>
      </Card>
      {inscripcion.equipo && (
        <>
          {listaFija && (
            <div className="alerta alerta-aviso" role="status">
              {MENSAJES_REEMPLAZO.INSCRIPCION_NO_ABIERTA}
            </div>
          )}
          <NominaConfirmada
            inscripcion={inscripcion}
            capitanId={inscripcion.equipo.capitanId}
            puedeReemplazar={puedeReemplazar}
            onReemplazada={(actualizada) => {
              setInscripcion(actualizada);
              setReemplazos((n) => n + 1);
            }}
            onCerrada={() => setCerrada(true)}
            onNoEditable={(mensaje) => {
              setMotivoRecarga(mensaje);
              setCarga((n) => n + 1);
            }}
          />
          <HistorialReemplazos inscripcionId={inscripcion.id} recarga={reemplazos} />
        </>
      )}
      {/* HU-603: quien pagó ve su comprobante */}
      {propia && inscripcion.estado === 'CONFIRMADA' && (
        <ComprobanteInscripcion inscripcionId={inscripcion.id} />
      )}
    </div>
  );
};
