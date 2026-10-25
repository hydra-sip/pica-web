import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InscripcionDetalle, inscripcionApi, ResumenPago } from '../../api/inscripcionApi';
import { fecha, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Card } from '../../shared/ui';
import '../inscripciones.css';

/** Paso 2: resumen de pago de una inscripción pendiente de pago y pantalla final de confirmada. */
export const InscripcionPagoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [inscripcion, setInscripcion] = useState<InscripcionDetalle | null>(null);
  const [resumen, setResumen] = useState<ResumenPago | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Un fallo al pagar no tira la página: la inscripción sigue pendiente y se puede reintentar.
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const detalle = await inscripcionApi.obtener(Number(id));
        const pago =
          detalle.estado === 'PENDIENTE_PAGO' ? await inscripcionApi.resumenPago(detalle.id) : null;
        if (vigente) {
          setInscripcion(detalle);
          setResumen(pago);
        }
      } catch (err) {
        if (vigente) setError(mensajeDeError(err, 'No se pudo cargar la inscripción.'));
      }
    })();
    return () => {
      vigente = false;
    };
  }, [id]);

  const pagar = async () => {
    if (!inscripcion) return;
    try {
      setInscripcion(await inscripcionApi.pagar(inscripcion.id));
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo confirmar el pago.'));
    }
  };

  if (error) {
    return (
      <div className="alerta alerta-peligro" role="alert">
        {error}
      </div>
    );
  }
  if (!inscripcion) return <p>Cargando inscripción...</p>;

  if (inscripcion.estado === 'CONFIRMADA') {
    return (
      <div className="inscripcion-page">
        <h1>¡Inscripción confirmada!</h1>
        <Card>
          <p>
            {inscripcion.equipo?.nombre} • {resumen?.torneo.nombre}
          </p>
          <Link to="/" className="btn btn-primary btn-block">
            Volver al inicio
          </Link>
        </Card>
      </div>
    );
  }

  if (!resumen) return <p>Cargando inscripción...</p>;

  const nombreParticipante = resumen.equipo
    ? `Equipo: ${resumen.equipo.nombre}`
    : resumen.participante && `${resumen.participante.nombres} ${resumen.participante.apellidos}`;

  return (
    <div className="inscripcion-page">
      <header className="inscripcion-encabezado">
        <h1>Confirmar y pagar</h1>
        <span className="inscripcion-paso">Paso 2/2</span>
      </header>

      <Card className="resumen-pago">
        <h2>Resumen de inscripción</h2>
        <p className="resumen-pago-detalle">
          {resumen.torneo.nombre} • {nombreParticipante}
        </p>
        <dl className="resumen-pago-lineas">
          <div>
            <dt>Cuota de inscripción</dt>
            <dd>{pesos(resumen.monto)}</dd>
          </div>
          <div className="resumen-pago-total">
            <dt>Total a pagar</dt>
            <dd>{pesos(resumen.monto)}</dd>
          </div>
        </dl>
        <p className="resumen-pago-cupo">
          Quedan {resumen.cupoDisponible} de {resumen.cupoMaximo} lugares
        </p>
        <p className="resumen-pago-cierre">
          Cierre de la inscripción: {fecha(resumen.cierreInscripcionEn)}
        </p>
      </Card>

      <section className="custodia">
        <span className="custodia-icono" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
          </svg>
        </span>
        <div>
          <h2>Garantía de fondos en custodia</h2>
          <p>
            El dinero queda retenido de forma segura en la plataforma hasta la finalización del
            torneo o reintegro si se cancela.
          </p>
        </div>
      </section>

      {aviso && (
        <div className="alerta alerta-peligro" role="alert">
          {aviso}
        </div>
      )}

      <Button block onClick={pagar}>
        Confirmar pago de {pesos(resumen.monto)}
      </Button>
    </div>
  );
};
