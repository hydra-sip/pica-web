import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockRifaVerificacion10 } from '../mocks/verificacionHandlers';
import { renderRuta } from '../test/renderRuta';
import { VerificacionRifa } from './components/VerificacionRifa';
import {
  calcularSha256,
  recalcularSorteoBracket,
  recalcularSorteoRifa,
} from './crypto/recalcularSorteo';

describe('HU-505 / T505-1: Motor Criptográfico (Unitario)', () => {
  it('calcularSha256 genera el hash correcto idéntico al estándar', async () => {
    // SHA-256 de "hola"
    const hash = await calcularSha256('hola');
    expect(hash).toBe('b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79');
  });

  it('recalcularSorteoBracket rechaza con menos de 2 participantes', async () => {
    await expect(recalcularSorteoBracket('semilla', [{ id: 1, nombre: 'Solo' }])).rejects.toThrow(
      /al menos dos inscripciones/i
    );
  });

  it('recalcularSorteoBracket con 8 participantes genera 3 rondas y 4 cruces sin BYE', async () => {
    const semilla = 'a'.repeat(64);
    const inscriptos = Array.from({ length: 8 }, (_, i) => ({
      id: 101 + i,
      nombre: `Equipo ${i + 1}`,
    }));

    const res = await recalcularSorteoBracket(semilla, inscriptos);
    expect(res.rondas).toBe(3);
    expect(res.partidosPrimeraRonda).toBe(4);
    expect(res.byes).toBe(0);
    expect(res.cruces).toHaveLength(4);
    expect(res.cruces.every((c) => !c.bye)).toBe(true);
  });

  it('recalcularSorteoBracket con 11 participantes genera 4 rondas, 8 partidos y 5 BYEs en posiciones 1, 2, 3, 5, 7', async () => {
    const semilla = 'a'.repeat(64);
    const inscriptos = Array.from({ length: 11 }, (_, i) => ({
      id: 101 + i,
      nombre: `Participante ${i + 1}`,
    }));

    const res = await recalcularSorteoBracket(semilla, inscriptos);
    expect(res.rondas).toBe(4);
    expect(res.partidosPrimeraRonda).toBe(8);
    expect(res.byes).toBe(5);
    expect(res.posicionesConBye).toEqual([1, 3, 5, 7, 2]);

    const conBye = res.cruces.filter((c) => c.bye);
    expect(conBye).toHaveLength(5);
    expect(conBye.map((c) => c.posicion)).toEqual([1, 2, 3, 5, 7]);
  });

  it('recalcularSorteoRifa recalcula la lista, el compromiso y los ganadores como el back', async () => {
    const { semilla, lista, fechaSorteo, premios, listaHash, compromisoHash } =
      mockRifaVerificacion10;

    const res = await recalcularSorteoRifa(semilla, lista, fechaSorteo, premios);

    expect(res.listaHashCalculado).toBe(listaHash);
    expect(res.compromisoCalculado).toBe(compromisoHash);
    expect(res.ganadores.map((g) => g.numeroGanador)).toEqual([14, 88, 7]);
  });

  it('recalcularSorteoRifa deja sin ganador los premios que superan a los vendidos', async () => {
    const lista = [{ numero: 3, ticketCodigo: 'R1-AAAAAA' }];
    const premios = [
      { puesto: 1, pct: 70 },
      { puesto: 2, pct: 30 },
    ];

    const res = await recalcularSorteoRifa('abc', lista, '2026-10-31T15:00:00Z', premios);

    expect(res.ganadores.map((g) => g.numeroGanador)).toEqual([3, null]);
  });
});

describe('HU-505 / T505-1: Portal Público de Verificación (Integración)', () => {
  it('Criterio 1: Permite acceder al portal sin estar autenticado y consultar el sorteo de un torneo', async () => {
    // Entrar sin sesión (usuario: 'anonimo')
    const { user } = await renderRuta('/verificacion', { usuario: 'anonimo' });

    // Título y encabezado público visible
    expect(
      await screen.findByRole('heading', { name: /portal público de verificación criptográfica/i })
    ).toBeInTheDocument();

    // Se cargó por defecto el primer torneo con el bracket sorteado del catálogo (en curso)
    expect(
      await screen.findByRole('heading', { name: 'Liga Abierta de Ajedrez Rápido' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('semilla-valor')).toHaveTextContent(/^4f8d9b1a/);

    // En la pestaña de rifas se carga la última rifa sorteada
    await user.click(screen.getByTestId('tab-rifa'));
    expect(await screen.findByText('Gran Rifa Benéfica de la Copa')).toBeInTheDocument();
  });

  it('Criterio 2: Muestra la semilla utilizada, el hash de la lista sellada y el resultado obtenido', async () => {
    await renderRuta('/verificacion?tipo=torneo&id=5', { usuario: 'anonimo' });

    // 1. Semilla utilizada
    const semilla = await screen.findByTestId('semilla-valor');
    expect(semilla.textContent).toContain(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );

    // 2. Hash de la lista sellada al cerrar la inscripción
    const lista = screen.getByTestId('lista-hash');
    expect(lista.textContent).toContain(
      'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78'
    );

    // 3. Resultado obtenido (cruces de la primera ronda del bracket)
    const tabla = screen.getByTestId('tabla-cruces');
    expect(within(tabla).getByText('Atlético Juvenil')).toBeInTheDocument();
    expect(within(tabla).getByText('Racing Club Norte')).toBeInTheDocument();
    expect(within(tabla).getByText('Defensores del Sur')).toBeInTheDocument();
    expect(within(tabla).getByText('Los Halcones')).toBeInTheDocument();
    expect(within(tabla).getByText('Deportivo PICA')).toBeInTheDocument();
    expect(within(tabla).getByText('San Lorenzo UNLu')).toBeInTheDocument();
    expect(within(tabla).getByText('Unión Porteña')).toBeInTheDocument();
    expect(within(tabla).getByText('Estudiantes FC')).toBeInTheDocument();
  });

  it('Criterio 3: Ejecutar la recalculación desde el portal con los datos publicados y comprobar que coincide con el publicado', async () => {
    const { user } = await renderRuta('/verificacion?tipo=torneo&id=5', { usuario: 'anonimo' });

    await screen.findByRole('heading', { name: 'Torneo Clausura de Vóley Mixto' });

    // Botón de recalcular y verificar
    const btnRecalcular = screen.getByTestId('btn-recalcular');
    await user.click(btnRecalcular);

    // Banner de éxito criptográfico
    const banner = await screen.findByTestId('banner-verificacion-exitosa');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/resultado 100% verificado criptográficamente/i);
    expect(banner).toHaveTextContent(/no fue manipulado/i);

    // Cada cruce tiene la etiqueta "Coincide"
    const fila1 = screen.getByTestId('fila-cruce-1');
    expect(within(fila1).getByText('Coincide')).toBeInTheDocument();
    expect(within(fila1).queryByText('Difiere')).not.toBeInTheDocument();

    const fila4 = screen.getByTestId('fila-cruce-4');
    expect(within(fila4).getByText('Coincide')).toBeInTheDocument();
  });

  it('Criterio 4: Alterar manualmente un dato de entrada (simulación) antes de recalcular y comprobar que el resultado difiere', async () => {
    const { user } = await renderRuta('/verificacion?tipo=torneo&id=5', { usuario: 'anonimo' });

    await screen.findByTestId('semilla-valor');

    // 1. Abrir panel de simulación
    const toggleSimulacion = screen.getByTestId('toggle-simulacion-btn');
    await user.click(toggleSimulacion);

    expect(await screen.findByTestId('panel-simulacion')).toBeInTheDocument();

    // 2. Alterar manualmente la semilla
    const btnAlterarSemilla = screen.getByTestId('btn-alterar-semilla');
    await user.click(btnAlterarSemilla);

    // 3. Recalcular con el dato alterado
    const btnRecalcular = screen.getByTestId('btn-recalcular');
    await user.click(btnRecalcular);

    // 4. Se comprueba que el resultado difiere y se evidencia la manipulación
    const bannerDiscrepancia = await screen.findByTestId('banner-discrepancia-detectada');
    expect(bannerDiscrepancia).toBeInTheDocument();
    expect(bannerDiscrepancia).toHaveTextContent(/discrepancia detectada/i);
    expect(bannerDiscrepancia).toHaveTextContent(/manipulación evidenciada/i);

    // Las filas muestran la discrepancia
    const badgesDifiere = await screen.findAllByText('Difiere');
    expect(badgesDifiere.length).toBeGreaterThan(0);

    // 5. Restablecer datos originales y verificar que vuelve a coincidir al 100%
    const btnRestablecer = screen.getByTestId('btn-restablecer');
    await user.click(btnRestablecer);

    await user.click(btnRecalcular);
    expect(await screen.findByTestId('banner-verificacion-exitosa')).toBeInTheDocument();
  });

  it('Alterar un participante en el modo simulación también evidencia la manipulación', async () => {
    const { user } = await renderRuta('/verificacion?tipo=torneo&id=5', { usuario: 'anonimo' });

    await screen.findByTestId('semilla-valor');

    const toggleSimulacion = screen.getByTestId('toggle-simulacion-btn');
    await user.click(toggleSimulacion);

    const btnAlterarInscripto = screen.getByTestId('btn-alterar-inscripto');
    await user.click(btnAlterarInscripto);

    const btnRecalcular = screen.getByTestId('btn-recalcular');
    await user.click(btnRecalcular);

    expect(await screen.findByTestId('banner-discrepancia-detectada')).toBeInTheDocument();
  });

  it('Consultar torneo con BYEs (11 participantes) recalcula los cruces con BYE correctamente', async () => {
    const { user } = await renderRuta('/verificacion?tipo=torneo&id=3', { usuario: 'anonimo' });

    expect(
      await screen.findByRole('heading', { name: 'Liga Abierta de Ajedrez Rápido' })
    ).toBeInTheDocument();

    // Cruces oficiales incluyen BYEs
    const byes = screen.getAllByText(/pasa por bye/i);
    expect(byes.length).toBeGreaterThan(0);

    // Recalcular
    const btnRecalcular = screen.getByTestId('btn-recalcular');
    await user.click(btnRecalcular);

    expect(await screen.findByTestId('banner-verificacion-exitosa')).toBeInTheDocument();
  });

  it('Un torneo sin el bracket sorteado avisa que todavía no hay sorteo', async () => {
    // Torneo 1 del catálogo simulado: con la inscripción abierta
    await renderRuta('/verificacion?tipo=torneo&id=1', { usuario: 'anonimo' });

    expect(await screen.findByTestId('error-consulta')).toHaveTextContent(
      /todavía no tiene el bracket sorteado/i
    );
  });

  it('El enlace en el Footer y en la navegación dirigen a /verificacion', async () => {
    await renderRuta('/', { usuario: 'anonimo' });

    const linkFooter = await screen.findByTestId('footer-link-verificacion');
    expect(linkFooter).toHaveAttribute('href', '/verificacion');

    const linksNav = screen.getAllByRole('link', { name: /verificación/i });
    expect(linksNav.length).toBeGreaterThan(0);
    expect(linksNav.some((l) => l.getAttribute('href') === '/verificacion')).toBe(true);
  });
});

describe('HU-504 / T504-3: Verificación de una rifa', () => {
  it('El link del resultado abre la rifa sorteada en el portal', async () => {
    await renderRuta('/verificacion?tipo=RIFA&id=10', { usuario: 'anonimo' });

    expect(await screen.findByText('Gran Rifa Benéfica de la Copa')).toBeInTheDocument();
    // el torneo asociado, en el encabezado de la rifa
    expect(
      screen.getByText('Copa PICA 2026 - Eliminación Directa', { selector: 'strong' })
    ).toBeInTheDocument();
  });

  it('Una rifa sin sortear avisa que todavía no se sorteó', async () => {
    await renderRuta('/verificacion?tipo=RIFA&id=99', { usuario: 'anonimo' });

    expect(await screen.findByTestId('error-consulta')).toBeInTheDocument();
  });

  it('Muestra la lista, el compromiso y la semilla, verifica los ganadores y detecta una alteración', async () => {
    const user = userEvent.setup();
    render(<VerificacionRifa datos={mockRifaVerificacion10} />);

    expect(screen.getByText('Gran Rifa Benéfica de la Copa')).toBeInTheDocument();
    expect(screen.getByTestId('compromiso-hash-rifa')).toHaveTextContent(
      mockRifaVerificacion10.compromisoHash
    );
    expect(screen.getByTestId('semilla-valor-rifa')).toHaveTextContent(
      mockRifaVerificacion10.semilla
    );
    expect(screen.getByTestId('lista-hash-rifa')).toHaveTextContent(/^059f/);
    // la semilla la genera la plataforma: todavía no hay firma (PICA-299)
    expect(screen.queryByTestId('semilla-firma-rifa')).not.toBeInTheDocument();

    const tabla = screen.getByTestId('tabla-ganadores-rifa');
    expect(within(tabla).getByText(/número 14/i)).toBeInTheDocument();
    expect(within(tabla).getByText(/número 88/i)).toBeInTheDocument();
    expect(within(tabla).getByText(/número 7$/i)).toBeInTheDocument();
    // y quién compró cada número ganador
    expect(within(tabla).getAllByText('mati_rios')).toHaveLength(2);
    expect(within(tabla).getByText('lucia.fer')).toBeInTheDocument();

    const btnRecalcular = screen.getByTestId('btn-recalcular-rifa');
    await user.click(btnRecalcular);

    expect(await screen.findByTestId('banner-verificacion-exitosa-rifa')).toBeInTheDocument();
    expect(screen.getAllByText('Coincide')).toHaveLength(3);

    // Alterar la lista de vendidos cambia el hash de la lista
    await user.click(screen.getByTestId('toggle-simulacion-rifa-btn'));
    await user.click(screen.getByTestId('btn-alterar-numeros-rifa'));
    await user.click(btnRecalcular);

    expect(await screen.findByTestId('banner-discrepancia-detectada-rifa')).toHaveTextContent(
      /la lista de números vendidos fue modificada/i
    );
  });
});
