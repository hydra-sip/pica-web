import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ResumenEconomico, torneoApi, TorneoInformacion } from '../../api/torneoApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card, Input } from '../../shared/ui';
import {
  abreviarHash,
  ESTADO_TORNEO_UI,
  participantes,
  pesosArs,
  TONO_ESTADO_TORNEO,
} from '../formato';
import '../torneos.css';

/**
 * "Confirmación de publicación" (wireframe "Torneo Publicado", PICA-205): lo que quedó fijo al publicar, el sello
 * SHA-256 del esquema económico y el enlace público para compartir. También es lo que abre "Ver torneo" en Mis
 * torneos para uno publicado. Los árbitros y la consola del wireframe llegan con sus historias.
 */
export const TorneoPublicadoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [torneo, setTorneo] = useState<TorneoInformacion | null>(null);
  const [resumen, setResumen] = useState<ResumenEconomico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([torneoApi.obtener(Number(id)), torneoApi.resumenEconomico(Number(id))])
      .then(([t, r]) => {
        if (!vigente) return;
        setTorneo(t);
        setResumen(r);
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

  if (!torneo || !resumen) {
    return (
      <div className="torneos-page">
        <p className="torneos-vacio">Cargando torneo...</p>
      </div>
    );
  }

  // Un borrador todavía no tiene enlace ni sello: vuelve al paso 3, que es donde se publica.
  if (torneo.estado === 'BORRADOR' || !torneo.slug) {
    return <Navigate to={`/torneos/${torneo.id}/editar?paso=3`} replace />;
  }

  const enlace = `${window.location.origin}/torneos/${torneo.slug}`;
  const quienes = participantes(torneo.tipoParticipante);

  const copiar = () => {
    navigator.clipboard
      .writeText(enlace)
      .then(() => setCopiado('Enlace copiado.'))
      .catch(() => setCopiado('No se pudo copiar: seleccioná el enlace y copialo a mano.'));
  };

  return (
    <div className="torneos-page">
      <header>
        {volver}
        <div className="torneos-titulo-con-chip">
          <h1>{torneo.nombre}</h1>
          <Badge tone={TONO_ESTADO_TORNEO[torneo.estado]}>{ESTADO_TORNEO_UI[torneo.estado]}</Badge>
        </div>
        <p className="torneos-subtitulo">Confirmación de publicación</p>
      </header>

      <Card>
        <div className="torneo-publicado">
          <span className="torneo-publicado-check" aria-hidden="true">
            ✓
          </span>
          <div>
            <h2>¡Torneo publicado!</h2>
            <p className="torneos-subtitulo">
              {torneo.nombre} ya acepta inscripciones
              {torneo.publicadoEn && ` desde el ${fechaHora(torneo.publicadoEn)}`}.
            </p>
          </div>

          <div className="torneo-publicado-datos">
            <div className="torneos-dato">
              <span>Cierre de la inscripción</span>
              <strong>{fechaHora(torneo.cierreInscripcionEn)}</strong>
            </div>
            <div className="torneos-dato">
              <span>Cupo habilitado</span>
              <strong>
                {torneo.cupoMaximo} {quienes}
              </strong>
              <small>Mínimo {torneo.cupoMinimo} para iniciar</small>
            </div>
            <div className="torneos-dato">
              <span>Inscripción por participante</span>
              <strong>{pesosArs(torneo.economia.valorInscripcion)}</strong>
            </div>
            <div className="torneos-dato">
              <span>Pozo neto estimado</span>
              <strong>{pesosArs(resumen.pozoNeto)}</strong>
              <small>
                Con el cupo completo · comisión de la plataforma {torneo.economia.pctComision} %
              </small>
            </div>
          </div>

          {torneo.esquemaHash && (
            <div className="torneo-publicado-sello">
              <div>
                <strong>Esquema económico sellado (SHA-256)</strong>
                <br />
                <code title={torneo.esquemaHash}>{abreviarHash(torneo.esquemaHash)}</code>
              </div>
              <Badge tone="exito">Sellado</Badge>
            </div>
          )}

          <div>
            <p className="torneo-publicado-etiqueta">Enlace público de inscripción</p>
            <div className="torneo-publicado-enlace">
              <Input
                aria-label="Enlace público del torneo"
                value={enlace}
                readOnly
                onFocus={(e) => e.target.select()}
              />
              <Button variant="secondary" onClick={copiar}>
                Copiar enlace
              </Button>
            </div>
            {copiado && (
              <p className="torneo-publicado-etiqueta" role="status">
                {copiado}
              </p>
            )}
          </div>

          <p className="torneos-celda-secundaria">
            Los participantes pagan la inscripción desde la plataforma y lo recaudado queda en
            custodia hasta que termina el torneo.
          </p>

          <div className="torneo-publicado-acciones">
            <Link to="/mis-torneos" className="btn btn-secondary">
              Volver a Mis torneos
            </Link>
            <Link to={`/torneos/${torneo.slug}`} className="btn btn-primary">
              Ver ficha pública →
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
