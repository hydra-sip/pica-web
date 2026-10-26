import React, { useState } from 'react';
import { DisciplinaOpcion, OpcionesTorneo, TorneoInformacion } from '../../api/torneoApi';
import { Button, Field, Input, Textarea } from '../../shared/ui';
import { ErroresTorneo, FormTorneo, MAX_REGLAMENTO } from '../validacion';
import { ReglamentoPdf } from './ReglamentoPdf';

interface PasoInformacionProps {
  form: FormTorneo;
  onCambio: (cambios: Partial<FormTorneo>) => void;
  errores: ErroresTorneo;
  /** false en solo lectura o mientras se guarda. */
  habilitado: boolean;
  opciones: OpcionesTorneo;
  /** Canchas que ya existen en la sede escrita. */
  sugerenciasCanchas: string[];
  /** Null hasta guardar el primer borrador; hace falta para subir el PDF. */
  torneo: TorneoInformacion | null;
  onTorneo: (torneo: TorneoInformacion) => void;
}

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Leyenda, botones y error de un grupo de opciones (deporte, formato, modalidad...). */
const Grupo: React.FC<{
  leyenda: string;
  error?: string;
  fila?: boolean;
  children: React.ReactNode;
}> = ({ leyenda, error, fila, children }) => (
  <fieldset className="torneos-opciones">
    <legend>{leyenda}</legend>
    <div className={fila ? 'torneos-opciones-fila' : 'torneos-opciones-grilla'}>{children}</div>
    {error && (
      <p className="torneos-opciones-error" role="alert">
        {error}
      </p>
    )}
  </fieldset>
);

const Opcion: React.FC<{
  elegida: boolean;
  onElegir: () => void;
  disabled?: boolean;
  titulo: string;
  detalle?: string;
}> = ({ elegida, onElegir, disabled, titulo, detalle }) => (
  <button
    type="button"
    className="torneos-opcion"
    aria-pressed={elegida}
    disabled={disabled}
    onClick={onElegir}
  >
    <span className="torneos-opcion-titulo">{titulo}</span>
    {detalle && <span className="torneos-opcion-detalle">{detalle}</span>}
  </button>
);

/**
 * Paso 1, "Información y formato" (wireframe "Wizard Creacion de Torneo - Paso 1"): nombre, deporte,
 * formato, modalidad, quién se inscribe, sede y canchas, fechas y reglamento. Elegir un deporte sugerido
 * completa sus valores por defecto, que se pueden cambiar.
 */
export const PasoInformacion: React.FC<PasoInformacionProps> = ({
  form,
  onCambio,
  errores,
  habilitado,
  opciones,
  sugerenciasCanchas,
  torneo,
  onTorneo,
}) => {
  const sugerida = opciones.disciplinas.find((d) => igual(d.nombre, form.disciplina));
  const [otroElegido, setOtroElegido] = useState(false);
  const otro = otroElegido || (form.disciplina.trim() !== '' && !sugerida);
  const [nuevaCancha, setNuevaCancha] = useState('');

  const elegirDisciplina = (d: DisciplinaOpcion) => {
    setOtroElegido(false);
    onCambio({
      disciplina: d.nombre,
      modalidad: d.modalidad,
      tipoParticipante: d.tipoParticipante,
      tamanioEquipo: d.tamanioEquipo === null ? '' : String(d.tamanioEquipo),
      nominaMaxima: d.nominaMaxima === null ? '' : String(d.nominaMaxima),
    });
  };

  const elegirOtro = () => {
    setOtroElegido(true);
    if (sugerida) onCambio({ disciplina: '' });
  };

  const agregarCancha = () => {
    const nombre = nuevaCancha.trim();
    if (nombre && !form.canchas.some((c) => igual(c, nombre))) {
      onCambio({ canchas: [...form.canchas, nombre] });
    }
    setNuevaCancha('');
  };

  const texto =
    (campo: keyof FormTorneo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onCambio({ [campo]: e.target.value });

  const presencial = form.modalidad !== 'ONLINE';
  const sugeridasLibres = sugerenciasCanchas.filter((s) => !form.canchas.some((c) => igual(c, s)));

  return (
    <>
      <Field label="Nombre del torneo" required error={errores.nombre}>
        <Input
          value={form.nombre}
          onChange={texto('nombre')}
          disabled={!habilitado}
          maxLength={100}
          placeholder="Torneo Apertura F5 2026"
        />
      </Field>

      <Grupo leyenda="Deporte *" error={errores.disciplina}>
        {opciones.disciplinas.map((d) => (
          <Opcion
            key={d.nombre}
            elegida={!otro && sugerida?.nombre === d.nombre}
            onElegir={() => elegirDisciplina(d)}
            disabled={!habilitado}
            titulo={d.nombre}
            detalle={d.reglas}
          />
        ))}
        <Opcion
          elegida={otro}
          onElegir={elegirOtro}
          disabled={!habilitado}
          titulo="Otro"
          detalle="Cualquier deporte o juego"
        />
      </Grupo>
      {otro && (
        <Field label="¿Qué deporte o juego?" required>
          <Input
            value={form.disciplina}
            onChange={texto('disciplina')}
            disabled={!habilitado}
            maxLength={50}
            placeholder="Truco, Hockey, Counter-Strike..."
          />
        </Field>
      )}

      <Grupo leyenda="Formato de competencia" fila>
        {opciones.formatos.map((f) => (
          <Opcion
            key={f.codigo}
            elegida={f.disponible}
            onElegir={() => undefined}
            disabled={!habilitado || !f.disponible}
            titulo={f.nombre}
            detalle={f.disponible ? undefined : 'Próximamente'}
          />
        ))}
      </Grupo>

      <div className="torneos-grilla">
        <Grupo leyenda="Modalidad *" error={errores.modalidad} fila>
          <Opcion
            elegida={form.modalidad === 'PRESENCIAL'}
            onElegir={() => onCambio({ modalidad: 'PRESENCIAL' })}
            disabled={!habilitado}
            titulo="Presencial"
          />
          <Opcion
            elegida={form.modalidad === 'ONLINE'}
            onElegir={() => onCambio({ modalidad: 'ONLINE' })}
            disabled={!habilitado}
            titulo="Online"
          />
        </Grupo>
        <Grupo leyenda="Se inscriben *" error={errores.tipoParticipante} fila>
          <Opcion
            elegida={form.tipoParticipante === 'INDIVIDUAL'}
            onElegir={() => onCambio({ tipoParticipante: 'INDIVIDUAL' })}
            disabled={!habilitado}
            titulo="Jugadores"
          />
          <Opcion
            elegida={form.tipoParticipante === 'EQUIPO'}
            onElegir={() => onCambio({ tipoParticipante: 'EQUIPO' })}
            disabled={!habilitado}
            titulo="Equipos"
          />
        </Grupo>
      </div>

      {presencial && (
        <div className="torneos-grilla">
          <Field
            label="Sede y dirección"
            required={form.modalidad === 'PRESENCIAL'}
            error={errores.sede}
          >
            <Input
              value={form.sede}
              onChange={texto('sede')}
              disabled={!habilitado}
              maxLength={255}
              placeholder="Club Mercedes — Av. 29 N° 850, Mercedes"
            />
          </Field>
          <Field
            label="Canchas habilitadas"
            hint={
              habilitado
                ? 'Escribí el nombre y apretá Enter. Podés dejarlas para después.'
                : undefined
            }
          >
            <div>
              {form.canchas.length > 0 && (
                <div className="torneos-canchas">
                  {form.canchas.map((c) => (
                    <span key={c} className="torneos-cancha">
                      {c}
                      {habilitado && (
                        <button
                          type="button"
                          aria-label={`Quitar ${c}`}
                          onClick={() => onCambio({ canchas: form.canchas.filter((x) => x !== c) })}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {habilitado && (
                <div className="torneos-cancha-nueva">
                  <Input
                    value={nuevaCancha}
                    onChange={(e) => setNuevaCancha(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        agregarCancha();
                      }
                    }}
                    maxLength={100}
                    list="torneo-canchas-sugeridas"
                    placeholder="Cancha 1"
                    aria-label="Nueva cancha"
                  />
                  <Button
                    variant="secondary"
                    onClick={agregarCancha}
                    disabled={!nuevaCancha.trim()}
                  >
                    Agregar
                  </Button>
                  <datalist id="torneo-canchas-sugeridas">
                    {sugeridasLibres.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>
          </Field>
        </div>
      )}

      <div className="torneos-grilla">
        <Field label="Fecha de inicio" required error={errores.fechaInicio}>
          <Input
            type="datetime-local"
            value={form.fechaInicio}
            onChange={texto('fechaInicio')}
            disabled={!habilitado}
          />
        </Field>
        <Field label="Fecha estimada de fin" error={errores.fechaFin}>
          <Input
            type="datetime-local"
            value={form.fechaFin}
            onChange={texto('fechaFin')}
            disabled={!habilitado}
          />
        </Field>
        <Field label="Fecha límite de inscripción" required error={errores.cierreInscripcionEn}>
          <Input
            type="datetime-local"
            value={form.cierreInscripcionEn}
            onChange={texto('cierreInscripcionEn')}
            disabled={!habilitado}
          />
        </Field>
      </div>

      <div className="torneos-grilla">
        <Field
          label="Reglamento y pautas operativas (lo ven los inscriptos)"
          required={!torneo?.reglamentoUrl}
          error={errores.reglamentoTexto}
        >
          <div>
            <Textarea
              rows={7}
              value={form.reglamentoTexto}
              onChange={texto('reglamentoTexto')}
              disabled={!habilitado}
              maxLength={MAX_REGLAMENTO}
              placeholder={
                '1. Partidos de dos tiempos de 20 minutos.\n2. Tolerancia máxima de espera: 15 minutos.'
              }
            />
            <span className="torneos-contador">
              {form.reglamentoTexto.length} / {MAX_REGLAMENTO} caracteres
            </span>
          </div>
        </Field>
        <ReglamentoPdf torneo={torneo} habilitado={habilitado} onTorneo={onTorneo} />
      </div>
    </>
  );
};
