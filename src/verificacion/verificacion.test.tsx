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
    await expect(
      recalcularSorteoBracket('semilla', [{ id: 1, nombre: 'Solo' }])
    ).rejects.toThrow(/al menos dos inscripciones/i);
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

  it('recalcularSorteoRifa comprueba el hash de compromiso y asigna los ganadores en orden', async () => {
    const semilla = 'semilla-rifa-test';
    const compromiso = await calcularSha256(semilla);
    const numeros = [10, 20, 30, 40, 50];
    const premios = [
      { puesto: 1, descripcion: 'Premio 1', pct: 70 },
      { puesto: 2, descripcion: 'Premio 2', pct: 30 },
    ];

    const res = await recalcularSorteoRifa(semilla, compromiso, numeros, premios);
    expect(res.compromisoCoincide).toBe(true);
    expect(res.ganadores).toHaveLength(2);
    expect(res.ganadores[0].numeroGanador).not.toBeNull();
    expect(res.ganadores[1].numeroGanador).not.toBeNull();
    expect(res.ganadores[0].numeroGanador).not.toBe(res.ganadores[1].numeroGanador);
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

    // Las rifas todavía no tienen sorteo en el back
    await user.click(screen.getByTestId('tab-rifa'));
    expect(screen.getByTestId('rifas-sin-sorteo')).toHaveTextContent(
      /todavía no hay sorteos de rifa/i
    );
  });

  it('Criterio 2: Muestra la semilla utilizada, el hash de la lista sellada y el resultado obtenido', async () => {
    await renderRuta('/verificacion?tipo=torneo&id=5', { usuario: 'anonimo' });

    // 1. Semilla utilizada
    const semilla = await screen.findByTestId('semilla-valor');
    expect(semilla.textContent).toContain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    // 2. Hash de la lista sellada al cerrar la inscripción
    const lista = screen.getByTestId('lista-hash');
    expect(lista.textContent).toContain('b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78');

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

// La rifa no tiene todavía GET /rifas/{id}/sorteo (PICA-263): el componente se prueba con datos de ejemplo
describe('HU-505 / T505-1: Verificación de una rifa (componente)', () => {
  it('Muestra el compromiso, la semilla, su firma y los ganadores, y detecta una semilla alterada', async () => {
    const user = userEvent.setup();
    render(<VerificacionRifa datos={mockRifaVerificacion10} />);

    // Título y datos de la rifa
    expect(screen.getByText('Gran Rifa Benéfica de la Copa')).toBeInTheDocument();
    expect(screen.getByTestId('compromiso-hash-rifa')).toHaveTextContent(
      'c8b421037d30fe6404a753a3ca6fc9f8b2661ce18f66a1240004c7d429985b8f'
    );
    expect(screen.getByTestId('semilla-valor-rifa')).toHaveTextContent(
      'loteria-nacional-jugada-48921-sorteo-matutino-2026'
    );
    expect(screen.getByTestId('semilla-firma-rifa')).toHaveTextContent(/^3044/);
    expect(screen.getByTestId('lista-hash-rifa')).toHaveTextContent(/^5e88/);

    // Tabla con los ganadores oficiales
    const tabla = screen.getByTestId('tabla-ganadores-rifa');
    expect(within(tabla).getByText(/número 14/i)).toBeInTheDocument();
    expect(within(tabla).getByText(/número 59/i)).toBeInTheDocument();
    expect(within(tabla).getByText(/número 35/i)).toBeInTheDocument();

    // Recalcular con datos oficiales publicados
    const btnRecalcular = screen.getByTestId('btn-recalcular-rifa');
    await user.click(btnRecalcular);

    // Verificación 100% exitosa
    expect(await screen.findByTestId('banner-verificacion-exitosa-rifa')).toBeInTheDocument();
    expect(screen.getAllByText('Coincide')).toHaveLength(3);

    // Simular alteración de semilla en la rifa
    await user.click(screen.getByTestId('toggle-simulacion-rifa-btn'));
    await user.click(screen.getByTestId('btn-alterar-semilla-rifa'));
    await user.click(btnRecalcular);

    // Discrepancia detectada
    expect(await screen.findByTestId('banner-discrepancia-detectada-rifa')).toBeInTheDocument();
  });
});
