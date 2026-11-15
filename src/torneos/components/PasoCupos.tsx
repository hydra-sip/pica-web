import React from 'react';
import { CampoTorneo } from '../../api/torneoApi';
import { Field, Input } from '../../shared/ui';
import { participantes } from '../formato';
import { ErroresTorneo, FormTorneo, resumenGrupos } from '../validacion';

interface PasoCuposProps {
  form: FormTorneo;
  onCambio: (cambios: Partial<FormTorneo>) => void;
  errores: ErroresTorneo;
  habilitado: boolean;
  /** Los que ya no se pueden cambiar en un torneo publicado (HU-202). */
  bloqueados?: CampoTorneo[];
  /** Máximo de participantes que admite la plataforma (GET /torneos/opciones). */
  cupoTope: number;
}

const CUPOS_SUGERIDOS = [8, 16, 24, 32];

/** El 75 % del cupo, como sugiere el wireframe ("12 equipos confirmados (75% del cupo)"). */
const minimoSugerido = (cupo: number): number => Math.max(2, Math.ceil(cupo * 0.75));

/**
 * Paso 2, "Cupos" (wireframe "Wizard Creacion de Torneo - Paso 2"): cupo máximo, mínimo para iniciar y,
 * si se inscriben equipos, titulares y nómina máxima. Los árbitros van aparte, en ArbitrosTorneo.
 */
export const PasoCupos: React.FC<PasoCuposProps> = ({
  form,
  onCambio,
  errores,
  habilitado,
  bloqueados = [],
  cupoTope,
}) => {
  const puede = (campo: CampoTorneo) => habilitado && !bloqueados.includes(campo);
  const quienes = participantes(form.tipoParticipante);
  const cupo = Number(form.cupoMaximo);
  const sugerido = Number.isInteger(cupo) && cupo >= 2 ? minimoSugerido(cupo) : null;

  const elegirCupo = (valor: number) =>
    onCambio({
      cupoMaximo: String(valor),
      ...(form.cupoMinimo.trim() === '' && { cupoMinimo: String(minimoSugerido(valor)) }),
    });

  const numero = (campo: keyof FormTorneo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onCambio({ [campo]: e.target.value });

  return (
    <>
      <fieldset className="torneos-opciones">
        <legend>Cupo máximo de {quienes} *</legend>
        <div className="torneos-opciones-fila">
          {CUPOS_SUGERIDOS.filter((c) => c <= cupoTope).map((c) => (
            <button
              key={c}
              type="button"
              className="torneos-opcion"
              aria-pressed={form.cupoMaximo === String(c)}
              disabled={!puede('cupoMaximo')}
              onClick={() => elegirCupo(c)}
            >
              <span className="torneos-opcion-titulo">{c}</span>
              <span className="torneos-opcion-detalle">{quienes}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="torneos-grilla">
        <Field label="Otro cupo" hint={`Entre 2 y ${cupoTope}.`} error={errores.cupoMaximo}>
          <Input
            type="number"
            min={2}
            max={cupoTope}
            step={1}
            value={form.cupoMaximo}
            onChange={numero('cupoMaximo')}
            disabled={!puede('cupoMaximo')}
          />
        </Field>
        <Field
          label="Mínimo para iniciar"
          required
          hint={
            sugerido
              ? `Sugerido: ${sugerido} (75 % del cupo).`
              : `Al menos 2 ${quienes} confirmados.`
          }
          error={errores.cupoMinimo}
        >
          <Input
            type="number"
            min={2}
            step={1}
            value={form.cupoMinimo}
            onChange={numero('cupoMinimo')}
            disabled={!puede('cupoMinimo')}
          />
        </Field>
      </div>

      {form.formato === 'GRUPOS_Y_ELIMINACION' && (
        <ReglasDeGrupos form={form} errores={errores} numero={numero} puede={puede} />
      )}

      {form.tipoParticipante === 'EQUIPO' ? (
        <div className="torneos-grilla">
          <Field
            label="Titulares por equipo"
            required
            hint="Lo mínimo que tiene que tener la nómina."
            error={errores.tamanioEquipo}
          >
            <Input
              type="number"
              min={1}
              step={1}
              value={form.tamanioEquipo}
              onChange={numero('tamanioEquipo')}
              disabled={!puede('tamanioEquipo')}
            />
          </Field>
          <Field
            label="Nómina máxima"
            required
            hint="Titulares más suplentes."
            error={errores.nominaMaxima}
          >
            <Input
              type="number"
              min={1}
              step={1}
              value={form.nominaMaxima}
              onChange={numero('nominaMaxima')}
              disabled={!puede('nominaMaxima')}
            />
          </Field>
        </div>
      ) : (
        form.tipoParticipante === '' && (
          <div className="alerta alerta-info" role="status">
            En el paso 1 elegí si se inscriben jugadores o equipos.
          </div>
        )
      )}
    </>
  );
};

/**
 * Las reglas de la fase de grupos (CR-02): tamaño, cuántos pasan y los puntos. Quedan selladas al publicar. Abajo, cómo
 * queda el torneo con el cupo elegido.
 */
const ReglasDeGrupos: React.FC<{
  form: FormTorneo;
  errores: ErroresTorneo;
  numero: (campo: keyof FormTorneo) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  puede: (campo: CampoTorneo) => boolean;
}> = ({ form, errores, numero, puede }) => {
  const resumen = resumenGrupos(form);
  const editable = puede('reglasGrupos');
  return (
    <fieldset className="torneos-opciones">
      <legend>Fase de grupos</legend>
      <div className="torneos-grilla">
        <Field label="Integrantes por grupo" required hint="De 3 a 8." error={errores.tamanioGrupo}>
          <Input
            type="number"
            min={3}
            max={8}
            step={1}
            value={form.tamanioGrupo}
            onChange={numero('tamanioGrupo')}
            disabled={!editable}
          />
        </Field>
        <Field
          label="Pasan a la llave por grupo"
          required
          hint="Los primeros de cada grupo."
          error={errores.clasificanPorGrupo}
        >
          <Input
            type="number"
            min={1}
            step={1}
            value={form.clasificanPorGrupo}
            onChange={numero('clasificanPorGrupo')}
            disabled={!editable}
          />
        </Field>
        <Field label="Puntos por ganar" required error={errores.puntosVictoria}>
          <Input
            type="number"
            min={1}
            max={10}
            step={1}
            value={form.puntosVictoria}
            onChange={numero('puntosVictoria')}
            disabled={!editable}
          />
        </Field>
        <Field
          label="Puntos por empatar"
          required
          hint="En grupos se puede empatar; perder da 0."
          error={errores.puntosEmpate}
        >
          <Input
            type="number"
            min={0}
            step={1}
            value={form.puntosEmpate}
            onChange={numero('puntosEmpate')}
            disabled={!editable}
          />
        </Field>
      </div>
      <p className="torneos-ayuda">
        {resumen
          ? `Con este cupo: ${resumen.grupos} grupos y ${resumen.aLaLlave} pasan a la llave, con cruces fijos (1A–2B, 1B–2A…). `
          : 'El cupo máximo tiene que ser múltiplo de los integrantes por grupo. '}
        Desempate: puntos, resultado entre sí, partidos ganados y, si sigue, partido de desempate.
      </p>
    </fieldset>
  );
};
