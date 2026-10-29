import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { clearSessionTokens } from '../api/httpClient';
import { reiniciarInscripciones } from '../mocks/inscripcionesHandlers';
import { resetPronosticosMock } from '../mocks/pronosticoHandlers';
import { resetTicketsMock } from '../mocks/ticketHandlers';
import { server } from '../mocks/server';
import { resetRealtime } from '../realtime/websocketService';

// Un pedido sin handler es un error de la prueba, no algo que se deja pasar.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  reiniciarInscripciones();
  resetPronosticosMock();
  resetTicketsMock();
  clearSessionTokens();
  localStorage.clear();
  resetRealtime();
});


afterAll(() => server.close());
