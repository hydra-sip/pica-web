import React, { useEffect, useState } from 'react';
import { custodiaApi } from '../../api/custodiaApi';
import { inscripcionApi, InscripcionResumen, RechazoReprogramacion } from '../../api/inscripcionApi';
import { ReprogramacionDetalle } from '../../api/torneoApi';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Modal } from '../../shared/ui';

interface AvisoNuevaFechaProps {
  inscripcion: InscripcionResumen;
  reprogramacion: ReprogramacionDetalle;
  /** Después de bajarse: la pantalla muestra la inscripción reintegrada. */
  onRechazada: (rechazo: RechazoReprogramacion) => void;
}

/**
 * CR-01-6 (PICA-395): el torneo cambió de fecha y la inscripción sigue confirmada. Muestra la fecha nueva, el motivo y
 * hasta cuándo se puede bajar. El participante de la individual o el capitán tiene el botón «La nueva fecha no me
 * sirve», con un diálogo que dice cuánto se le devuelve y que pierde el lugar; el resto del equipo ve el aviso, sin el
 * botón. Fuera del plazo, con la inscripción ya reintegrada o hecha después de la reprogramación (con la fecha nueva
 * ya publicada), no muestra nada.
 */
export const AvisoNuevaFecha: React.FC<AvisoNuevaFechaProps> = ({
  inscripcion,
  reprogramacion,
  onRechazada,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [devuelve, setDevuelve] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    custodiaApi
      .comprobanteDeInscripcion(inscripcion.id)
      .then((c) => setDevuelve(c.monto))
      .catch(() => setDevuelve(null));
  }, [abierto, inscripcion.id]);

  // quien se inscribió con la fecha nueva ya publicada la aceptó al anotarse: no tiene nada que decidir
  const posterior = new Date(inscripcion.creadoEn) >= new Date(reprogramacion.creadaEn);
  if (inscripcion.estado !== 'CONFIRMADA' || !reprogramacion.plazoAbierto || posterior) return null;

  const puedeBajarse = inscripcion.rol === 'INDIVIDUAL' || inscripcion.rol === 'CAPITAN';
  const deEquipo = inscripcion.rol === 'CAPITAN';

  const cerrar = () => {
    setAbierto(false);
    setError(null);
  };

  const bajarse = async () => {
    setEnviando(true);
    setError(null);
    try {
      const rechazo = await inscripcionApi.rechazarReprogramacion(inscripcion.id);
      setAbierto(false);
      onRechazada(rechazo);
    } catch (err) {
      setError(
        mensajeDeError(err, 'No se pudo dar de baja la inscripción.', {
          NO_ES_CAPITAN: 'Solo el capitán puede bajar al equipo.',
          INSCRIPCION_NO_EDITABLE: 'Esta inscripción ya no está confirmada.',
        })
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="alerta alerta-aviso aviso-nueva-fecha" role="status">
      <div>
        <strong>
          {inscripcion.torneo.nombre} cambió de fecha: pasa al {fechaHora(reprogramacion.fechaInicioNueva)}
        </strong>
        <p>
          Antes era el {fechaHora(reprogramacion.fechaInicioAnterior)}. Motivo: {reprogramacion.motivo}
        </p>
        <p>
          {puedeBajarse
            ? `Si la nueva fecha no te sirve, podés bajarte hasta el ${fechaHora(reprogramacion.rechazoHasta)}. Si no hacés nada, seguís inscripto.`
            : `Si la nueva fecha no les sirve, el capitán puede bajar al equipo hasta el ${fechaHora(reprogramacion.rechazoHasta)}.`}
        </p>
      </div>
      {puedeBajarse && (
        <Button variant="secondary" onClick={() => setAbierto(true)}>
          La nueva fecha no me sirve
        </Button>
      )}
      <Modal
        isOpen={abierto}
        title="¿Bajarte del torneo?"
        onClose={cerrar}
        closeDisabled={enviando}
        footer={
          <>
            <Button variant="secondary" disabled={enviando} onClick={cerrar}>
              Seguir inscripto
            </Button>
            <Button variant="danger" loading={enviando} onClick={() => void bajarse()}>
              Sí, me bajo
            </Button>
          </>
        }
      >
        <p>
          Se te devuelve{' '}
          <strong>{devuelve !== null ? pesos(devuelve) : 'lo que pagaste de inscripción'}</strong> a
          tu billetera. Los gastos administrativos no se devuelven.
        </p>
        <p>
          {deEquipo
            ? 'El equipo pierde el lugar en el torneo: si después quieren volver, tienen que inscribirse de nuevo mientras haya lugar.'
            : 'Perdés el lugar en el torneo: si después querés volver, tenés que inscribirte de nuevo mientras haya lugar.'}
        </p>
        {error && (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        )}
      </Modal>
    </div>
  );
};
