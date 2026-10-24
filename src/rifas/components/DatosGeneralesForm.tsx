import React, { useEffect, useState } from 'react';
import { rifaApi, RifaDetalle, RifaPayload } from '../../api/rifaApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { DatosRifaForm, validateDatosRifa } from '../../shared/validators';
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
    <div className="rifas-campo">
      <label htmlFor={`rifa-${nombre}`}>
        {etiqueta} {requerido && <span className="requerido">*</span>}
      </label>
      <input
        id={`rifa-${nombre}`}
        className={`rifas-input ${errores[nombre] ? 'con-error' : ''}`}
        value={form[nombre]}
        onChange={cambiar(nombre)}
        disabled={!editable || guardando}
        {...props}
      />
      {errores[nombre] ? (
        <span className="rifas-error-campo">⚠️ {errores[nombre]}</span>
      ) : (
        ayuda && <span className="rifas-ayuda">{ayuda}</span>
      )}
    </div>
  );

  return (
    <form className="rifas-form" onSubmit={enviar} noValidate>
      <div className="rifas-tarjeta-titulo">
        <h3>Paso 1: Datos generales de la rifa</h3>
        {editable && <span>Los campos con * son obligatorios</span>}
      </div>

      {mensaje && <div className={`rifas-aviso rifas-aviso-${mensaje.tipo}`}>{mensaje.texto}</div>}

      {campo('titulo', 'Título de la rifa', { type: 'text', maxLength: 100 }, true)}

      <div className="rifas-campo">
        <label htmlFor="rifa-descripcion">Descripción</label>
        <textarea
          id="rifa-descripcion"
          className={`rifas-input ${errores.descripcion ? 'con-error' : ''}`}
          value={form.descripcion}
          onChange={cambiar('descripcion')}
          disabled={!editable || guardando}
          maxLength={2000}
          placeholder="Para qué se recaudan los fondos, cómo se sortea, etc."
        />
        {errores.descripcion && <span className="rifas-error-campo">⚠️ {errores.descripcion}</span>}
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
              <button type="submit" className="btn btn-secondary" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar como borrador'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={guardando}
                onClick={() => void guardar(true)}
              >
                Siguiente: Premios →
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onSiguiente}>
              Ver premios →
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
