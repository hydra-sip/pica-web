import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { inscripcionApi, InscripcionResumen } from '../../api/inscripcionApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Card } from '../../shared/ui';
import { IconoAlerta, IconoTrofeo } from '../../shared/ui/Iconos';
import { ESTADO_TORNEO_UI, TONO_ESTADO_TORNEO } from '../../torneos/formato';
import { ESTADO_INSCRIPCION, ROL_EN_INSCRIPCION } from '../formato';
import '../inscripciones.css';

// Como las otras pantallas "Mis …": una sola página, sin paginar
const TAMANIO = 100;

/** Lo que queda por hacer con la inscripción, a donde lo lleva también la entrada; las demás no tienen acción. */
const accionDe = (i: InscripcionResumen): { texto: string; ruta: string } | null => {
  switch (i.estado) {
    case 'BORRADOR':
      return { texto: 'Seguir la inscripción', ruta: `/inscripciones/${i.id}/nomina` };
    case 'PENDIENTE_PAGO':
      return { texto: 'Pagar', ruta: `/inscripciones/${i.id}/pago` };
    case 'CONFIRMADA':
      return { texto: 'Ver mi inscripción', ruta: `/inscripciones/${i.id}` };
    default:
      return null;
  }
};

/**
 * Mis inscripciones (HU-209): los torneos en los que estoy inscripto, también los de equipos ajenos en cuya
 * nómina figuro. Las canceladas no se muestran: no sirven para seguir un torneo.
 */
export const MisInscripcionesPage: React.FC = () => {
  const [inscripciones, setInscripciones] = useState<InscripcionResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    inscripcionApi
      .listarMias({ size: TAMANIO })
      .then((p) => vigente && setInscripciones(p.content.filter((i) => i.estado !== 'CANCELADA')))
      .catch(
        (err) =>
          vigente && setError(mensajeDeError(err, 'No se pudieron cargar tus inscripciones.'))
      );
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <div className="inscripcion-page mis-inscripciones">
      <header className="inscripcion-encabezado">
        <h1>Mis inscripciones</h1>
        <p>Los torneos en los que estás inscripto, también como jugador de otro equipo.</p>
      </header>

      {error && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>{error}</span>
        </div>
      )}

      {inscripciones === null && !error && <p>Cargando tus inscripciones...</p>}

      {inscripciones?.length === 0 && (
        <Card className="mis-inscripciones-vacio">
          <IconoTrofeo size={36} />
          <h2>Todavía no estás inscripto en ningún torneo</h2>
          <Link to="/" className="btn btn-primary">
            Explorar torneos
          </Link>
        </Card>
      )}

      {inscripciones && inscripciones.length > 0 && (
        <ul className="mis-inscripciones-lista">
          {inscripciones.map((i) => {
            const accion = accionDe(i);
            return (
              <li key={i.id} aria-labelledby={`inscripcion-${i.id}`}>
                <Card className="mi-inscripcion-fila">
                  <div className="mi-inscripcion-cabecera">
                    <h2 id={`inscripcion-${i.id}`}>{i.torneo.nombre}</h2>
                    <Badge tone={TONO_ESTADO_TORNEO[i.torneo.estado]}>
                      {ESTADO_TORNEO_UI[i.torneo.estado]}
                    </Badge>
                  </div>
                  <p className="mi-inscripcion-dato">
                    {i.equipo && <span>{i.equipo.nombre}</span>}
                    <span>{ROL_EN_INSCRIPCION[i.rol]}</span>
                    <Badge tone={ESTADO_INSCRIPCION[i.estado].tono}>
                      {ESTADO_INSCRIPCION[i.estado].texto}
                    </Badge>
                  </p>
                  <div className="inscripcion-acciones mi-inscripcion-acciones">
                    {accion && (
                      <Link to={accion.ruta} className="btn btn-primary">
                        {accion.texto}
                      </Link>
                    )}
                    {i.torneo.slug && (
                      <Link to={`/torneos/${i.torneo.slug}`} className="btn btn-secondary">
                        Ver torneo
                      </Link>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
