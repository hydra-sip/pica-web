import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { rifaApi, RifaDetalle, RifaPayload } from '../../api/rifaApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { DatosRifaForm, validateDatosRifa } from '../../shared/validators';
import { Button, Field, Input, Textarea } from '../../shared/ui';
import { inputLocalAIso, isoAInputLocal } from '../formato';
import { CampoFechaHora } from './CampoFechaHora';
import { PasoGuardable } from './pasoGuardable';

interface DatosGeneralesFormProps {
  /** null en el alta. */
  rifa: RifaDetalle | null;
  editable: boolean;
  onGuardada: (rifa: RifaDetalle) => void;
  /** Pasa al paso de premios; la página guarda antes con {@link PasoGuardable.guardar}. */
  onSiguiente: () => void;
}

type Formulario = DatosRifaForm & { descripcion: string };
type Errores = Partial<Record<keyof Formulario, string>>;

const desdeRifa = (rifa: RifaDetalle | null): Formulario => ({
  titulo: rifa?.titulo ?? '',
  descripcion: rifa?.descripcion ?? '',
  numeroDesde: rifa ? String(rifa.numeroDesde) : '',
  numeroHasta: rifa ? String(rifa.numeroHasta) : '',
  precioNumero: rifa ? String(rifa.precioNumero) : '',
  ventaDesde: isoAInputLocal(rifa?.ventaDesde ?? null),
  ventaHasta: isoAInputLocal(rifa?.ventaHasta ?? null),
  fechaSorteo: isoAInputLocal(rifa?.fechaSorteo ?? null),
});

/**
 * Paso 1 del asistente, "Datos generales": POST /rifas en el alta y PUT /rifas/{id} después.
 * No toca los premios, que se guardan en el paso 2. Guarda con "Guardar como borrador" y, a pedido de
 * la página, antes de cambiar de paso.
 */
export const DatosGeneralesForm = forwardRef<PasoGuardable, DatosGeneralesFormProps>(
  ({ rifa, editable, onGuardada, onSiguiente }, ref) => {
    const [form, setForm] = useState(() => desdeRifa(rifa));
    const [errores, setErrores] = useState<Errores>({});
    const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
    const [guardando, setGuardando] = useState(false);

    // Se reinicia al pasar de una rifa a otra, no cada vez que se guarda.
    useEffect(() => {
      setForm(desdeRifa(rifa));
      setErrores({});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rifa?.id]);

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

      const encontrados: Errores = validateDatosRifa(form, rifa?.premios.length ?? 0);
      if (form.descripcion.trim().length > 2000) {
        encontrados.descripcion = 'La descripción no puede superar los 2000 caracteres.';
      }
      setErrores(encontrados);
      if (Object.keys(encontrados).length > 0) {
        setMensaje({ tipo: 'error', texto: 'Revisá los campos marcados.' });
        return null;
      }
      // Sin cambios no hace falta ir al back (cambiar de paso no debería guardar de más)
      if (rifa && JSON.stringify(form) === JSON.stringify(desdeRifa(rifa))) {
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
        setErrores(erroresPorCampo(err));
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
        disabled={bloqueado}
      />
    );

    return (
      <form className="rifas-form" onSubmit={enviar} noValidate>
        <div className="rifas-tarjeta-titulo">
          <h2>Paso 1: Datos generales de la rifa</h2>
          {editable && <span>Los campos con * son obligatorios</span>}
        </div>

        {mensaje && (
          <div
            className={`alerta ${mensaje.tipo === 'exito' ? 'alerta-exito' : 'alerta-peligro'}`}
            role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
          >
            {mensaje.texto}
          </div>
        )}

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
          {campo('numeroDesde', 'Número desde', { type: 'number', min: 0, step: 1 }, true)}
          {campo('numeroHasta', 'Número hasta', { type: 'number', min: 0, step: 1 }, true)}
          {campo(
            'precioNumero',
            'Precio por número (ARS)',
            { type: 'number', min: 0.01, step: 0.01 },
            true
          )}
        </div>

        <div className="rifas-grilla">
          {fecha(
            'ventaDesde',
            'Inicio de la venta',
            'Podés dejarla para después; hace falta para publicar.'
          )}
          {fecha('ventaHasta', 'Fin de la venta')}
          {fecha(
            'fechaSorteo',
            'Fecha del sorteo',
            'Después del fin de la venta. El sorteo se hace solo en esa fecha.'
          )}
        </div>

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
