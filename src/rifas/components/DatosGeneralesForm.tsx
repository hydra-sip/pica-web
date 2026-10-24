import React, { useEffect, useState } from 'react';
import { rifaApi, RifaDetalle, RifaPayload } from '../../api/rifaApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { DatosRifaForm, validateDatosRifa } from '../../shared/validators';
import { Button, Field, Input, Textarea } from '../../shared/ui';
import { inputLocalAIso, isoAInputLocal } from '../formato';

interface DatosGeneralesFormProps {
  /** null en el alta. */
  rifa: RifaDetalle | null;
  editable: boolean;
  /** `seguir` es true si se guardó con "Siguiente" y hay que pasar al paso de premios. */
  onGuardada: (rifa: RifaDetalle, seguir: boolean) => void;
  /** Para ir al paso siguiente sin guardar, cuando la rifa es de solo lectura. */
  onSiguiente: () => void;
}

type Errores = Partial<Record<keyof DatosRifaForm | 'descripcion', string>>;

const desdeRifa = (rifa: RifaDetalle | null): DatosRifaForm & { descripcion: string } => ({
  titulo: rifa?.titulo ?? '',
  descripcion: rifa?.descripcion ?? '',
  numeroDesde: rifa ? String(rifa.numeroDesde) : '',
  numeroHasta: rifa ? String(rifa.numeroHasta) : '',
  precioNumero: rifa ? String(rifa.precioNumero) : '',
  ventaDesde: isoAInputLocal(rifa?.ventaDesde ?? null),
  ventaHasta: isoAInputLocal(rifa?.ventaHasta ?? null),
});

/**
 * Paso 1 del asistente, "Datos generales": POST /rifas en el alta y PUT /rifas/{id} después.
 * No toca los premios, que se guardan en el paso 2.
 */
export const DatosGeneralesForm: React.FC<DatosGeneralesFormProps> = ({
  rifa,
  editable,
  onGuardada,
  onSiguiente,
}) => {
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

  const cambiar =
    (campo: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [campo]: e.target.value }));
      if (errores[campo]) {
        setErrores((prev) => ({ ...prev, [campo]: undefined }));
      }
    };

  const guardar = async (seguir: boolean) => {
    setMensaje(null);

    const encontrados: Errores = validateDatosRifa(form, rifa?.premios.length ?? 0);
    if (form.descripcion.trim().length > 2000) {
      encontrados.descripcion = 'La descripción no puede superar los 2000 caracteres.';
    }
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setMensaje({ tipo: 'error', texto: 'Revisá los campos marcados.' });
      return;
    }

    const payload: RifaPayload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      numeroDesde: Number(form.numeroDesde),
      numeroHasta: Number(form.numeroHasta),
      precioNumero: Number(form.precioNumero),
      ventaDesde: inputLocalAIso(form.ventaDesde),
      ventaHasta: inputLocalAIso(form.ventaHasta),
    };

    setGuardando(true);
    try {
      const guardada = rifa
        ? await rifaApi.actualizar(rifa.id, payload)
        : await rifaApi.crear(payload);
      setMensaje({ tipo: 'exito', texto: 'Borrador guardado.' });
      onGuardada(guardada, seguir);
    } catch (err) {
      setErrores(erroresPorCampo(err));
      setMensaje({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo guardar la rifa.') });
    } finally {
      setGuardando(false);
    }
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    void guardar(false);
  };

  const campo = (
    nombre: keyof typeof form,
    etiqueta: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    requerido = false,
    ayuda?: string
  ) => (
    <Field label={etiqueta} required={requerido} hint={ayuda} error={errores[nombre]}>
      <Input
        value={form[nombre]}
        onChange={cambiar(nombre)}
        disabled={!editable || guardando}
        {...props}
      />
    </Field>
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
          disabled={!editable || guardando}
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
        {campo(
          'ventaDesde',
          'Inicio de la venta',
          { type: 'datetime-local' },
          false,
          'Podés dejarla para después; hace falta para publicar.'
        )}
        {campo('ventaHasta', 'Fin de la venta', { type: 'datetime-local' })}
      </div>

      <div className="rifas-pie">
        <span>Paso 1 de 2{editable && ' · Los cambios se guardan como borrador'}</span>
        <div className="rifas-acciones">
          {editable ? (
            <>
              <Button type="submit" variant="secondary" loading={guardando}>
                Guardar como borrador
              </Button>
              <Button disabled={guardando} onClick={() => void guardar(true)}>
                Siguiente: Premios →
              </Button>
            </>
          ) : (
            <Button onClick={onSiguiente}>Ver premios →</Button>
          )}
        </div>
      </div>
    </form>
  );
};
