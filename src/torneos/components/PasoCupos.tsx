import React from 'react';
import { CampoTorneo } from '../../api/torneoApi';
import { Field, Input } from '../../shared/ui';
import { participantes } from '../formato';
import { ErroresTorneo, FormTorneo } from '../validacion';

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
