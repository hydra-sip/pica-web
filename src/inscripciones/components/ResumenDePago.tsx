import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InscripcionDetalle, inscripcionApi, ResumenPago } from '../../api/inscripcionApi';
import { fecha, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Card, Modal } from '../../shared/ui';
import { MENSAJES_INSCRIPCION } from '../mensajesInscripcion';

interface ResumenDePagoProps {
  resumen: ResumenPago;
  /** Se llama con la inscripción ya confirmada cuando el pago salió bien. */
  onPagada: (inscripcion: InscripcionDetalle) => void;
}

/** Paso 2: lo que se va a pagar, la garantía de custodia, confirmar el pago y volver a la nómina. */
export const ResumenDePago: React.FC<ResumenDePagoProps> = ({ resumen, onPagada }) => {
  const navigate = useNavigate();
  // Un fallo al pagar no tira la página: la inscripción sigue pendiente y se puede reintentar.
  const [aviso, setAviso] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  // El estado se actualiza después del primer toque; la referencia corta un segundo toque en el acto.
  const cobroEnCurso = useRef(false);

  const [modificando, setModificando] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [errorReabrir, setErrorReabrir] = useState<string | null>(null);

  const pagar = async () => {
    if (cobroEnCurso.current) return;
    cobroEnCurso.current = true;
    setPagando(true);
    setAviso(null);
    try {
      onPagada(await inscripcionApi.pagar(resumen.inscripcionId));
    } catch (err) {
      setAviso(mensajeDeError(err, 'No se pudo confirmar el pago.', MENSAJES_INSCRIPCION));
      cobroEnCurso.current = false;
      setPagando(false);
    }
  };

  const reabrir = async () => {
    setReabriendo(true);
    setErrorReabrir(null);
    try {
      await inscripcionApi.reabrir(resumen.inscripcionId);
      navigate(`/inscripciones/${resumen.inscripcionId}/nomina`);
    } catch (err) {
      setErrorReabrir(mensajeDeError(err, 'No se pudo volver a la nómina.'));
      setReabriendo(false);
    }
  };

  const quien = resumen.equipo
    ? `Equipo: ${resumen.equipo.nombre}`
    : resumen.participante &&
      `Participante: ${resumen.participante.nombres} ${resumen.participante.apellidos}`;

  return (
    <div className="inscripcion-page">
      <header className="inscripcion-encabezado">
        <h1>Confirmar y pagar</h1>
        <span className="inscripcion-paso">Paso 2/2</span>
      </header>

      <Card className="resumen-pago">
        <h2>Resumen de inscripción</h2>
        <p className="resumen-pago-detalle">
          {resumen.torneo.nombre} • {quien}
        </p>
        <dl className="resumen-pago-lineas">
          <div>
            <dt>Cuota de inscripción</dt>
            <dd>{pesos(resumen.monto)}</dd>
          </div>
          {resumen.gastosAdministrativos > 0 && (
            <div>
              <dt>Gastos administrativos</dt>
              <dd>{pesos(resumen.gastosAdministrativos)}</dd>
            </div>
          )}
          <div className="resumen-pago-total">
            <dt>Total a pagar</dt>
            <dd>{pesos(resumen.total)}</dd>
          </div>
        </dl>
        <p className="resumen-pago-extra">
          Quedan {resumen.cupoDisponible} de {resumen.cupoMaximo} lugares
        </p>
        <p className="resumen-pago-extra">
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

      <div className="inscripcion-acciones">
        <Button block onClick={pagar} loading={pagando}>
          {pagando ? 'Confirmando el pago...' : `Confirmar pago de ${pesos(resumen.total)}`}
        </Button>

        {/* En una inscripción individual no hay nómina que modificar */}
        {resumen.equipo && (
          <Button
            variant="secondary"
            block
            disabled={pagando}
            onClick={() => {
              setErrorReabrir(null);
              setModificando(true);
            }}
          >
            Modificar nómina
          </Button>
        )}
      </div>

      <Modal
        isOpen={modificando}
        title="Modificar nómina"
        size="sm"
        closeDisabled={reabriendo}
        onClose={() => setModificando(false)}
        footer={
          <>
            <Button variant="secondary" disabled={reabriendo} onClick={() => setModificando(false)}>
              Volver
            </Button>
            <Button loading={reabriendo} onClick={reabrir}>
              Sí, modificar la nómina
            </Button>
          </>
        }
      >
        <p>
          Para cambiar la nómina la inscripción vuelve a borrador y vas a tener que aceptar el
          reglamento otra vez antes de pagar. El equipo se mantiene.
        </p>
        {errorReabrir && (
          <div className="alerta alerta-peligro" role="alert">
            {errorReabrir}
          </div>
        )}
      </Modal>
    </div>
  );
};
