import {
  InformacionTorneoPayload,
  Modalidad,
  TipoParticipante,
  TorneoInformacion,
} from '../api/torneoApi';
import { inputLocalAIso, isoAInputLocal } from '../shared/formato';

/** Lo que editan los pasos 1 y 2, como lo tienen los inputs. */
export interface FormTorneo {
  nombre: string;
  disciplina: string;
  modalidad: Modalidad | '';
  tipoParticipante: TipoParticipante | '';
  sede: string;
  canchas: string[];
  fechaInicio: string;
  fechaFin: string;
  cierreInscripcionEn: string;
  reglamentoTexto: string;
  cupoMaximo: string;
  cupoMinimo: string;
  tamanioEquipo: string;
  nominaMaxima: string;
}

export type ErroresTorneo = Partial<Record<keyof FormTorneo, string>>;

export const MAX_REGLAMENTO = 2000;
const CUPO_MINIMO = 2;

const texto = (n: number | null): string => (n === null ? '' : String(n));

export const desdeTorneo = (t: TorneoInformacion | null): FormTorneo => ({
  nombre: t?.nombre ?? '',
  disciplina: t?.disciplina ?? '',
  modalidad: t?.modalidad ?? '',
  tipoParticipante: t?.tipoParticipante ?? '',
  sede: t?.sede ?? '',
  canchas: t?.canchas ?? [],
  fechaInicio: isoAInputLocal(t?.fechaInicio ?? null),
  fechaFin: isoAInputLocal(t?.fechaFin ?? null),
  cierreInscripcionEn: isoAInputLocal(t?.cierreInscripcionEn ?? null),
  reglamentoTexto: t?.reglamentoTexto ?? '',
  cupoMaximo: texto(t?.cupoMaximo ?? null),
  cupoMinimo: texto(t?.cupoMinimo ?? null),
  tamanioEquipo: texto(t?.tamanioEquipo ?? null),
  nominaMaxima: texto(t?.nominaMaxima ?? null),
});

/** Vacío es null; lo que no es número queda NaN y no pasa Number.isInteger. */
const numero = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));

/** Online no lleva sede ni canchas; individual no lleva tamaño ni nómina. */
export const aPayload = (f: FormTorneo): InformacionTorneoPayload => {
  const presencial = f.modalidad !== 'ONLINE';
  const porEquipos = f.tipoParticipante === 'EQUIPO';
  return {
    nombre: f.nombre.trim(),
    disciplina: f.disciplina.trim(),
    formato: 'ELIMINACION_DIRECTA',
    modalidad: f.modalidad || null,
    tipoParticipante: f.tipoParticipante || null,
    sede: presencial ? f.sede.trim() || null : null,
    canchas: presencial ? f.canchas : [],
    fechaInicio: inputLocalAIso(f.fechaInicio),
    fechaFin: inputLocalAIso(f.fechaFin),
    cierreInscripcionEn: inputLocalAIso(f.cierreInscripcionEn),
    reglamentoTexto: f.reglamentoTexto.trim() || null,
    cupoMaximo: numero(f.cupoMaximo),
    cupoMinimo: numero(f.cupoMinimo),
    tamanioEquipo: porEquipos ? numero(f.tamanioEquipo) : null,
    nominaMaxima: porEquipos ? numero(f.nominaMaxima) : null,
  };
};

/**
 * Lo que el back exige para guardar el borrador: nombre y disciplina, y que lo cargado sea coherente
 * (las mismas reglas que InformacionTorneoRequest en el contrato).
 */
export const validarBorrador = (f: FormTorneo, cupoTope: number): ErroresTorneo => {
  const errores: ErroresTorneo = {};
  if (!f.nombre.trim()) errores.nombre = 'Poné el nombre del torneo.';
  if (!f.disciplina.trim()) errores.disciplina = 'Elegí el deporte o escribí cuál es.';
  if (f.reglamentoTexto.trim().length > MAX_REGLAMENTO) {
    errores.reglamentoTexto = `No puede superar los ${MAX_REGLAMENTO} caracteres.`;
  }
  if (f.modalidad === 'PRESENCIAL' && !f.sede.trim()) {
    errores.sede = 'Un torneo presencial necesita sede.';
  }

  const ahora = Date.now();
  const inicio = f.fechaInicio ? new Date(f.fechaInicio).getTime() : null;
  const fin = f.fechaFin ? new Date(f.fechaFin).getTime() : null;
  const cierre = f.cierreInscripcionEn ? new Date(f.cierreInscripcionEn).getTime() : null;
  if (inicio !== null && inicio <= ahora) errores.fechaInicio = 'Tiene que ser una fecha futura.';
  if (inicio !== null && fin !== null && fin < inicio) {
    errores.fechaFin = 'No puede ser anterior al inicio.';
  }
  if (cierre !== null && cierre <= ahora) {
    errores.cierreInscripcionEn = 'Tiene que ser una fecha futura.';
  } else if (cierre !== null && inicio !== null && cierre > inicio) {
    errores.cierreInscripcionEn = 'La inscripción tiene que cerrar antes del inicio.';
  }

  const maximo = numero(f.cupoMaximo);
  const minimo = numero(f.cupoMinimo);
  if (maximo !== null && (!Number.isInteger(maximo) || maximo < CUPO_MINIMO || maximo > cupoTope)) {
    errores.cupoMaximo = `Tiene que ser entre ${CUPO_MINIMO} y ${cupoTope}.`;
  }
  if (minimo !== null && (!Number.isInteger(minimo) || minimo < CUPO_MINIMO)) {
    errores.cupoMinimo = `Hacen falta al menos ${CUPO_MINIMO} para iniciar.`;
  } else if (minimo !== null && maximo !== null && !errores.cupoMaximo && minimo > maximo) {
    errores.cupoMinimo = 'No puede ser mayor que el cupo máximo.';
  }

  if (f.tipoParticipante === 'EQUIPO') {
    const tamanio = numero(f.tamanioEquipo);
    const nomina = numero(f.nominaMaxima);
    if (tamanio !== null && (!Number.isInteger(tamanio) || tamanio < 1)) {
      errores.tamanioEquipo = 'Tiene que ser 1 o más.';
    }
    if (nomina !== null && (!Number.isInteger(nomina) || nomina < 1)) {
      errores.nominaMaxima = 'Tiene que ser 1 o más.';
    } else if (tamanio !== null && nomina !== null && !errores.tamanioEquipo && nomina < tamanio) {
      errores.nominaMaxima = 'No puede ser menor que los titulares.';
    }
  }
  return errores;
};

/**
 * Para pasar de paso: además de lo del borrador, que el paso esté completo. Con el PDF subido (`conPdf`) el
 * reglamento escrito es opcional.
 */
export const validarPaso = (
  paso: 1 | 2,
  f: FormTorneo,
  cupoTope: number,
  conPdf = false
): ErroresTorneo => {
  const errores = validarBorrador(f, cupoTope);
  const falta = (campo: keyof FormTorneo, mensaje: string) => {
    if (!errores[campo]) errores[campo] = mensaje;
  };
  if (paso === 1) {
    if (!f.modalidad) falta('modalidad', 'Elegí si es presencial u online.');
    if (!f.tipoParticipante)
      falta('tipoParticipante', 'Elegí si se inscriben jugadores o equipos.');
    if (!f.fechaInicio) falta('fechaInicio', 'Poné la fecha de inicio.');
    if (!f.cierreInscripcionEn) falta('cierreInscripcionEn', 'Poné hasta cuándo se inscriben.');
    if (!f.reglamentoTexto.trim() && !conPdf)
      falta('reglamentoTexto', 'Escribí el reglamento o adjuntá el PDF.');
  } else {
    if (!f.cupoMaximo.trim()) falta('cupoMaximo', 'Elegí el cupo.');
    if (!f.cupoMinimo.trim()) falta('cupoMinimo', 'Poné el mínimo para iniciar.');
    if (f.tipoParticipante === 'EQUIPO') {
      if (!f.tamanioEquipo.trim())
        falta('tamanioEquipo', 'Poné cuántos titulares tiene cada equipo.');
      if (!f.nominaMaxima.trim()) falta('nominaMaxima', 'Poné el máximo de la nómina.');
    }
  }
  return errores;
};

/** Los campos de cada paso, para saber a cuál ir cuando el back marca un error. */
export const CAMPOS_PASO_2: (keyof FormTorneo)[] = [
  'cupoMaximo',
  'cupoMinimo',
  'tamanioEquipo',
  'nominaMaxima',
];
