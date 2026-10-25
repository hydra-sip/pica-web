import React from 'react';
import { useParams } from 'react-router-dom';

// TODO (PICA-211, F3): paso 2, confirmar y pagar, y la pantalla final de inscripción confirmada. Hoy
// es solo un relleno para que exista la ruta.
export const InscripcionPagoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <p>Pago de la inscripción {id}</p>;
};
