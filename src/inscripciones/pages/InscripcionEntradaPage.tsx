import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Torneo, torneoApi } from '../../api/torneoApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { PasoEquipoNomina } from '../components/PasoEquipoNomina';
import '../inscripciones.css';

// TODO (PICA-211, F1): punto de entrada. Falta decidir a dónde ir según las inscripciones propias del
// usuario en el torneo (borrador, pendiente de pago, confirmada). Por ahora solo abre el alta vacía.
export const InscripcionEntradaPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setTorneo(null);
    setError(null);
    torneoApi
      .obtenerPorSlug(slug ?? '')
      .then((t) => vigente && setTorneo(t))
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar el torneo.')));
    return () => {
      vigente = false;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="inscripcion-page">
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      </div>
    );
  }
  if (!torneo) {
    return (
      <div className="inscripcion-page">
        <p className="inscripcion-cargando">Cargando torneo...</p>
      </div>
    );
  }
  return <PasoEquipoNomina torneo={torneo} />;
};
