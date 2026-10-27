import React, { useRef, useState } from 'react';
import { torneoApi, TorneoInformacion } from '../../api/torneoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Button } from '../../shared/ui';
import { abreviarHash } from '../formato';

const TAMANIO_MAXIMO = 5 * 1024 * 1024;

const MENSAJES_ARCHIVO: Record<string, string> = {
  FORMATO_INVALIDO: 'Tiene que ser un PDF.',
  LONGITUD: 'El PDF puede pesar hasta 5 MB.',
};

const tamanio = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

interface ReglamentoPdfProps {
  /** Null mientras el torneo no se guardó: el PDF se sube a un borrador que ya existe. */
  torneo: TorneoInformacion | null;
  habilitado: boolean;
  /** El torneo como quedó después de subir o quitar el PDF. */
  onTorneo: (torneo: TorneoInformacion) => void;
}

/**
 * El anexo en PDF del reglamento, en el paso 1 (PICA-200). Con el PDF, el texto es opcional; su SHA-256 es lo que
 * se sella al publicar.
 */
export const ReglamentoPdf: React.FC<ReglamentoPdfProps> = ({ torneo, habilitado, onTorneo }) => {
  const input = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Nombre y tamaño del que se subió recién; después de recargar el back solo dice que hay uno.
  const [subido, setSubido] = useState<File | null>(null);

  const conPdf = Boolean(torneo?.reglamentoUrl);
  const editable = habilitado && !ocupado;

  const subir = async (archivo: File) => {
    if (!torneo) return;
    const esPdf = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
    if (!esPdf || archivo.size > TAMANIO_MAXIMO) {
      setError(MENSAJES_ARCHIVO[esPdf ? 'LONGITUD' : 'FORMATO_INVALIDO']);
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      onTorneo(await torneoApi.subirReglamento(torneo.id, archivo));
      setSubido(archivo);
    } catch (err) {
      setError(
        erroresPorCampo(err, MENSAJES_ARCHIVO).archivo ||
          mensajeDeError(err, 'No se pudo subir el PDF.')
      );
    } finally {
      setOcupado(false);
    }
  };

  const quitar = async () => {
    if (!torneo) return;
    setOcupado(true);
    setError(null);
    try {
      onTorneo(await torneoApi.quitarReglamento(torneo.id));
      setSubido(null);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo quitar el PDF.'));
    } finally {
      setOcupado(false);
    }
  };

  /** El de un borrador pide la sesión, así que se baja con el token y se abre desde memoria. */
  const ver = async () => {
    if (!torneo) return;
    // Se abre antes del await: si no, el navegador lo toma como popup y lo bloquea.
    const ventana = window.open('', '_blank');
    try {
      const url = URL.createObjectURL(await torneoApi.reglamentoPdf(torneo.id));
      if (ventana) ventana.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      ventana?.close();
      setError(mensajeDeError(err, 'No se pudo abrir el PDF.'));
    }
  };

  return (
    <div className="torneos-anexo">
      <strong>Anexo en PDF</strong>
      {!torneo && 'Guardá el borrador para adjuntar el reglamento en PDF.'}
      {torneo &&
        !conPdf &&
        'Podés adjuntar el reglamento en PDF, de hasta 5 MB. Con el PDF, el texto es opcional.'}
      {torneo && conPdf && (
        <>
          <span className="torneos-anexo-archivo">
            {subido ? `${subido.name} · ${tamanio(subido.size)}` : 'Reglamento en PDF'}
          </span>
          {torneo.reglamentoHash && (
            <span className="torneos-anexo-hash">
              SHA-256{' '}
              <code title={torneo.reglamentoHash}>{abreviarHash(torneo.reglamentoHash)}</code>
            </span>
          )}
        </>
      )}
      {error && (
        <p className="torneos-opciones-error" role="alert">
          {error}
        </p>
      )}
      {torneo && (
        <div className="torneos-anexo-acciones">
          {conPdf && (
            <Button type="button" variant="ghost" size="sm" onClick={ver}>
              Ver
            </Button>
          )}
          {habilitado && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!editable}
              loading={ocupado}
              onClick={() => input.current?.click()}
            >
              {conPdf ? 'Reemplazar' : 'Adjuntar PDF'}
            </Button>
          )}
          {habilitado && conPdf && (
            <Button type="button" variant="ghost" size="sm" disabled={!editable} onClick={quitar}>
              Quitar
            </Button>
          )}
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              e.target.value = '';
              if (archivo) subir(archivo);
            }}
          />
        </div>
      )}
    </div>
  );
};
