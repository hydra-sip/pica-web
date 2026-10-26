import React, { useEffect, useState } from 'react';
import { Reemplazo, inscripcionApi } from '../../api/inscripcionApi';
import { fechaHora } from '../../shared/formato';

interface HistorialReemplazosProps {
  inscripcionId: number;
  /** Cambia después de cada reemplazo, para volver a pedir el historial. */
  recarga?: number;
}

const nombre = (u: Reemplazo['sale']) => `${u.nombres} ${u.apellidos} (@${u.username})`;

/**
 * Los reemplazos de la nómina, del más viejo al más nuevo como los devuelve el back. Se carga aparte de
 * la inscripción: si falla, el aviso queda en esta sección y la nómina se sigue viendo.
 */
export const HistorialReemplazos: React.FC<HistorialReemplazosProps> = ({
  inscripcionId,
  recarga,
}) => {
  const [reemplazos, setReemplazos] = useState<Reemplazo[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setReemplazos(null);
    setError(false);
    inscripcionApi
      .reemplazos(inscripcionId)
      .then((lista) => vigente && setReemplazos(lista))
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [inscripcionId, recarga]);

  return (
    <section className="historial-reemplazos">
      <h2>Historial de reemplazos</h2>
      {error && (
        <div className="alerta alerta-peligro" role="alert">
          No se pudo cargar el historial de reemplazos.
        </div>
      )}
      {reemplazos?.length === 0 && <p>Todavía no hay reemplazos.</p>}
      {reemplazos && reemplazos.length > 0 && (
        <ul className="historial-lista" aria-label="Historial de reemplazos">
          {reemplazos.map((r) => (
            <li key={`${r.reemplazadoEn}-${r.sale.id}`} className="historial-fila">
              <span>
                Salió {nombre(r.sale)}, entró {nombre(r.entra)}
              </span>
              <small>
                {fechaHora(r.reemplazadoEn)} · por @{r.realizadoPor.username}
              </small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
