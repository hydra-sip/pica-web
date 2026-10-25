import React, { useState } from 'react';
import { InscripcionDetalle } from '../../api/inscripcionApi';
import { Torneo } from '../../api/torneoApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { Card } from '../../shared/ui';
import { useEquiposDelTorneo } from '../hooks/useEquiposDelTorneo';
import { SelectorEquipo } from './SelectorEquipo';
import '../inscripciones.css';

export interface PasoEquipoNominaProps {
  torneo: Torneo;
  /**
   * El borrador que se retoma. Sin él es el alta: todavía no se llamó a la API y el borrador se crea
   * al guardar. Tiene que estar en BORRADOR; quien lo renderiza se ocupa de redirigir las demás.
   */
  inscripcion?: InscripcionDetalle | null;
}

const jugadores = (n: number) => `${n} ${n === 1 ? 'jugador' : 'jugadores'}`;

/**
 * Paso 1 de la inscripción (HU-204): equipo, nómina y reglamento. Sirve para el alta y para retomar
 * un borrador, y guarda y navega solo (al paso 2 o al inicio).
 */
export const PasoEquipoNomina: React.FC<PasoEquipoNominaProps> = ({ torneo, inscripcion }) => {
  const { user } = useAuth();
  const minimo = torneo.tamanioEquipo ?? 1;
  const maximo = torneo.nominaMaxima;

  const { equipos, error: errorEquipos } = useEquiposDelTorneo(torneo.id, inscripcion?.id, true);
  const [equipoElegido, setEquipoElegido] = useState(
    inscripcion?.equipo ? String(inscripcion.equipo.id) : ''
  );
  const [nombreNuevo, setNombreNuevo] = useState('');

  return (
    <div className="inscripcion-page">
      <header className="inscripcion-encabezado">
        <h1>Inscripción de Equipo</h1>
        <span className="inscripcion-paso">Paso 1/2</span>
      </header>

      <Card className="inscripcion-torneo">
        <strong>{torneo.nombre}</strong>
        <span>
          Nómina de {minimo} a {maximo} jugadores
        </span>
      </Card>

      {errorEquipos && (
        <div className="alerta alerta-peligro" role="alert">
          {errorEquipos}
        </div>
      )}

      <SelectorEquipo
        equipos={equipos}
        valor={equipoElegido}
        onValor={setEquipoElegido}
        nombreNuevo={nombreNuevo}
        onNombreNuevo={setNombreNuevo}
      />

      <section aria-labelledby="nomina-titulo" className="inscripcion-bloque">
        <h2 id="nomina-titulo" className="inscripcion-etiqueta">
          Armado de Nómina
        </h2>
        <ul className="nomina-lista">
          <li className="nomina-fila">
            <span className="nomina-avatar nomina-avatar-capitan" aria-hidden="true">
              C
            </span>
            <span className="nomina-datos">
              <strong>{user?.name || user?.username} (Capitán)</strong>
              <small>@{user?.username}</small>
            </span>
          </li>
        </ul>
        <p className="inscripcion-contador">
          {jugadores(1)} (mínimo {minimo}, máximo {maximo})
        </p>
      </section>
    </div>
  );
};
