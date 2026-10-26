import React, { useState } from 'react';
import { InscripcionDetalle, inscripcionApi } from '../../api/inscripcionApi';
import { UsuarioPublico } from '../../api/jugadorApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button } from '../../shared/ui';
import { BuscadorJugadores } from './BuscadorJugadores';

interface NominaConfirmadaProps {
  inscripcion: InscripcionDetalle;
  /** Quien ve la pantalla: va primero, marcado, y no se puede reemplazar. */
  capitanId: number;
  /** La inscripción con la nómina que devolvió el reemplazo. */
  onReemplazada: (inscripcion: InscripcionDetalle) => void;
}

const nombre = (j: UsuarioPublico) => `${j.nombres} ${j.apellidos}`;

/**
 * La nómina de una inscripción confirmada, con un reemplazo por jugador menos el capitán. El reemplazo
 * se abre debajo de la fila del que sale: se busca y se elige al que entra, y se confirma antes de
 * mandarlo, porque no se deshace y queda en el historial. Hay uno solo abierto a la vez.
 */
export const NominaConfirmada: React.FC<NominaConfirmadaProps> = ({
  inscripcion,
  capitanId,
  onReemplazada,
}) => {
  const [sale, setSale] = useState<UsuarioPublico | null>(null);
  const [entra, setEntra] = useState<UsuarioPublico | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const nomina = [...(inscripcion.nomina ?? [])].sort(
    (a, b) => Number(b.id === capitanId) - Number(a.id === capitanId)
  );
  const enNomina = new Set(nomina.map((j) => j.id));

  const abrir = (jugador: UsuarioPublico) => {
    setSale(jugador);
    setEntra(null);
    setError(null);
    setAviso(null);
  };

  const cerrar = () => {
    setSale(null);
    setEntra(null);
    setError(null);
  };

  const confirmar = async () => {
    if (!sale || !entra) return;
    setEnviando(true);
    setError(null);
    try {
      const actualizada = await inscripcionApi.reemplazar(inscripcion.id, {
        saleUsuarioId: sale.id,
        entraUsuarioId: entra.id,
      });
      onReemplazada(actualizada);
      setAviso(`Listo: entró ${nombre(entra)} en lugar de ${nombre(sale)}.`);
      cerrar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo hacer el reemplazo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section>
      {aviso && (
        <div className="alerta alerta-exito" role="status">
          {aviso}
        </div>
      )}
      <ul className="nomina-lista" aria-label="Nómina">
        {nomina.map((j, i) => {
          const esCapitan = j.id === capitanId;
          const abierto = sale?.id === j.id;
          return (
            <li key={j.id} className="nomina-fila nomina-fila-reemplazo">
              <div className="nomina-fila-principal">
                <span
                  className={esCapitan ? 'nomina-avatar nomina-avatar-capitan' : 'nomina-avatar'}
                  aria-hidden="true"
                >
                  {esCapitan ? 'C' : i + 1}
                </span>
                <span className="nomina-datos">
                  <strong>
                    {nombre(j)}
                    {esCapitan && ' (Capitán)'}
                  </strong>
                  <small>@{j.username}</small>
                </span>
                {!esCapitan && !abierto && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => abrir(j)}
                    aria-label={`Reemplazar a ${nombre(j)}`}
                  >
                    Reemplazar
                  </Button>
                )}
              </div>

              {abierto && (
                <div className="reemplazo-panel">
                  {error && (
                    <div className="alerta alerta-peligro" role="alert">
                      {error}
                    </div>
                  )}
                  {entra ? (
                    <>
                      <p className="reemplazo-resumen">
                        Sale @{j.username} · Entra @{entra.username}
                      </p>
                      <div className="inscripcion-acciones">
                        <Button onClick={confirmar} disabled={enviando}>
                          Confirmar reemplazo
                        </Button>
                        <Button variant="secondary" onClick={cerrar} disabled={enviando}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <BuscadorJugadores enNomina={enNomina} onSumar={setEntra} accion="Elegir" />
                      <Button variant="secondary" onClick={cerrar}>
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
