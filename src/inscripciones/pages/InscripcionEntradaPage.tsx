import React from 'react';
import { useParams } from 'react-router-dom';

// TODO (PICA-211, F1): punto de entrada. Resuelve el torneo por slug y decide a dónde ir según las
// inscripciones propias del usuario en ese torneo. Hoy es solo un relleno para que exista la ruta.
export const InscripcionEntradaPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  return <p>Inscripción al torneo {slug}</p>;
};
