import React from 'react';
import { Link } from 'react-router-dom';

interface VolverAlTorneoProps {
  /** Null mientras el torneo no se publicó: entonces no hay ficha a la que volver. */
  slug: string | null | undefined;
}

/** "← Ver torneo": desde cualquier pantalla de la inscripción se vuelve a la ficha (CE4-4). */
export const VolverAlTorneo: React.FC<VolverAlTorneoProps> = ({ slug }) =>
  slug ? (
    <Link to={`/torneos/${slug}`} className="inscripcion-volver">
      ← Ver torneo
    </Link>
  ) : null;
