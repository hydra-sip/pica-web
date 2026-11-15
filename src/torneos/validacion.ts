import {
  Formato,
  InformacionTorneoPayload,
  Modalidad,
  REGLAS_GRUPOS_POR_DEFECTO,
  TipoParticipante,
  TorneoInformacion,
} from '../api/torneoApi';
import { inputLocalAIso, isoAInputLocal } from '../shared/formato';

/** Lo que editan los pasos 1 y 2, como lo tienen los inputs. */
export interface FormTorneo {
  nombre: string;
  disciplina: string;
  formato: Formato;
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
  /** Las reglas de la fase de grupos (CR-02): solo cuentan con GRUPOS_Y_ELIMINACION. */
  tamanioGrupo: string;
  clasificanPorGrupo: string;
  puntosVictoria: string;
  puntosEmpate: string;
}

export type ErroresTorneo = Partial<Record<keyof FormTorneo, string>>;

export const MAX_REGLAMENTO = 2000;
const CUPO_MINIMO = 2;

const texto = (n: number | null): string => (n === null ? '' : String(n));

export const desdeTorneo = (t: TorneoInformacion | null): FormTorneo => ({
  nombre: t?.nombre ?? '',
  disciplina: t?.disciplina ?? '',
  formato: t?.formato ?? 'ELIMINACION_DIRECTA',
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
  tamanioGrupo: String((t?.reglasGrupos ?? REGLAS_GRUPOS_POR_DEFECTO).tamanioGrupo),
  clasificanPorGrupo: String((t?.reglasGrupos ?? REGLAS_GRUPOS_POR_DEFECTO).clasificanPorGrupo),
  puntosVictoria: String((t?.reglasGrupos ?? REGLAS_GRUPOS_POR_DEFECTO).puntosVictoria),
  puntosEmpate: String((t?.reglasGrupos ?? REGLAS_GRUPOS_POR_DEFECTO).puntosEmpate),
});

/** Vacío es null; lo que no es número queda NaN y no pasa Number.isInteger. */
const numero = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));

/**
 * El input datetime-local llega hasta los minutos: si no se tocó, va la fecha guardada tal cual, para que el back
 * no la vea cambiada (en un torneo publicado eso puede estar bloqueado).
 */
const fecha = (valor: string, guardada: string | null | undefined): string | null =>
  guardada && valor === isoAInputLocal(guardada) ? guardada : inputLocalAIso(valor);

/**
 * Online no lleva sede ni canchas; individual no lleva tamaño ni nómina. `guardado`: el torneo como está, para no
 * perder lo que el formulario no muestra (la descripción) ni la precisión de las fechas.
 */
export const aPayload = (
  f: FormTorneo,
  guardado?: TorneoInformacion | null
): InformacionTorneoPayload => {
  const presencial = f.modalidad !== 'ONLINE';
  const porEquipos = f.tipoParticipante === 'EQUIPO';
  return {
    nombre: f.nombre.trim(),
    disciplina: f.disciplina.trim(),
    descripcion: guardado?.descripcion ?? null,
    formato: f.formato,
    reglasGrupos:
      f.formato === 'GRUPOS_Y_ELIMINACION'
        ? {
            tamanioGrupo: Number(f.tamanioGrupo),
            clasificanPorGrupo: Number(f.clasificanPorGrupo),
            puntosVictoria: Number(f.puntosVictoria),
            puntosEmpate: Number(f.puntosEmpate),
          }
        : null,
    modalidad: f.modalidad || null,
    tipoParticipante: f.tipoParticipante || null,
    sede: presencial ? f.sede.trim() || null : null,
    canchas: presencial ? f.canchas : [],
    fechaInicio: fecha(f.fechaInicio, guardado?.fechaInicio),
    fechaFin: fecha(f.fechaFin, guardado?.fechaFin),
    cierreInscripcionEn: fecha(f.cierreInscripcionEn, guardado?.cierreInscripcionEn),
    reglamentoTexto: f.reglamentoTexto.trim() || null,
    cupoMaximo: numero(f.cupoMaximo),
    cupoMinimo: numero(f.cupoMinimo),
    tamanioEquipo: porEquipos ? numero(f.tamanioEquipo) : null,
    nominaMaxima: porEquipos ? numero(f.nominaMaxima) : null,
  };
};

/** Lo que fija la plataforma, de GET /torneos/opciones. */
export interface LimitesTorneo {
  cupoTope: number;
  /** Minutos que tienen que pasar como mínimo entre el cierre de la inscripción y el inicio. */
  margenCierreInicioMin: number;
}

const MIN_POR_HORA = 60;
const MS_POR_MINUTO = 60_000;

/** 60 → "1 h", 90 → "90 min", como el mensaje del back. */
export const textoMargen = (minutos: number): string =>
  minutos > 0 && minutos % MIN_POR_HORA === 0 ? `${minutos / MIN_POR_HORA} h` : `${minutos} min`;

/**
 * Lo que el back exige para guardar el borrador: nombre y disciplina, y que lo cargado sea coherente
 * (las mismas reglas que InformacionTorneoRequest en el contrato).
 */
export const validarBorrador = (
  f: FormTorneo,
  { cupoTope, margenCierreInicioMin }: LimitesTorneo,
  original?: FormTorneo
): ErroresTorneo => {
  const errores: ErroresTorneo = {};
  // De un torneo publicado se mira que sea futura solo la fecha que cambia: el cierre puede haber pasado ya.
  const cambia = (campo: keyof FormTorneo) => !original || f[campo] !== original[campo];
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
  if (inicio !== null && cambia('fechaInicio') && inicio <= ahora) {
    errores.fechaInicio = 'Tiene que ser una fecha futura.';
  }
  if (inicio !== null && fin !== null && fin < inicio) {
    errores.fechaFin = 'No puede ser anterior al inicio.';
  }
  if (cierre !== null && cambia('cierreInscripcionEn') && cierre <= ahora) {
    errores.cierreInscripcionEn = 'Tiene que ser una fecha futura.';
  } else if (cierre !== null && inicio !== null && cierre > inicio) {
    errores.cierreInscripcionEn = 'La inscripción tiene que cerrar antes del inicio.';
  } else if (
    cierre !== null &&
    inicio !== null &&
    (cambia('cierreInscripcionEn') || cambia('fechaInicio')) &&
    cierre + margenCierreInicioMin * MS_POR_MINUTO > inicio
  ) {
    errores.cierreInscripcionEn = `La inscripción tiene que cerrar al menos ${textoMargen(
      margenCierreInicioMin
    )} antes del inicio, para programar los partidos y el check-in.`;
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

  if (f.formato === 'GRUPOS_Y_ELIMINACION') {
    Object.assign(errores, erroresDeGrupos(f, maximo, minimo, !errores.cupoMaximo));
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

/** Cuántos grupos salen y cuántos pasan a la llave con ese cupo; null si las reglas no cierran. */
export const resumenGrupos = (
  f: FormTorneo
): { grupos: number; aLaLlave: number; necesarios: number } | null => {
  const tamanio = numero(f.tamanioGrupo);
  const pasan = numero(f.clasificanPorGrupo);
  const cupo = numero(f.cupoMaximo);
  if (!tamanio || !pasan || !cupo || cupo % tamanio !== 0) return null;
  const grupos = cupo / tamanio;
  return { grupos, aLaLlave: grupos * pasan, necesarios: grupos * (pasan + 1) };
};

const esPotenciaDeDos = (n: number): boolean => n >= 2 && (n & (n - 1)) === 0;

/** Lo mismo que valida el back para la fase de grupos (CR-02): rangos y lo que piden del cupo. */
const erroresDeGrupos = (
  f: FormTorneo,
  maximo: number | null,
  minimo: number | null,
  cupoValido: boolean
): ErroresTorneo => {
  const errores: ErroresTorneo = {};
  const tamanio = numero(f.tamanioGrupo);
  const pasan = numero(f.clasificanPorGrupo);
  const victoria = numero(f.puntosVictoria);
  const empate = numero(f.puntosEmpate);
  if (tamanio === null || !Number.isInteger(tamanio) || tamanio < 3 || tamanio > 8) {
    errores.tamanioGrupo = 'Tiene que ser entre 3 y 8.';
  } else if (pasan === null || !Number.isInteger(pasan) || pasan < 1 || pasan >= tamanio) {
    errores.clasificanPorGrupo = 'Tiene que pasar al menos 1 y menos que los del grupo.';
  }
  if (victoria === null || !Number.isInteger(victoria) || victoria < 1 || victoria > 10) {
    errores.puntosVictoria = 'Tiene que ser entre 1 y 10.';
  } else if (empate === null || !Number.isInteger(empate) || empate < 0 || empate >= victoria) {
    errores.puntosEmpate = 'Tiene que ser menos que por ganar.';
  }
  if (Object.keys(errores).length > 0 || maximo === null || !cupoValido) return errores;
  const resumen = resumenGrupos(f);
  if (!resumen) {
    errores.cupoMaximo = `Tiene que ser múltiplo de ${tamanio}, para que los grupos queden completos.`;
    return errores;
  }
  if (!esPotenciaDeDos(resumen.aLaLlave)) {
    errores.clasificanPorGrupo = `Con ${resumen.grupos} grupos pasan ${resumen.aLaLlave} a la llave: tienen que ser 2, 4, 8, 16…`;
  }
  if (minimo !== null && minimo <= maximo && minimo < resumen.necesarios) {
    errores.cupoMinimo = `Con ${resumen.grupos} grupos hacen falta al menos ${resumen.necesarios}: en cada grupo, uno más que los que pasan.`;
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
  limites: LimitesTorneo,
  conPdf = false
): ErroresTorneo => {
  const errores = validarBorrador(f, limites);
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
  'tamanioGrupo',
  'clasificanPorGrupo',
  'puntosVictoria',
  'puntosEmpate',
  'tamanioEquipo',
  'nominaMaxima',
];
