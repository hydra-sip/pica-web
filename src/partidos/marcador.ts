import { ResultadoPayload } from '../api/partidoApi';

/** El marcador como lo tipea el capitán: texto, para que un campo vacío no sea un 0. */
export interface Marcador {
  local: string;
  visitante: string;
  penalesLocal: string;
  penalesVisitante: string;
}

export const MARCADOR_VACIO: Marcador = {
  local: '',
  visitante: '',
  penalesLocal: '',
  penalesVisitante: '',
};

export const esEmpate = (m: Marcador): boolean => m.local !== '' && m.local === m.visitante;

/** Lo mismo que valida el back al cargar u objetar: con empate, los penales definen un ganador. */
export const erroresDelMarcador = (m: Marcador): Record<string, string> => {
  const errores: Record<string, string> = {};
  const empate = esEmpate(m);
  if (m.local === '') errores.puntajeLocal = 'Es obligatorio.';
  if (m.visitante === '') errores.puntajeVisitante = 'Es obligatorio.';
  if (empate && m.penalesLocal === '') errores.penalesLocal = 'Con empate, se define por penales.';
  if (empate && m.penalesVisitante === '')
    errores.penalesVisitante = 'Con empate, se define por penales.';
  if (empate && m.penalesLocal !== '' && m.penalesLocal === m.penalesVisitante)
    errores.penalesVisitante = 'Los penales tienen que definir un ganador.';
  return errores;
};

const numero = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));

export const payloadDelMarcador = (m: Marcador): ResultadoPayload => {
  const empate = esEmpate(m);
  return {
    puntajeLocal: Number(m.local),
    puntajeVisitante: Number(m.visitante),
    penalesLocal: empate ? numero(m.penalesLocal) : null,
    penalesVisitante: empate ? numero(m.penalesVisitante) : null,
  };
};
