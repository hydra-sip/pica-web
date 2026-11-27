import React, { useEffect, useState } from 'react';
import { torneoApi, TorneoInformacion } from '../../api/torneoApi';
import { fechaHora, inputLocalAIso, isoAInputLocal } from '../../shared/formato';
import { mensajeDeError, mensajesDelBackPorCampo } from '../../shared/mensajesError';
import { Button, Field, Input, Modal, Textarea } from '../../shared/ui';

interface ReprogramarTorneoProps {
  torneo: TorneoInformacion;
  /** Si el torneo ya tiene la llave (o los grupos) sorteada: reprogramar la descarta. */
  conLlave: boolean;
  /** Después de reprogramar: la consola se recarga y muestra el mensaje. */
  onReprogramado: (mensaje: string) => void;
}

/**
 * CR-01-5 (PICA-394): el organizador cambia las fechas de su torneo sin cancelarlo. La plata sigue en custodia y los
 * inscriptos tienen hasta el plazo para bajarse si la nueva fecha no les sirve; al vencer, si se liberaron lugares, la
 * inscripción se abre hasta el nuevo cierre. Antes de confirmar, un resumen de a cuántos se avisa y qué pasa con la
 * inscripción y la llave. El botón solo se muestra donde se puede reprogramar; eso lo decide la consola.
 */
export const ReprogramarTorneo: React.FC<ReprogramarTorneoProps> = ({ torneo, conLlave, onReprogramado }) => {
  const [abierto, setAbierto] = useState(false);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [cierre, setCierre] = useState('');
  const [rechazo, setRechazo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmadas, setConfirmadas] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!abierto) return;
    torneoApi
      .inscripciones(torneo.id, { estado: 'CONFIRMADA', size: 1 })
      .then((pagina) => setConfirmadas(pagina.page.totalElements))
      .catch(() => setConfirmadas(null));
  }, [abierto, torneo.id]);

  const abrir = () => {
    setInicio(isoAInputLocal(torneo.fechaInicio ?? null));
    setFin(isoAInputLocal(torneo.fechaFin ?? null));
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
    setCierre('');
    setRechazo('');
    setMotivo('');
    setError(null);
    setErroresCampo({});
  };

  const reprogramar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await torneoApi.reprogramar(torneo.id, {
        fechaInicio: inputLocalAIso(inicio),
        fechaFin: inputLocalAIso(fin),
        cierreInscripcion: inputLocalAIso(cierre),
        rechazoHasta: inputLocalAIso(rechazo),
        motivo: motivo.trim(),
      });
      cerrar();
      onReprogramado('Torneo reprogramado: avisamos a los inscriptos la nueva fecha y el plazo para bajarse.');
    } catch (err) {
      const porCampo = mensajesDelBackPorCampo(err);
      setErroresCampo(porCampo);
      setError(
        Object.keys(porCampo).length > 0
          ? null
          : mensajeDeError(err, 'No se pudo reprogramar el torneo.', {
              BRACKET_CON_RESULTADOS: 'El torneo ya tiene resultados cargados: no se puede reprogramar.',
            })
      );
    } finally {
      setEnviando(false);
    }
  };

  const listo = inicio !== '' && cierre !== '' && rechazo !== '' && motivo.trim().length > 0;
  const abierta = torneo.estado === 'INSCRIPCION_ABIERTA';

  return (
    <>
      <Button variant="secondary" onClick={abrir}>
        Reprogramar
      </Button>
      <Modal
        isOpen={abierto}
        title="Reprogramar el torneo"
        onClose={cerrar}
        closeDisabled={enviando}
        footer={
          <>
            <Button variant="secondary" disabled={enviando} onClick={cerrar}>
              Volver a la consola
            </Button>
            <Button loading={enviando} disabled={!listo} onClick={() => void reprogramar()}>
              Reprogramar y avisar
            </Button>
          </>
        }
      >
        <p>
          Cambiás las fechas sin cancelar el torneo: <strong>la plata sigue en custodia</strong> y
          a los que no les sirva la nueva fecha se les devuelve la inscripción (sin los gastos
          administrativos) si se bajan dentro del plazo.
        </p>
        <Field label="Nueva fecha de inicio" required error={erroresCampo.fechaInicio}>
          <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Field>
        <Field label="Nueva fecha de fin (opcional)" error={erroresCampo.fechaFin}>
          <Input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
        </Field>
        <Field
          label="Plazo para bajarse"
          hint="Hasta cuándo los inscriptos pueden decir que la nueva fecha no les sirve."
          required
          error={erroresCampo.rechazoHasta}
        >
          <Input type="datetime-local" value={rechazo} onChange={(e) => setRechazo(e.target.value)} />
        </Field>
        <Field
          label="Nuevo cierre de inscripción"
          hint="Después del plazo: hasta cuándo se puede anotar gente en los lugares que se liberen."
          required
          error={erroresCampo.cierreInscripcion}
        >
          <Input type="datetime-local" value={cierre} onChange={(e) => setCierre(e.target.value)} />
        </Field>
        <Field label="Motivo (lo ven los inscriptos)" required error={erroresCampo.motivo}>
          <Textarea rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Field>
        <section className="torneos-reprogramacion-resumen" aria-label="Qué va a pasar">
          <h3>Qué va a pasar</h3>
          <ul>
            <li>
              {confirmadas === null
                ? 'Avisamos a cada inscripto'
                : `Avisamos a ${confirmadas} ${confirmadas === 1 ? 'inscripción confirmada' : 'inscripciones confirmadas'}`}{' '}
              por correo y en el centro de notificaciones
              {rechazo && `, con plazo para bajarse hasta el ${fechaHora(inputLocalAIso(rechazo))}`}.
            </li>
            <li>La plata sigue en custodia: no se mueve nada hasta que alguien se baje.</li>
            <li>
              {abierta
                ? 'La inscripción sigue abierta hasta el nuevo cierre; mientras corre el plazo no se cierra aunque se complete el cupo.'
                : 'La inscripción queda cerrada mientras corre el plazo. Al vencer, si se liberaron lugares, se abre hasta el nuevo cierre.'}
            </li>
            {conLlave && (
              <li>
                <strong>Se descarta la llave</strong> (y los grupos, si los hay): la vas a volver a
                generar cuando cierre la inscripción.
              </li>
            )}
          </ul>
        </section>
        {error && (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        )}
      </Modal>
    </>
  );
};
