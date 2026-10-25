import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { InscripcionResumen, inscripcionApi } from '../../api/inscripcionApi';
import { Torneo, torneoApi } from '../../api/torneoApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { PasoEquipoNomina } from '../components/PasoEquipoNomina';
import '../inscripciones.css';

interface Datos {
  torneo: Torneo;
  propias: InscripcionResumen[];
}

const inscripcionAbierta = (torneo: Torneo) =>
  torneo.estado === 'INSCRIPCION_ABIERTA' && new Date(torneo.cierreInscripcionEn) > new Date();

/**
 * `/torneos/:slug/inscripcion`: punto de entrada. Con el torneo y las inscripciones propias en él
 * decide a dónde ir. Orden de decisión (el primero que se cumple):
 *   1. Error de carga (torneo inexistente, cuenta bloqueada, sin conexión...): aviso, sin formulario.
 *   2. Una inscripción CONFIRMADA: aviso "ya estás inscripto". Va antes que el cierre y que un borrador,
 *      porque un borrador ya no se puede confirmar si hay una confirmada.
 *   3. Inscripción cerrada (estado distinto de abierta o fecha de cierre pasada): aviso. Va antes de
 *      PENDIENTE_PAGO y BORRADOR porque ni se paga ni se confirma en un torneo cerrado.
 *   4. Una PENDIENTE_PAGO: redirige al paso 2 (`/inscripciones/:id/pago`).
 *   5. Un BORRADOR (el más nuevo): redirige al paso 1 (`/inscripciones/:id/nomina`).
 *   6. Ninguna, o solo CANCELADAS y REINTEGRADAS: el paso 1 en modo alta. Un equipo con una cancelada
 *      sale deshabilitado en el selector.
 * No crea ningún borrador al entrar: el paso 1 lo crea cuando el participante continúa o guarda.
 */
export const InscripcionEntradaPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);
    (async () => {
      try {
        const torneo = await torneoApi.obtenerPorSlug(slug ?? '');
        const propias = await inscripcionApi.listarMias({ torneoId: torneo.id, size: 100 });
        if (vigente) setDatos({ torneo, propias: propias.content });
      } catch (err) {
        if (vigente) setError(mensajeDeError(err, 'No se pudo cargar el torneo.'));
      }
    })();
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
  if (!datos) {
    return (
      <div className="inscripcion-page">
        <p className="inscripcion-cargando">Cargando torneo...</p>
      </div>
    );
  }

  const confirmada = datos.propias.find((i) => i.estado === 'CONFIRMADA');
  if (confirmada) {
    return (
      <div className="inscripcion-page">
        <div className="alerta alerta-aviso" role="alert">
          Ya estás inscripto en este torneo.
        </div>
        <div className="inscripcion-acciones">
          <Link to={`/inscripciones/${confirmada.id}/pago`} className="btn btn-primary btn-block">
            Ver mi inscripción
          </Link>
          <Link to="/" className="btn btn-secondary btn-block">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }
  if (!inscripcionAbierta(datos.torneo)) {
    return (
      <div className="inscripcion-page">
        <div className="alerta alerta-aviso" role="alert">
          La inscripción a {datos.torneo.nombre} no está abierta o ya cerró.
        </div>
        <div className="inscripcion-acciones">
          <Link to="/" className="btn btn-secondary btn-block">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }
  const pendiente = datos.propias.find((i) => i.estado === 'PENDIENTE_PAGO');
  if (pendiente) return <Navigate to={`/inscripciones/${pendiente.id}/pago`} replace />;
  const borrador = datos.propias.find((i) => i.estado === 'BORRADOR');
  if (borrador) return <Navigate to={`/inscripciones/${borrador.id}/nomina`} replace />;
  return <PasoEquipoNomina torneo={datos.torneo} />;
};
