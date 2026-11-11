import { setupServer } from 'msw/node';
import { cadenaHandlers } from './cadenaHandlers';
import { handlers } from './handlers';

// Mismo conjunto de handlers que el modo desarrollo (browser.ts), para correr las pruebas en Node, más el
// nodo de Base Sepolia: en el navegador, la carga con cripto va a la red de verdad.
export const server = setupServer(...handlers, ...cadenaHandlers);
