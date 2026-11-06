import { describe, expect, it } from 'vitest';
import { mensajeDeError } from '../shared/mensajesError';
import { MENSAJES_PASO_1, mensajeJugadorYaInscripto } from './mensajesInscripcion';

const MI_ID = 7;

const conflicto = (extra: Record<string, unknown> = {}) => ({
  problemDetail: { status: 409, codigo: 'JUGADOR_YA_INSCRIPTO', ...extra },
});

const JUAN = { id: 9, username: 'juanp', nombres: 'Juan', apellidos: 'Pérez' };

describe('mensajeJugadorYaInscripto (CE4-4)', () => {
  it('nombra al jugador que ya figura en otra inscripción', () => {
    expect(mensajeJugadorYaInscripto(conflicto({ jugador: JUAN }), MI_ID)).toBe(
      'Juan Pérez (@juanp) ya figura en otra inscripción de este torneo. Elegí a otro jugador.'
    );
  });

  it('si el repetido es el capitán, le habla a él', () => {
    expect(mensajeJugadorYaInscripto(conflicto({ jugador: { ...JUAN, id: MI_ID } }), MI_ID)).toBe(
      'Ya figurás en otra inscripción de este torneo.'
    );
  });

  it('sin jugador, o con otro código, deja el mensaje general', () => {
    expect(mensajeJugadorYaInscripto(conflicto(), MI_ID)).toBeUndefined();
    expect(
      mensajeJugadorYaInscripto(
        { problemDetail: { status: 409, codigo: 'CUPO_COMPLETO', jugador: JUAN } },
        MI_ID
      )
    ).toBeUndefined();
    expect(mensajeJugadorYaInscripto(new Error('otro'), MI_ID)).toBeUndefined();
  });
});

describe('mensajes del paso 1', () => {
  it('al organizador o a un árbitro le explica por qué no se inscribe y dónde lo gestiona', () => {
    const err = { problemDetail: { status: 403, codigo: 'INSCRIPCION_NO_PERMITIDA_EN_TORNEO' } };

    expect(mensajeDeError(err, 'No se pudo guardar.', MENSAJES_PASO_1)).toBe(
      'Sos el organizador o árbitro de este torneo: no podés inscribirte. Lo gestionás desde la consola.'
    );
  });
});
