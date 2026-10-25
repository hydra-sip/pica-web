import { useEffect, useState } from 'react';
import { equipoApi, EquipoResumen } from '../../api/equipoApi';
import { inscripcionApi } from '../../api/inscripcionApi';
import { mensajeDeError } from '../../shared/mensajesError';

/** Tamaño de página para traer todos los equipos y todas las inscripciones propias de una vez. */
export const TAMANIO = 100;

export interface EquipoElegible extends EquipoResumen {
  /** Ya tiene una inscripción (en cualquier estado) en este torneo distinta del borrador que se retoma. */
  inscripto: boolean;
}

/**
 * Los equipos del capitán (GET /equipos/mios) y cuáles ya tienen una inscripción en el torneo
 * (GET /inscripciones/mias?torneoId=), porque el back no permite una segunda inscripción del mismo equipo.
 * `borradorId` es el de la inscripción que se retoma: su propio equipo sigue disponible.
 */
export const useEquiposDelTorneo = (
  torneoId: number,
  borradorId: number | undefined,
  activo: boolean
) => {
  const [equipos, setEquipos] = useState<EquipoElegible[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    Promise.all([
      equipoApi.listarMios({ size: TAMANIO }),
      inscripcionApi.listarMias({ torneoId, size: TAMANIO }),
    ])
      .then(([propios, inscripciones]) => {
        if (!vigente) return;
        const ocupados = new Set(
          inscripciones.content.flatMap((i) =>
            i.id !== borradorId && i.equipo ? [i.equipo.id] : []
          )
        );
        setEquipos(propios.content.map((e) => ({ ...e, inscripto: ocupados.has(e.id) })));
      })
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar tus equipos.'))
      );
    return () => {
      vigente = false;
    };
  }, [torneoId, borradorId, activo]);

  /** Suma un equipo recién creado por nombre, para poder elegirlo sin recargar. */
  const agregar = (equipo: EquipoResumen) =>
    setEquipos((prev) =>
      prev && !prev.some((e) => e.id === equipo.id)
        ? [...prev, { ...equipo, inscripto: false }]
        : prev
    );

  return { equipos, error, agregar };
};
