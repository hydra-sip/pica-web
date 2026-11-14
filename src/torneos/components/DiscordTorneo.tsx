import React, { useState } from 'react';
import { torneoApi, TorneoInformacion } from '../../api/torneoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Button, Field, Input } from '../../shared/ui';

/** El mismo formato que valida el back: solo discord.com, con el id y el token del webhook. */
const WEBHOOK = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

const NO_ES_WEBHOOK = 'Tiene que ser un webhook de Discord: https://discord.com/api/webhooks/…';

/** Los textos de los códigos de campo que en esta tarjeta dicen algo propio. */
const PROPIOS = {
  FORMATO_INVALIDO: NO_ES_WEBHOOK,
  REQUERIDO: 'Pegá la URL del webhook.',
};

interface DiscordTorneoProps {
  torneo: TorneoInformacion;
  onGuardado: (torneo: TorneoInformacion) => void;
}

/**
 * El webhook del canal de Discord del torneo (PICA-372): ahí llegan solos la llave, los resultados, los pases
 * directos, el campeón y la apertura de cada check-in. La URL es un secreto: el back la devuelve enmascarada, así que
 * para cambiarla se pega una nueva. Con el torneo terminado o cancelado se ve, pero ya no se cambia.
 */
export const DiscordTorneo: React.FC<DiscordTorneoProps> = ({ torneo, onGuardado }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando] = useState(false);

  const editable = torneo.estado !== 'FINALIZADO' && torneo.estado !== 'CANCELADO';

  const fallo = (err: unknown, porDefecto: string) => {
    const deCampo = erroresPorCampo(err, PROPIOS);
    if (deCampo.url) {
      setError(deCampo.url);
    } else {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err, porDefecto) });
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    const limpia = url.trim();
    if (!limpia) {
      setError(PROPIOS.REQUERIDO);
      return;
    }
    if (!WEBHOOK.test(limpia)) {
      setError(NO_ES_WEBHOOK);
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      onGuardado(await torneoApi.guardarDiscord(torneo.id, limpia));
      setUrl('');
      setMensaje({
        tipo: 'exito',
        texto: 'Webhook guardado: te mandamos un mensaje de prueba al canal.',
      });
    } catch (err) {
      fallo(err, 'No se pudo guardar el webhook.');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    setMensaje(null);
    setError(null);
    setQuitando(true);
    try {
      onGuardado(await torneoApi.quitarDiscord(torneo.id));
      setMensaje({ tipo: 'exito', texto: 'Webhook quitado: no se publica más en el canal.' });
    } catch (err) {
      fallo(err, 'No se pudo quitar el webhook.');
    } finally {
      setQuitando(false);
    }
  };

  return (
    <form className="torneos-form" onSubmit={(e) => void guardar(e)} noValidate>
      <p className="torneos-subtitulo">
        Publicamos solos en el canal de tu comunidad la llave, cada resultado, el campeón y cuándo
        se abre el check-in de cada partido.
      </p>
      {torneo.discordWebhook ? (
        <div className="torneos-acciones">
          <p className="torneos-subtitulo">
            Conectado a <code>{torneo.discordWebhook}</code>
          </p>
          {editable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={quitando}
              onClick={() => void quitar()}
            >
              Quitar webhook
            </Button>
          )}
        </div>
      ) : (
        <p className="torneos-subtitulo">Sin webhook: no se publica nada en Discord.</p>
      )}
      {editable && (
        <>
          <Field
            label={torneo.discordWebhook ? 'Cambiar por otro webhook' : 'Webhook del canal'}
            error={error}
            hint="En Discord: Editar canal → Integraciones → Webhooks → Nuevo webhook → Copiar URL del webhook."
          >
            <Input
              type="url"
              placeholder="https://discord.com/api/webhooks/…"
              autoComplete="off"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <div className="torneos-acciones">
            <Button type="submit" loading={guardando}>
              Guardar
            </Button>
          </div>
        </>
      )}
      {mensaje && (
        <div
          className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
          role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
        >
          {mensaje.texto}
        </div>
      )}
    </form>
  );
};
