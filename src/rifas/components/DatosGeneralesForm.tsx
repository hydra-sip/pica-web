import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { rifaApi, RifaDetalle, RifaPayload } from '../../api/rifaApi';
import { torneoApi } from '../../api/torneoApi';
import { ESTADOS_TORNEO_CON_RIFA } from '../formato';
import { erroresDelFormulario, mensajeDeError } from '../../shared/mensajesError';
import { DatosRifaForm, FechasTorneoRifa, validateDatosRifa } from '../../shared/validators';
import { Button, Field, Input, Select, Textarea } from '../../shared/ui';
import { inputLocalAIso, isoAInputLocal } from '../../shared/formato';
import { CampoFechaHora } from './CampoFechaHora';
import { PasoGuardable } from './pasoGuardable';

interface DatosGeneralesFormProps {
  /** null en el alta. */
  rifa: RifaDetalle | null;
  /** En el alta desde un torneo ("Crear rifa" en Mis torneos), el torneo ya elegido. */
  torneoInicial?: number;
  editable: boolean;
  onGuardada: (rifa: RifaDetalle) => void;
  /** Pasa al paso de premios; la página guarda antes con {@link PasoGuardable.guardar}. */
  onSiguiente: () => void;
}

type Formulario = DatosRifaForm & { descripcion: string };
type Errores = Partial<Record<keyof Formulario, string>>;

interface TorneoOpcion {
  id: number;
  nombre: string;
}

// Los errores del back sobre el torneo elegido no traen campo: se marcan en el selector
const CAMPO_POR_CODIGO = {
  TORNEO_NO_ENCONTRADO: 'torneoId',
  TORNEO_NO_ADMITE_RIFA: 'torneoId',
  TORNEO_CON_RIFA: 'torneoId',
};

const desdeRifa = (rifa: RifaDetalle | null, torneoInicial?: number): Formulario => ({
  titulo: rifa?.titulo ?? '',
  descripcion: rifa?.descripcion ?? '',
  numeroDesde: rifa ? String(rifa.numeroDesde) : '',
  numeroHasta: rifa ? String(rifa.numeroHasta) : '',
  precioNumero: rifa ? String(rifa.precioNumero) : '',
  inicioVenta: rifa?.ventaHasta && !rifa.ventaDesde ? 'AL_PUBLICAR' : 'FECHA',
  ventaDesde: isoAInputLocal(rifa?.ventaDesde ?? null),
  ventaHasta: isoAInputLocal(rifa?.ventaHasta ?? null),
  fechaSorteo: isoAInputLocal(rifa?.fechaSorteo ?? null),
  torneoId: String((rifa ? rifa.torneoId : torneoInicial) ?? ''),
  pctDestinadoTorneo: String(rifa?.pctDestinadoTorneo ?? 0),
});

/**
 * Paso 1 del asistente, "Datos generales": POST /rifas en el alta y PUT /rifas/{id} después.
 * No toca los premios, que se guardan en el paso 2. Guarda con "Guardar como borrador" y, a pedido de
 * la página, antes de cambiar de paso. Con torneo (PICA-220), el % para el torneo arranca con el que el
 * torneo reserva para la rifa, y el organizador lo puede cambiar.
 */
export const DatosGeneralesForm = forwardRef<PasoGuardable, DatosGeneralesFormProps>(
  ({ rifa, torneoInicial, editable, onGuardada, onSiguiente }, ref) => {
    const [form, setForm] = useState(() => desdeRifa(rifa, torneoInicial));
    const [errores, setErrores] = useState<Errores>({});
    const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [torneos, setTorneos] = useState<TorneoOpcion[]>([]);
    const [fechasTorneo, setFechasTorneo] = useState<FechasTorneoRifa | null>(null);

    // Se reinicia al pasar de una rifa a otra, no cada vez que se guarda.
    useEffect(() => {
      setForm(desdeRifa(rifa, torneoInicial));
      setErrores({});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rifa?.id]);

    useEffect(() => {
      if (!editable) {
        return;
      }
      let vigente = true;
      torneoApi
        .misTorneos({ size: 100 })
        .then(
          (pagina) =>
            vigente &&
            setTorneos(pagina.content.filter((t) => ESTADOS_TORNEO_CON_RIFA.includes(t.estado)))
        )
        // Sin la lista se puede seguir armando la rifa sin torneo
        .catch(() => vigente && setTorneos([]));
      return () => {
        vigente = false;
      };
    }, [editable]);

    useEffect(() => {
      setFechasTorneo(null);
      if (!editable || !form.torneoId) {
        return;
      }
      let vigente = true;
      torneoApi
        .obtener(Number(form.torneoId))
        .then((torneo) => vigente && setFechasTorneo(torneo))
        // Sin las fechas igual se puede guardar: las controla el back
        .catch(() => vigente && setFechasTorneo(null));
      return () => {
        vigente = false;
      };
    }, [editable, form.torneoId]);

    const elegirTorneo = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const valor = e.target.value;
      setForm((prev) => ({ ...prev, torneoId: valor, pctDestinadoTorneo: '0' }));
      setErrores((prev) => ({ ...prev, torneoId: undefined, pctDestinadoTorneo: undefined }));
    };

    const elegirInicioVenta = (valor: Formulario['inicioVenta']) => {
      setForm((prev) => ({ ...prev, inicioVenta: valor, ventaDesde: '' }));
      setErrores((prev) => ({ ...prev, ventaDesde: undefined }));
    };

    // La rifa puede tener un torneo que ya no está en la lista (por ejemplo, porque empezó)
    const opcionesTorneo: TorneoOpcion[] =
      rifa?.torneoId && !torneos.some((t) => t.id === rifa.torneoId)
        ? [{ id: rifa.torneoId, nombre: rifa.torneoNombre ?? '' }, ...torneos]
        : torneos;

    const cambiarValor = (campo: keyof Formulario) => (valor: string) => {
      setForm((prev) => ({ ...prev, [campo]: valor }));
      if (errores[campo]) {
        setErrores((prev) => ({ ...prev, [campo]: undefined }));
      }
    };

    const cambiar =
      (campo: keyof Formulario) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        cambiarValor(campo)(e.target.value);

    const guardar = async (): Promise<RifaDetalle | null> => {
      if (!editable) {
        return rifa;
      }
      setMensaje(null);

      const encontrados: Errores = validateDatosRifa(
        form,
        rifa?.premios.length ?? 0,
        rifa?.premios.reduce((total, p) => total + p.pct, 0) ?? 0,
        fechasTorneo,
        isoAInputLocal(rifa?.ventaDesde ?? null)
      );
      if (form.descripcion.trim().length > 2000) {
        encontrados.descripcion = 'La descripción no puede superar los 2000 caracteres.';
      }
      setErrores(encontrados);
      if (Object.keys(encontrados).length > 0) {
        setMensaje({ tipo: 'error', texto: 'Revisá los campos marcados.' });
        return null;
      }
      // Sin cambios no hace falta ir al back (cambiar de paso no debería guardar de más)
      if (rifa && JSON.stringify(form) === JSON.stringify(desdeRifa(rifa, torneoInicial))) {
        return rifa;
      }

      const payload: RifaPayload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        numeroDesde: Number(form.numeroDesde),
        numeroHasta: Number(form.numeroHasta),
        precioNumero: Number(form.precioNumero),
        ventaDesde: inputLocalAIso(form.ventaDesde),
        ventaHasta: inputLocalAIso(form.ventaHasta),
        fechaSorteo: inputLocalAIso(form.fechaSorteo),
        torneoId: form.torneoId ? Number(form.torneoId) : null,
        pctDestinadoTorneo: form.torneoId ? Number(form.pctDestinadoTorneo) : 0,
      };

      setGuardando(true);
      try {
        const guardada = rifa
          ? await rifaApi.actualizar(rifa.id, payload)
          : await rifaApi.crear(payload);
        setMensaje({ tipo: 'exito', texto: 'Borrador guardado.' });
        onGuardada(guardada);
        return guardada;
      } catch (err) {
        const delBack = erroresDelFormulario(err, CAMPO_POR_CODIGO);
        // Lo demás de las fechas ya lo validó la pantalla; con torneo, el back controla sus fechas
        if (form.torneoId && delBack.ventaDesde) {
          delBack.ventaDesde = 'No puede empezar antes de que se publique el torneo.';
        }
        if (form.torneoId && delBack.ventaHasta) {
          // El back dice contra qué fecha: la finalización del torneo o, si no la tiene, su inicio
          const limite = (
            err as { problemDetail?: { errores?: { campo: string; mensaje: string }[] } }
          ).problemDetail?.errores?.find((e) => e.campo === 'ventaHasta')?.mensaje;
          delBack.ventaHasta = limite
            ? `${limite}.`
            : 'La fecha debe ser anterior a la finalización del torneo.';
        }
        setErrores(delBack);
        setMensaje({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo guardar la rifa.') });
        return null;
      } finally {
        setGuardando(false);
      }
    };

    useImperativeHandle(ref, () => ({ guardar }));

    const enviar = (e: React.FormEvent) => {
      e.preventDefault();
      void guardar();
    };

    const bloqueado = !editable || guardando;

    const campo = (
      nombre: keyof Formulario,
      etiqueta: string,
      props: React.InputHTMLAttributes<HTMLInputElement>,
      requerido = false
    ) => (
      <Field label={etiqueta} required={requerido} error={errores[nombre]}>
        <Input value={form[nombre]} onChange={cambiar(nombre)} disabled={bloqueado} {...props} />
      </Field>
    );

    const fecha = (
      nombre: 'ventaDesde' | 'ventaHasta' | 'fechaSorteo',
      etiqueta: string,
      ayuda?: string
    ) => (
      <CampoFechaHora
        id={`rifa-${nombre}`}
        label={etiqueta}
        hint={ayuda}
        error={errores[nombre]}
        value={form[nombre]}
        onChange={cambiarValor(nombre)}
        disabled={bloqueado || (nombre === 'ventaDesde' && form.inicioVenta === 'AL_PUBLICAR')}
      />
    );

    return (
      <form className="rifas-form" onSubmit={enviar} noValidate>
        <div className="rifas-tarjeta-titulo">
          <h2>Paso 1: Datos generales de la rifa</h2>
          {editable && <span>Los campos con * son obligatorios</span>}
        </div>

        {campo('titulo', 'Título de la rifa', { type: 'text', maxLength: 100 }, true)}

        <Field label="Descripción" error={errores.descripcion}>
          <Textarea
            rows={4}
            value={form.descripcion}
            onChange={cambiar('descripcion')}
            disabled={bloqueado}
            maxLength={2000}
            placeholder="Para qué se recaudan los fondos, cómo se sortea"
          />
        </Field>

        <div className="rifas-grilla">
          <Field
            label={
              <>
                Torneo <span className="field-ayuda">(opcional)</span>
              </>
            }
            error={errores.torneoId}
          >
            <Select value={form.torneoId} onChange={elegirTorneo} disabled={bloqueado}>
              <option value="">Sin torneo</option>
              {opcionesTorneo.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
          {form.torneoId && (
            <Field
              label="Destinado al pozo del torneo (%)"
              required
              error={errores.pctDestinadoTorneo}
              hint="El resto de lo recaudado se reparte en los premios."
            >
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                step={1}
                value={form.pctDestinadoTorneo}
                onChange={(e) =>
                  cambiarValor('pctDestinadoTorneo')(e.target.value.replace(/\D/g, ''))
                }
                disabled={bloqueado}
              />
            </Field>
          )}
        </div>

        <div className="rifas-grilla">
          {campo('numeroDesde', 'Número desde', { type: 'number', min: 0, step: 1 }, true)}
          {campo('numeroHasta', 'Número hasta', { type: 'number', min: 0, step: 1 }, true)}
          {campo(
            'precioNumero',
            'Precio por número (ARS)',
            { type: 'number', min: 0.01, step: 0.01 },
            true
          )}
        </div>

        <fieldset className="rifas-opciones">
          <legend>Inicio de la venta</legend>
          <label>
            <input
              type="radio"
              name="inicioVenta"
              checked={form.inicioVenta === 'FECHA'}
              onChange={() => elegirInicioVenta('FECHA')}
              disabled={bloqueado}
            />
            <span>Indicar fecha de inicio</span>
          </label>
          <label>
            <input
              type="radio"
              name="inicioVenta"
              checked={form.inicioVenta === 'AL_PUBLICAR'}
              onChange={() => elegirInicioVenta('AL_PUBLICAR')}
              disabled={bloqueado}
            />
            <span>Iniciar la venta al publicar</span>
          </label>
        </fieldset>

        <div className="rifas-grilla">
          {fecha('ventaDesde', 'Fecha de inicio de la venta')}
          {fecha('ventaHasta', 'Fin de la venta')}
          {fecha('fechaSorteo', 'Fecha del sorteo')}
        </div>

        {mensaje && (
          <div
            className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
            role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
          >
            {mensaje.texto}
          </div>
        )}

        <div className="rifas-pie">
          <span>
            Paso 1 de 3
            {/* Crear la rifa es una acción del organizador: recién con el borrador guardado se avanza */}
            {!rifa
              ? ' · Guardá el borrador para seguir con los premios'
              : editable && ' · Los cambios se guardan al cambiar de paso'}
          </span>
          <div className="rifas-acciones">
            {editable && (
              <Button type="submit" variant={rifa ? 'secondary' : 'primary'} loading={guardando}>
                Guardar como borrador
              </Button>
            )}
            {rifa && (
              <Button disabled={guardando} onClick={onSiguiente}>
                {editable ? 'Siguiente: Premios →' : 'Ver premios →'}
              </Button>
            )}
          </div>
        </div>
      </form>
    );
  }
);
DatosGeneralesForm.displayName = 'DatosGeneralesForm';
