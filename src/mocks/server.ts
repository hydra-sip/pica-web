import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Mismo conjunto de handlers que el modo desarrollo (browser.ts), para correr las pruebas en Node.
export const server = setupServer(...handlers);
