import React, { useState } from 'react';
import {
  EvidenciaDetalle,
  PartidoDetalle,
  ResultadoPayload,
  partidoApi,
} from '../../api/partidoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Button, Field, Modal, Textarea } from '../../shared/ui';
import { abreviarHash } from '../../torneos/formato';
import { MARCADOR_VACIO, Marcador, erroresDelMarcador, payloadDelMarcador } from '../marcador';
import { selloDelLaudo } from '../sello';
import { CamposMarcador } from './CamposMarcador';

const MAXIMO_JUSTIFICACION = 2000;

type Opcion = 'original' | 'propuesta' | 'otro';

/** `2 (4) - 2 (2)`, como en el wireframe. */
const texto = (r: ResultadoPayload): string =>
  r.penalesLocal == null
    ? `${r.puntajeLocal} - ${r.puntajeVisitante}`
    : `${r.puntajeLocal} (${r.penalesLocal}) - ${r.puntajeVisitante} (${r.penalesVisitante})`;

const ganaLocal = (r: ResultadoPayload): boolean =>
  r.puntajeLocal > r.puntajeVisitante ||
  (r.puntajeLocal === r.puntajeVisitante && (r.penalesLocal ?? 0) > (r.penalesVisitante ?? 0));

interface ResolverObjecionProps {
  partido: PartidoDetalle;
  evidencias: EvidenciaDetalle[];
  onLaudado: (partido: PartidoDetalle) => void;
}

/**
 * El laudo de un partido objetado (wireframe "Laudo Arbitral", PICA-249), para el organizador o un árbitro con
 * permiso: el resultado oficial (el cargado, el que propone quien objetó u otro), la evidencia en la que se basa y la
 * justificación. Antes de confirmar, un modal muestra el cambio, quién avanza y el sello SHA-256 que va a quedar.
 */
export const ResolverObjecion: React.FC<ResolverObjecionProps> = ({
  partido,
  evidencias,
  onLaudado,
}) => {
  const objecion = partido.objecion!;
  const original: ResultadoPayload = {
    puntajeLocal: partido.local?.puntaje ?? 0,
    puntajeVisitante: partido.visitante?.puntaje ?? 0,
    penalesLocal: partido.local?.penales ?? null,
    penalesVisitante: partido.visitante?.penales ?? null,
  };
  const propuesta: ResultadoPayload = {
    puntajeLocal: objecion.puntajeLocal,
    puntajeVisitante: objecion.puntajeVisitante,
    penalesLocal: objecion.penalesLocal,
    penalesVisitante: objecion.penalesVisitante,
  };
  const objetor = objecion.lado === 'LOCAL' ? partido.local : partido.visitante;

  const [opcion, setOpcion] = useState<Opcion>('propuesta');
  const [marcador, setMarcador] = useState<Marcador>(MARCADOR_VACIO);
  const [evidenciaId, setEvidenciaId] = useState<number | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [revisando, setRevisando] = useState<{ resultado: ResultadoPayload; sello: string } | null>(
    null
  );
  const [definitivo, setDefinitivo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revisar = async (e: React.FormEvent) => {
    e.preventDefault();
    const faltan = opcion === 'otro' ? erroresDelMarcador(marcador) : {};
    if (evidenciaId === null) faltan.evidenciaId = 'Elegí la evidencia en la que te basás.';
    if (justificacion.trim() === '') faltan.justificacion = 'Explicá el fallo.';
    setErrores(faltan);
    setError(null);
    if (Object.keys(faltan).length > 0) return;

    const resultado =
      opcion === 'original'
        ? original
        : opcion === 'propuesta'
          ? propuesta
          : payloadDelMarcador(marcador);
    const evidencia = evidencias.find((x) => x.id === evidenciaId)!;
    setDefinitivo(false);
    setRevisando({
      resultado,
      sello: await selloDelLaudo(partido.id, resultado, evidencia.hash, justificacion),
    });
  };

  const confirmar = async () => {
    if (!revisando || evidenciaId === null) return;
    setEnviando(true);
    try {
      const laudado = await partidoApi.laudar(partido.id, {
        ...revisando.resultado,
        justificacion: justificacion.trim(),
        evidenciaId,
      });
      setRevisando(null);
      onLaudado(laudado);
    } catch (err) {
      setRevisando(null);
      const porCampo = erroresPorCampo(err);
      setErrores(porCampo);
      setError(mensajeDeError(err, 'No se pudo emitir el laudo.'));
    } finally {
      setEnviando(false);
    }
  };

  const ganador = revisando && (ganaLocal(revisando.resultado) ? partido.local : partido.visitante);
  const mismo = revisando && texto(revisando.resultado) === texto(original);

  return (
    <form className="partido-laudo" onSubmit={(e) => void revisar(e)} noValidate>
      <p className="partido-rotulo">Resolver objeción</p>

      <fieldset className="partido-opciones">
        <legend>Resultado oficial</legend>
        <label>
          <input
            type="radio"
            name="opcion"
            checked={opcion === 'original'}
            onChange={() => setOpcion('original')}
          />
          <span>
            Mantener el acta original: <strong>{texto(original)}</strong>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="opcion"
            checked={opcion === 'propuesta'}
            onChange={() => setOpcion('propuesta')}
          />
          <span>
            Lo que propone {objetor?.nombre ?? 'quien objetó'}: <strong>{texto(propuesta)}</strong>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="opcion"
            checked={opcion === 'otro'}
            onChange={() => setOpcion('otro')}
          />
          <span>Otro resultado</span>
        </label>
      </fieldset>
      {opcion === 'otro' && (
        <CamposMarcador
          marcador={marcador}
          errores={errores}
          nombreLocal={partido.local?.nombre}
          nombreVisitante={partido.visitante?.nombre}
          onChange={setMarcador}
        />
      )}

      <fieldset className="partido-opciones">
        <legend>Evidencia en la que te basás</legend>
        {evidencias.length === 0 && <p className="partido-ayuda">El partido no tiene evidencia.</p>}
        {evidencias.map((x) => (
          <label key={x.id}>
            <input
              type="radio"
              name="evidencia"
              checked={evidenciaId === x.id}
              onChange={() => setEvidenciaId(x.id)}
            />
            <span>
              {x.tipoContenido.startsWith('video/') ? 'Video' : 'Foto'} de {x.equipo ?? 'una parte'}{' '}
              <code className="partido-hash">{abreviarHash(x.hash)}</code>
            </span>
          </label>
        ))}
        {errores.evidenciaId && (
          <p className="partido-error" role="alert">
            {errores.evidenciaId}
          </p>
        )}
      </fieldset>

      <Field
        label="Justificación"
        error={errores.justificacion}
        hint="Queda en el laudo y en la auditoría."
      >
        <Textarea
          rows={3}
          maxLength={MAXIMO_JUSTIFICACION}
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
        />
      </Field>
      {error && (
        <p className="partido-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" block>
        Revisar laudo
      </Button>

      <Modal
        isOpen={revisando !== null}
        title="¿Aplicar laudo arbitral?"
        onClose={() => setRevisando(null)}
        closeDisabled={enviando}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevisando(null)} disabled={enviando}>
              Volver
            </Button>
            <Button onClick={() => void confirmar()} loading={enviando} disabled={!definitivo}>
              Confirmar laudo y avanzar llave
            </Button>
          </>
        }
      >
        {revisando && (
          <div className="partido-laudo-resumen">
            <p>
              {mismo
                ? `Se confirma el resultado de la ${partido.nombreRonda}: ${texto(original)}`
                : `El marcador de la ${partido.nombreRonda} pasará de ${texto(original)} a ${texto(revisando.resultado)}`}{' '}
              y {ganador?.nombre}{' '}
              {partido.nombreRonda === 'Final' ? 'será campeón.' : 'avanzará a la ronda siguiente.'}
            </p>
            <p className="partido-ayuda">Esta decisión se publica en la auditoría.</p>
            <div className="partido-laudo-actas">
              <div>
                <p className="partido-rotulo">Acta original objetada</p>
                <p>
                  {partido.local?.nombre} <strong>{texto(original)}</strong>{' '}
                  {partido.visitante?.nombre}
                </p>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <p className="partido-rotulo">Nuevo resultado oficial</p>
                <p>
                  {partido.local?.nombre} <strong>{texto(revisando.resultado)}</strong>{' '}
                  {partido.visitante?.nombre}
                </p>
              </div>
            </div>
            <p className="partido-rotulo">Resumen del fallo (justificación)</p>
            <blockquote>“{justificacion.trim()}”</blockquote>
            <p className="partido-hash">
              Sello SHA-256 proyectado:{' '}
              <code title={revisando.sello}>{abreviarHash(revisando.sello)}</code>
            </p>
            <label className="partido-definitivo">
              <input
                type="checkbox"
                checked={definitivo}
                onChange={(e) => setDefinitivo(e.target.checked)}
                disabled={enviando}
              />
              <span>Entiendo que el laudo es definitivo</span>
            </label>
          </div>
        )}
      </Modal>
    </form>
  );
};
