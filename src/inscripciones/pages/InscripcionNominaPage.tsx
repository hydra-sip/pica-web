import React from 'react';
import { useParams } from 'react-router-dom';

// TODO (PICA-211, F2): paso 1, equipo y nómina (también el alta, retomando un borrador). Hoy es solo
// un relleno para que exista la ruta.
export const InscripcionNominaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <p>Equipo y nómina de la inscripción {id}</p>;
};
