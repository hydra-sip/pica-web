import React, { useState } from 'react';
import { GastoDetalle, GastoPayload, torneoApi } from '../../api/torneoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Input } from '../../shared/ui';
import { pesosArs } from '../formato';

interface GastosPrevistosProps {
  torneoId: number;
  gastos: GastoDetalle[];
  onCambio: (gastos: GastoDetalle[]) => void;
  habilitado: boolean;
}

interface Borrador {
  descripcion: string;
  monto: string;
  /** HU-604: se paga por la plataforma, depositándolo en la custodia para el árbitro. */
  honorario: boolean;
}

const VACIO: Borrador = { descripcion: '', monto: '', honorario: false };

const validar = (b: Borrador): string | null => {
  if (!b.descripcion.trim()) return 'Poné qué es el gasto.';
  const monto = Number(b.monto);
  if (b.monto.trim() === '' || !Number.isFinite(monto) || monto <= 0)
    return 'El monto tiene que ser mayor a $ 0.';
  return null;
};

const aPayload = (b: Borrador): GastoPayload => ({
  descripcion: b.descripcion.trim(),
  monto: Number(b.monto),
  tipo: b.honorario ? 'HONORARIO_ARBITRAL' : 'OTRO',
});

const AYUDA_HONORARIO =
  'Un honorario arbitral solo se descuenta del pozo si lo pagás por la plataforma: lo depositás desde la consola del torneo para el árbitro, y la liquidación se lo acredita.';

/**
 * Gastos previstos del paso 3 (honorarios, alquiler de la sede...), que se descuentan del pozo de competidores.
 * Cada alta, cambio o baja se guarda en el momento: son recursos propios del torneo, no parte del formulario. Un
 * honorario arbitral se marca como tal (HU-604): solo se descuenta si se paga por la plataforma.
 */
export const GastosPrevistos: React.FC<GastosPrevistosProps> = ({
  torneoId,
  gastos,
  onCambio,
  habilitado,
}) => {
  const [nuevo, setNuevo] = useState<Borrador>(VACIO);
  const [editando, setEditando] = useState<{ gastoId: number; borrador: Borrador } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const ejecutar = async (accion: () => Promise<void>) => {
    setOcupado(true);
    setError(null);
    try {
      await accion();
    } catch (err) {
      const campos = Object.values(erroresPorCampo(err));
      setError(campos[0] ?? mensajeDeError(err, 'No se pudo guardar el gasto.'));
    } finally {
      setOcupado(false);
    }
  };

  const agregar = () => {
    const invalido = validar(nuevo);
    if (invalido) {
      setError(invalido);
      return;
    }
    void ejecutar(async () => {
      const creado = await torneoApi.agregarGasto(torneoId, aPayload(nuevo));
      onCambio([...gastos, creado]);
      setNuevo(VACIO);
    });
  };

  const guardarEdicion = () => {
    if (!editando) return;
    const invalido = validar(editando.borrador);
    if (invalido) {
      setError(invalido);
      return;
    }
    void ejecutar(async () => {
      const guardado = await torneoApi.modificarGasto(
        torneoId,
        editando.gastoId,
        aPayload(editando.borrador)
      );
      onCambio(gastos.map((g) => (g.gastoId === guardado.gastoId ? guardado : g)));
      setEditando(null);
    });
  };

  const eliminar = (gastoId: number) =>
    void ejecutar(async () => {
      await torneoApi.eliminarGasto(torneoId, gastoId);
      onCambio(gastos.filter((g) => g.gastoId !== gastoId));
    });

  const deshabilitado = !habilitado || ocupado;

  return (
    <div className="torneos-gastos">
      {gastos.length === 0 && <p className="torneos-celda-secundaria">Sin gastos previstos.</p>}
      {gastos.map((g) =>
        editando?.gastoId === g.gastoId ? (
          <div key={g.gastoId} className="torneos-gasto">
            <div className="torneos-gasto-descripcion">
              <Input
                aria-label="Descripción del gasto"
                value={editando.borrador.descripcion}
                maxLength={255}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    borrador: { ...editando.borrador, descripcion: e.target.value },
                  })
                }
                disabled={ocupado}
              />
              <label className="torneos-gasto-honorario">
                <input
                  type="checkbox"
                  checked={editando.borrador.honorario}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      borrador: { ...editando.borrador, honorario: e.target.checked },
                    })
                  }
                  disabled={ocupado}
                />
                Es un honorario arbitral
              </label>
            </div>
            <Input
              aria-label="Monto del gasto"
              type="number"
              min={0}
              step="0.01"
              value={editando.borrador.monto}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  borrador: { ...editando.borrador, monto: e.target.value },
                })
              }
              disabled={ocupado}
            />
            <div className="torneos-gasto-acciones">
              <Button size="sm" onClick={guardarEdicion} loading={ocupado}>
                Guardar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={ocupado}
                onClick={() => setEditando(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div key={g.gastoId} className="torneos-gasto">
            <span className="torneos-gasto-descripcion">
              {g.descripcion}
              {g.tipo === 'HONORARIO_ARBITRAL' && <Badge tone="info">Honorario arbitral</Badge>}
            </span>
            <strong>{pesosArs(g.monto)}</strong>
            {habilitado && (
              <div className="torneos-gasto-acciones">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deshabilitado}
                  onClick={() =>
                    setEditando({
                      gastoId: g.gastoId,
                      borrador: {
                        descripcion: g.descripcion,
                        monto: String(g.monto),
                        honorario: g.tipo === 'HONORARIO_ARBITRAL',
                      },
                    })
                  }
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deshabilitado}
                  onClick={() => eliminar(g.gastoId)}
                >
                  Quitar
                </Button>
              </div>
            )}
          </div>
        )
      )}

      {habilitado && (
        <div className="torneos-gasto torneos-gasto-nuevo">
          <div className="torneos-gasto-descripcion">
            <Input
              aria-label="Nuevo gasto"
              placeholder="Ej.: honorarios de árbitros"
              value={nuevo.descripcion}
              maxLength={255}
              onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
              disabled={deshabilitado}
            />
            <label className="torneos-gasto-honorario" title={AYUDA_HONORARIO}>
              <input
                type="checkbox"
                checked={nuevo.honorario}
                onChange={(e) => setNuevo({ ...nuevo, honorario: e.target.checked })}
                disabled={deshabilitado}
              />
              Es un honorario arbitral
            </label>
          </div>
          <Input
            aria-label="Monto del nuevo gasto"
            type="number"
            min={0}
            step="0.01"
            placeholder="$"
            value={nuevo.monto}
            onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })}
            disabled={deshabilitado}
          />
          <div className="torneos-gasto-acciones">
            <Button size="sm" variant="secondary" onClick={agregar} disabled={deshabilitado}>
              Agregar gasto
            </Button>
          </div>
        </div>
      )}

      {habilitado && <p className="torneos-celda-secundaria">{AYUDA_HONORARIO}</p>}

      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
