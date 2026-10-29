import React, { useState } from 'react';
import {
  CheckinTorneoPayload,
  CriterioSinPresentes,
  torneoApi,
  TorneoInformacion,
} from '../../api/torneoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Button, Field, Input } from '../../shared/ui';

/** Los textos de los códigos de campo que en esta tarjeta dicen algo propio. */
const PROPIOS = {
  RANGO_INVALIDO: 'Tiene que ser mayor que 0.',
  VENTANA_INVALIDA:
    'No puede durar más que los minutos de anticipación: tiene que cerrar antes del partido.',
};

/** Las dos opciones si no se presenta ninguno de los dos (HU-309), con lo que hace cada una. */
const CRITERIOS: { valor: CriterioSinPresentes; titulo: string; detalle: string }[] = [
  {
    valor: 'REPROGRAMAR',
    titulo: 'Reprogramar',
    detalle: 'El partido queda sin fecha y le ponés una nueva.',
  },
  {
    valor: 'DESCALIFICAR_AMBOS',
    titulo: 'Descalificar a los dos',
    detalle:
      'Ninguno pasa y el rival de la ronda siguiente avanza sin jugar. En la final, o si el otro cruce ya quedó vacante, se reprograma.',
  },
];

const dos = (n: number): string => String(n).padStart(2, '0');

/** Los minutos después de las 18:00 (o antes, si son negativos) como `17:30`. */
const hora = (minutosDesde18: number): string => {
  const total = (18 * 60 + minutosDesde18 + 24 * 60) % (24 * 60);
  return `${dos(Math.floor(total / 60))}:${dos(total % 60)}`;
};

/** "Un partido a las 18:00 abre el check-in a las 17:30 y lo cierra a las 17:50", si los números sirven. */
const ejemplo = ({ minAntes, duracion }: CheckinTorneoPayload): string | null =>
  minAntes && duracion && minAntes > 0 && duracion > 0 && duracion <= minAntes
    ? `Un partido a las 18:00 abre el check-in a las ${hora(-minAntes)} y lo cierra a las ${hora(duracion - minAntes)}.`
    : null;

const aNumero = (valor: string): number | null => (valor === '' ? null : Number(valor));

interface CheckinTorneoProps {
  torneo: TorneoInformacion;
  onGuardado: (torneo: TorneoInformacion) => void;
}

/**
 * La ventana de check-in del torneo (HU-308), una para todos sus partidos: cuántos minutos antes del cruce abre y
 * cuánto dura, y qué pasa si al vencer no se presentó ninguno de los dos (HU-309). Con el torneo terminado o
 * cancelado se ve, pero ya no se cambia.
 */
export const CheckinTorneo: React.FC<CheckinTorneoProps> = ({ torneo, onGuardado }) => {
  const [form, setForm] = useState<CheckinTorneoPayload>({
    minAntes: torneo.checkinMinAntes,
    duracion: torneo.checkinDuracion,
    sinPresentes: torneo.checkinSinPresentes,
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const editable = torneo.estado !== 'FINALIZADO' && torneo.estado !== 'CANCELADO';
  const linea = ejemplo(form);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrores({});
    setMensaje(null);
    try {
      const guardado = await torneoApi.configurarCheckin(torneo.id, form);
      setForm({ ...form, sinPresentes: guardado.checkinSinPresentes });
      onGuardado(guardado);
      setMensaje({ tipo: 'exito', texto: 'Check-in guardado.' });
    } catch (err) {
      const deCampo = erroresPorCampo(err, PROPIOS);
      setErrores(deCampo);
      if (Object.keys(deCampo).length === 0) {
        setMensaje({
          tipo: 'error',
          texto: mensajeDeError(err, 'No se pudo guardar el check-in.'),
        });
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="torneos-form" onSubmit={(e) => void guardar(e)} noValidate>
      <p className="torneos-subtitulo">
        {torneo.checkinMinAntes === null
          ? 'Sin check-in: los partidos se juegan sin confirmar presencia.'
          : 'Los capitanes confirman su presencia desde la ficha del partido, dentro de esta ventana.'}
      </p>
      <div className="torneos-grilla">
        <Field label="Abre (minutos antes del partido)" required error={errores.minAntes}>
          <Input
            type="number"
            min={1}
            value={form.minAntes ?? ''}
            onChange={(e) => setForm({ ...form, minAntes: aNumero(e.target.value) })}
            disabled={!editable}
          />
        </Field>
        <Field label="Dura (minutos)" required error={errores.duracion}>
          <Input
            type="number"
            min={1}
            value={form.duracion ?? ''}
            onChange={(e) => setForm({ ...form, duracion: aNumero(e.target.value) })}
            disabled={!editable}
          />
        </Field>
      </div>
      {linea && <p className="torneos-subtitulo">{linea}</p>}
      <fieldset className="torneos-opciones">
        <legend>Si no se presenta ninguno de los dos</legend>
        <div className="torneos-opciones-grilla">
          {CRITERIOS.map((c) => (
            <button
              key={c.valor}
              type="button"
              className="torneos-opcion"
              aria-pressed={form.sinPresentes === c.valor}
              disabled={!editable}
              onClick={() => setForm({ ...form, sinPresentes: c.valor })}
            >
              <span className="torneos-opcion-titulo">{c.titulo}</span>
              <span className="torneos-opcion-detalle">{c.detalle}</span>
            </button>
          ))}
        </div>
        {errores.sinPresentes && (
          <p className="torneos-opciones-error" role="alert">
            {errores.sinPresentes}
          </p>
        )}
      </fieldset>
      {mensaje && (
        <div
          className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
          role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
        >
          {mensaje.texto}
        </div>
      )}
      {editable && (
        <div className="torneos-acciones">
          <Button type="submit" loading={guardando}>
            Guardar
          </Button>
        </div>
      )}
    </form>
  );
};
