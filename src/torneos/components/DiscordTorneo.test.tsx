import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { TorneoInformacion } from '../../api/torneoApi';
import { server } from '../../mocks/server';
import { DiscordTorneo } from './DiscordTorneo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const WEBHOOK = 'https://discord.com/api/webhooks/1234567890/aBc-DeF_ghij';
const ENMASCARADO = 'https://discord.com/api/webhooks/…/••••ghij';

/** Lo que la tarjeta usa del torneo. */
const torneo = (cambios: Partial<TorneoInformacion> = {}): TorneoInformacion =>
  ({ id: 9, estado: 'EN_CURSO', discordWebhook: null, ...cambios }) as TorneoInformacion;

const problema = (status: number, codigo: string, errores: unknown[] = []) =>
  HttpResponse.json(
    { status, codigo, detail: 'No se pudo', errores },
    { status, headers: { 'Content-Type': 'application/problem+json' } }
  );

const pegar = async (url: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Webhook del canal'), url);
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
};

describe('DiscordTorneo', () => {
  it('guarda el webhook y lo muestra enmascarado', async () => {
    let enviado: unknown = null;
    server.use(
      http.put(`${API_URL}/torneos/9/discord`, async ({ request }) => {
        enviado = await request.json();
        return HttpResponse.json(torneo({ discordWebhook: ENMASCARADO }));
      })
    );
    const onGuardado = vi.fn();
    const { rerender } = render(<DiscordTorneo torneo={torneo()} onGuardado={onGuardado} />);
    expect(screen.getByText('Sin webhook: no se publica nada en Discord.')).toBeInTheDocument();
    expect(screen.getByText(/Integraciones → Webhooks/)).toBeInTheDocument();

    await pegar(`  ${WEBHOOK} `);

    expect(enviado).toEqual({ url: WEBHOOK });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'te mandamos un mensaje de prueba al canal'
    );
    const guardado = onGuardado.mock.calls[0][0] as TorneoInformacion;
    rerender(<DiscordTorneo torneo={guardado} onGuardado={onGuardado} />);
    expect(screen.getByText(ENMASCARADO)).toBeInTheDocument();
    expect(screen.getByLabelText('Cambiar por otro webhook')).toHaveValue('');
  });

  it.each([
    'https://discordapp.com/api/webhooks/1234567890/aBc',
    'http://discord.com/api/webhooks/1234567890/aBc',
    'https://ejemplo.com/hook',
  ])('no manda %s: no es un webhook de Discord', async (url) => {
    const put = vi.fn();
    server.use(
      http.put(`${API_URL}/torneos/9/discord`, () => {
        put();
        return HttpResponse.json(torneo());
      })
    );
    render(<DiscordTorneo torneo={torneo()} onGuardado={() => {}} />);

    await pegar(url);

    expect(await screen.findByText(/Tiene que ser un webhook de Discord/)).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('muestra en el campo el error del back', async () => {
    server.use(
      http.put(`${API_URL}/torneos/9/discord`, () =>
        problema(400, 'VALIDACION', [{ campo: 'url', codigo: 'FORMATO_INVALIDO', mensaje: 'no' }])
      )
    );
    render(<DiscordTorneo torneo={torneo()} onGuardado={() => {}} />);

    await pegar(WEBHOOK);

    expect(await screen.findByText(/Tiene que ser un webhook de Discord/)).toBeInTheDocument();
    expect(screen.getByLabelText('Webhook del canal')).toHaveAttribute('aria-invalid', 'true');
  });

  it('con un 409 avisa que el torneo ya no se puede cambiar', async () => {
    server.use(http.put(`${API_URL}/torneos/9/discord`, () => problema(409, 'TORNEO_NO_EDITABLE')));
    render(<DiscordTorneo torneo={torneo()} onGuardado={() => {}} />);

    await pegar(WEBHOOK);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('quita el webhook', async () => {
    server.use(http.delete(`${API_URL}/torneos/9/discord`, () => HttpResponse.json(torneo())));
    const onGuardado = vi.fn();
    render(
      <DiscordTorneo torneo={torneo({ discordWebhook: ENMASCARADO })} onGuardado={onGuardado} />
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Quitar webhook' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Webhook quitado');
    expect(onGuardado).toHaveBeenCalledWith(expect.objectContaining({ discordWebhook: null }));
  });

  it('con el torneo terminado se ve pero no se cambia', () => {
    render(
      <DiscordTorneo
        torneo={torneo({ estado: 'FINALIZADO', discordWebhook: ENMASCARADO })}
        onGuardado={() => {}}
      />
    );

    expect(screen.getByText(ENMASCARADO)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar webhook' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });
});
