import React, { useRef, useState } from 'react';
import { EvidenciaDetalle, partidoApi } from '../../api/partidoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button } from '../../shared/ui';
import { abreviarHash } from '../../torneos/formato';

const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEOS = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAXIMO_IMAGEN = 5 * 1024 * 1024;
const MAXIMO_VIDEO = 20 * 1024 * 1024;

const MENSAJES_ARCHIVO: Record<string, string> = {
  FORMATO_INVALIDO: 'Tiene que ser una foto (JPG, PNG o WEBP) o un video (MP4, MOV o WEBM).',
  LONGITUD: 'Una foto puede pesar hasta 5 MB y un video hasta 20 MB.',
};

const tamanio = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Lo mismo que mira el back, por adelantado: el back reconoce el formato por el contenido. */
const problemaDelArchivo = (archivo: File): string | null => {
  const video = VIDEOS.includes(archivo.type);
  if (!video && !IMAGENES.includes(archivo.type)) return MENSAJES_ARCHIVO.FORMATO_INVALIDO;
  return archivo.size > (video ? MAXIMO_VIDEO : MAXIMO_IMAGEN) ? MENSAJES_ARCHIVO.LONGITUD : null;
};

interface EvidenciasPartidoProps {
  partidoId: number;
  evidencias: EvidenciaDetalle[];
  /** El capitán de un lado, con el partido sin cerrar. */
  puedeSubir: boolean;
  onSubida: (evidencia: EvidenciaDetalle) => void;
  /** "Evidencia" si no viene. */
  titulo?: string;
  /** La que citó el laudo, marcada en la lista. */
  citadaId?: number | null;
}

/**
 * La evidencia del partido (PICA-243): fotos de la planilla, capturas o videos cortos. Es opcional al cargar el
 * resultado; cada archivo queda del lado de quien lo subió, con su SHA-256.
 */
export const EvidenciasPartido: React.FC<EvidenciasPartidoProps> = ({
  partidoId,
  evidencias,
  puedeSubir,
  onSubida,
  titulo = 'Evidencia',
  citadaId = null,
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subir = async (archivo: File) => {
    const problema = problemaDelArchivo(archivo);
    if (problema) {
      setError(problema);
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      onSubida(await partidoApi.subirEvidencia(partidoId, archivo));
    } catch (err) {
      setError(
        erroresPorCampo(err, MENSAJES_ARCHIVO).archivo ||
          mensajeDeError(err, 'No se pudo subir el archivo.')
      );
    } finally {
      setSubiendo(false);
    }
  };

  const ver = async (evidencia: EvidenciaDetalle) => {
    // Se abre antes del await: si no, el navegador lo toma como popup y lo bloquea.
    const ventana = window.open('', '_blank');
    try {
      const url = URL.createObjectURL(await partidoApi.archivoEvidencia(partidoId, evidencia.id));
      if (ventana) ventana.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      ventana?.close();
      setError(mensajeDeError(err, 'No se pudo abrir el archivo.'));
    }
  };

  return (
    <div className="partido-evidencias">
      <strong>{titulo}</strong>
      {evidencias.length === 0 ? (
        <p className="partido-ayuda">
          {puedeSubir
            ? 'Opcional: podés adjuntar la foto de la planilla, una captura o un video corto.'
            : 'No hay evidencia adjunta.'}
        </p>
      ) : (
        <ul className="partido-evidencias-lista">
          {evidencias.map((e) => (
            <li key={e.id}>
              <span>
                {e.tipoContenido.startsWith('video/') ? 'Video' : 'Foto'} de{' '}
                {e.equipo ?? 'una parte'} · {tamanio(e.tamanioBytes)} ✓
                {e.id === citadaId && <Badge tone="info">Citada en el laudo</Badge>}
                <span className="partido-hash">
                  SHA-256 <code title={e.hash}>{abreviarHash(e.hash)}</code>
                </span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void ver(e)}>
                Ver
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="partido-error" role="alert">
          {error}
        </p>
      )}
      {puedeSubir && (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={subiendo}
            onClick={() => input.current?.click()}
          >
            Adjuntar foto o video
          </Button>
          <input
            ref={input}
            type="file"
            accept={[...IMAGENES, ...VIDEOS].join(',')}
            hidden
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              e.target.value = '';
              if (archivo) void subir(archivo);
            }}
          />
        </div>
      )}
    </div>
  );
};
