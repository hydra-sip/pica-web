import React, { useEffect, useState } from 'react';
import { rifaApi, RifaDetalle } from '../../api/rifaApi';
import { erroresPorCampo, mensajeDeError } from '../../admin/mensajesError';
import {
  ErroresPremios,
  PremioForm,
  sumaPorcentajes,
  validatePremios,
} from '../../shared/validators';

interface PremiosFormProps {
  rifa: RifaDetalle;
  editable: boolean;
  onGuardada: (rifa: RifaDetalle) => void;
  onAnterior: () => void;
}

const desdeRifa = (rifa: RifaDetalle): PremioForm[] =>
  rifa.premios.map((p) => ({ pct: String(p.pct), descripcion: p.descripcion ?? '' }));

/**
 * Paso 2 del asistente, "Premios": PUT /rifas/{id}/premios con la lista completa en orden de puesto.
 * En borrador pueden sumar menos de 100 %; para publicar tienen que sumar exactamente 100.
 */
export const PremiosForm: React.FC<PremiosFormProps> = ({
  rifa,
  editable,
  onGuardada,
  onAnterior,
}) => {
  const [premios, setPremios] = useState<PremioForm[]>(() => desdeRifa(rifa));
  const [errores, setErrores] = useState<ErroresPremios>({ porFila: {} });
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setPremios(desdeRifa(rifa));
    setErrores({ porFila: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rifa.id]);

  const cantidadNumeros = rifa.numeroHasta - rifa.numeroDesde + 1;
  const suma = sumaPorcentajes(premios);
  const bloqueado = !editable || guardando;

  const actualizar = (i: number, campo: keyof PremioForm, valor: string) => {
    setPremios((prev) => prev.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
    if (errores.porFila[i]) {
      setErrores((prev) => ({ ...prev, porFila: { ...prev.porFila, [i]: '' } }));
    }
  };

  const agregar = () => setPremios((prev) => [...prev, { pct: '', descripcion: '' }]);

  const quitar = (i: number) => {
    setPremios((prev) => prev.filter((_, j) => j !== i));
    setErrores({ porFila: {} });
  };

  const mover = (i: number, destino: number) => {
    setPremios((prev) => {
      const copia = [...prev];
      [copia[i], copia[destino]] = [copia[destino], copia[i]];
      return copia;
    });
    setErrores({ porFila: {} });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const encontrados = validatePremios(premios, cantidadNumeros);
    setErrores(encontrados);
    if (encontrados.general || Object.values(encontrados.porFila).some(Boolean)) {
      setMensaje({ tipo: 'error', texto: encontrados.general ?? 'Revisá los premios marcados.' });
      return;
    }

    setGuardando(true);
    try {
      const guardada = await rifaApi.reemplazarPremios(
        rifa.id,
        premios.map((p) => ({ pct: Number(p.pct), descripcion: p.descripcion.trim() || null }))
      );
      setMensaje({ tipo: 'exito', texto: 'Borrador guardado.' });
      onGuardada(guardada);
    } catch (err) {
      const porCampo = erroresPorCampo(err);
      setMensaje({
        tipo: 'error',
        texto: porCampo.premios ?? mensajeDeError(err, 'No se pudieron guardar los premios.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="rifas-form" onSubmit={guardar} noValidate>
      <div className="rifas-tarjeta-titulo">
        <h3>Paso 2: Premios por puesto</h3>
        <span>Puede haber hasta un premio por número ({cantidadNumeros})</span>
      </div>

      {mensaje && <div className={`rifas-aviso rifas-aviso-${mensaje.tipo}`}>{mensaje.texto}</div>}

      <div className="rifas-aviso rifas-aviso-info">
        Cada premio es un porcentaje del pozo de la rifa y entre todos tienen que sumar 100 % para
        poder publicarla.
      </div>

      {premios.length === 0 ? (
        <p className="rifas-vacio">Todavía no hay premios cargados.</p>
      ) : (
        <div className="premios-lista">
          {premios.map((premio, i) => (
            <div key={i}>
              <div className="premio-fila">
                <span className="premio-puesto">{i + 1}.º</span>
                <input
                  aria-label={`Porcentaje del ${i + 1}.º premio`}
                  className={`rifas-input ${errores.porFila[i] ? 'con-error' : ''}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  step={1}
                  placeholder="%"
                  value={premio.pct}
                  // Solo enteros: se descarta la coma o el punto que se tipee
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === '-') {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => actualizar(i, 'pct', e.target.value.replace(/\D/g, ''))}
                  disabled={bloqueado}
                />
                <input
                  aria-label={`Descripción del ${i + 1}.º premio`}
                  className="rifas-input premio-descripcion"
                  type="text"
                  maxLength={255}
                  placeholder="Descripción (opcional)"
                  value={premio.descripcion}
                  onChange={(e) => actualizar(i, 'descripcion', e.target.value)}
                  disabled={bloqueado}
                />
                {editable && (
                  <div className="premio-botones">
                    <button
                      type="button"
                      className="btn-icono"
                      title="Subir"
                      aria-label="Subir"
                      disabled={guardando || i === 0}
                      onClick={() => mover(i, i - 1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-icono"
                      title="Bajar"
                      aria-label="Bajar"
                      disabled={guardando || i === premios.length - 1}
                      onClick={() => mover(i, i + 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn-icono"
                      title="Quitar"
                      aria-label="Quitar"
                      disabled={guardando}
                      onClick={() => quitar(i)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              {errores.porFila[i] && (
                <span className="rifas-error-campo" style={{ marginLeft: '4.25rem' }}>
                  ⚠️ {errores.porFila[i]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="premios-total">
        <span>
          Total:{' '}
          <strong className={suma > 100 ? 'excedido' : suma === 100 ? 'completo' : ''}>
            {suma} %
          </strong>
          {suma < 100 && premios.length > 0 && <> · faltan {100 - suma} % para publicar</>}
        </span>
        {editable && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={agregar}
            disabled={guardando || premios.length >= cantidadNumeros}
          >
            + Agregar premio
          </button>
        )}
      </div>

      <div className="rifas-pie">
        <span>Paso 2 de 2{editable && ' · Los cambios se guardan como borrador'}</span>
        <div className="rifas-acciones">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onAnterior}
            disabled={guardando}
          >
            ← Anterior
          </button>
          {editable && (
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar como borrador'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
