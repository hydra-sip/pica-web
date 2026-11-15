import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { SorteoGrupos } from '../api/torneoApi';
import { server } from '../mocks/server';
import { renderRuta } from '../test/renderRuta';
import { VerificacionGrupos } from './components/VerificacionGrupos';
import { compromisoCoincide, recalcularSorteoGrupos } from './crypto/recalcularGrupos';
import { calcularSha256 } from './crypto/recalcularSorteo';

const FIRMA = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const INSCRIPCIONES = [11, 12, 13, 14, 15, 16, 17, 18];

/** La semilla como la deriva drand: SHA-256 de los bytes de la firma. */
const semillaDeLaFirma = async (firma: string): Promise<string> => {
  const bytes = new Uint8Array(firma.match(/../g)!.map((par) => parseInt(par, 16)));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/** Un sorteo como lo publicaría el back, con el reparto recalculado. */
const sorteoReal = async (): Promise<SorteoGrupos> => {
  const semilla = await semillaDeLaFirma(FIRMA);
  const listaHash = await calcularSha256('lista');
  const { grupos } = await recalcularSorteoGrupos(semilla, INSCRIPCIONES, 2);
  return {
    torneoId: 7,
    torneoNombre: 'Copa con grupos',
    version: 1,
    listaHash,
    listaSelladaEn: '2026-11-20T12:00:00Z',
    inscripciones: INSCRIPCIONES,
    semillaRonda: 4242,
    compromisoHash: await calcularSha256(`${listaHash}:4242`),
    semilla,
    semillaFirma: FIRMA,
    semillaUrl: 'https://api.drand.sh/x/public/4242',
    cantidadGrupos: 2,
    grupos: grupos.map((ids, i) => ({
      letra: String.fromCharCode(65 + i),
      integrantes: ids.map((id) => ({ inscripcionId: id, nombre: `Jugador ${id}` })),
    })),
  };
};

describe('el reparto de los grupos (CR-02-9)', () => {
  it('ordena por SHA-256(semilla:id) y reparte en serpentina', async () => {
    const semilla = 'abc';
    const { orden, grupos } = await recalcularSorteoGrupos(semilla, INSCRIPCIONES, 4);

    const hashes = await Promise.all(INSCRIPCIONES.map((id) => calcularSha256(`${semilla}:${id}`)));
    const esperado = INSCRIPCIONES.map((id, i) => ({ id, hash: hashes[i] }))
      .sort((a, b) => (a.hash < b.hash ? -1 : 1))
      .map((x) => x.id);
    expect(orden.map((o) => o.id)).toEqual(esperado);
    // A B C D D C B A
    expect(grupos[0]).toEqual([esperado[0], esperado[7]]);
    expect(grupos[3]).toEqual([esperado[3], esperado[4]]);
    expect(orden.map((o) => o.letra).join('')).toBe('ABCDDCBA');
  });

  it('el compromiso es SHA-256(lista:ronda)', async () => {
    const compromiso = await calcularSha256('abc:7');
    expect(await compromisoCoincide('abc', 7, compromiso)).toBe(true);
    expect(await compromisoCoincide('abc', 8, compromiso)).toBe(false);
  });
});

describe('la verificación de los grupos en el portal (CR-02-9)', () => {
  it('un sorteo real coincide', async () => {
    render(<VerificacionGrupos datos={await sorteoReal()} />);

    expect(await screen.findByTestId('banner-grupos-coincide')).toBeInTheDocument();
    expect(screen.getAllByText(/— coincide/)).toHaveLength(2);
  });

  it('un reparto alterado no coincide', async () => {
    const real = await sorteoReal();
    const [a, b] = real.grupos;
    // cambia el primero de A por el primero de B
    const alterado: SorteoGrupos = {
      ...real,
      grupos: [
        { ...a, integrantes: [b.integrantes[0], ...a.integrantes.slice(1)] },
        { ...b, integrantes: [a.integrantes[0], ...b.integrantes.slice(1)] },
      ],
    };
    render(<VerificacionGrupos datos={alterado} />);

    expect(await screen.findByTestId('banner-grupos-no-coincide')).toBeInTheDocument();
  });

  it('una semilla que no es la de la firma no coincide', async () => {
    const real = await sorteoReal();
    render(<VerificacionGrupos datos={{ ...real, semillaFirma: 'ff'.repeat(16) }} />);

    expect(await screen.findByTestId('banner-grupos-no-coincide')).toBeInTheDocument();
  });

  it('antes del sorteo muestra el compromiso', async () => {
    const real = await sorteoReal();
    render(
      <VerificacionGrupos datos={{ ...real, semilla: null, semillaFirma: null, grupos: [] }} />
    );

    expect(screen.getByText(/todavía no se sortearon/)).toBeInTheDocument();
    expect(screen.getByText(real.compromisoHash!)).toBeInTheDocument();
  });
});

describe('la pestaña de grupos del portal, con MSW (CR-02-9)', () => {
  it('pide el sorteo al back y confirma que coincide', async () => {
    const real = await sorteoReal();
    server.use(http.get('*/torneos/7/sorteo-grupos', () => HttpResponse.json(real)));

    await renderRuta('/verificacion?tipo=grupos&id=7', { usuario: 'anonimo' });

    expect(await screen.findByTestId('banner-grupos-coincide')).toBeInTheDocument();
    expect(screen.getByTestId('tab-grupos')).toHaveClass('activo');
  });

  it('detecta un sorteo modificado', async () => {
    const real = await sorteoReal();
    const alterado = { ...real, semilla: await calcularSha256('otra semilla') };
    server.use(http.get('*/torneos/7/sorteo-grupos', () => HttpResponse.json(alterado)));

    await renderRuta('/verificacion?tipo=grupos&id=7', { usuario: 'anonimo' });

    expect(await screen.findByTestId('banner-grupos-no-coincide')).toBeInTheDocument();
  });
});
