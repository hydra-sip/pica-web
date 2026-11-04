import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoDesignacion, MiDesignacion, PermisoArbitro, torneoApi } from '../../api/torneoApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Button, Card, Modal } from '../../shared/ui';
import { IconoAlerta, IconoEscudo } from '../../shared/ui/Iconos';
import '../torneos.css';

const PERMISO: Record<PermisoArbitro, string> = {
  CARGAR_RESULTADOS: 'Cargar y validar resultados',
  RESOLVER_OBJECIONES: 'Resolver objeciones',
};

const ESTADO: Record<EstadoDesignacion, { texto: string; tono: BadgeTone }> = {
  PENDIENTE: { texto: 'Esperando tu respuesta', tono: 'aviso' },
  ACEPTADO: { texto: 'Aceptaste', tono: 'exito' },
  RECHAZADO: { texto: 'Rechazaste', tono: 'peligro' },
};

/**
 * "Mis designaciones" (HU-807, PICA-315): los torneos donde el organizador te designó árbitro, con los permisos
 * que te propone. Hasta que aceptás no cargás resultados ni resolvés objeciones; si rechazás, el organizador
 * puede designar a otro.
 */
export const MisDesignacionesPage: React.FC = () => {
  const [designaciones, setDesignaciones] = useState<MiDesignacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [aRechazar, setARechazar] = useState<MiDesignacion | null>(null);

  useEffect(() => {
    let vigente = true;
    torneoApi
      .misDesignaciones()
      .then((d) => vigente && setDesignaciones(d))
      .catch(
        (err) =>
          vigente && setError(mensajeDeError(err, 'No se pudieron cargar tus designaciones.'))
      );
    return () => {
      vigente = false;
    };
  }, []);

  const responder = async (d: MiDesignacion, aceptar: boolean) => {
    setOcupado(d.torneoId);
    setError(null);
    try {
      const respondida = aceptar
        ? await torneoApi.aceptarDesignacion(d.torneoId)
        : await torneoApi.rechazarDesignacion(d.torneoId);
      setDesignaciones((actuales) =>
        (actuales ?? []).map((a) => (a.torneoId === d.torneoId ? respondida : a))
      );
      setARechazar(null);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo responder la designación.'));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="torneos-page">
      <header className="torneos-encabezado">
        <div>
          <div className="torneos-titulo-con-chip">
            <h1>Mis designaciones</h1>
          </div>
          <p className="torneos-subtitulo">
            Los torneos donde te designaron árbitro. Hasta que aceptes no podés cargar resultados ni
            resolver objeciones.
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="alerta alerta-peligro">
          <IconoAlerta size={20} />
          <span>{error}</span>
        </div>
      )}

      {designaciones === null && !error && <p>Cargando tus designaciones...</p>}

      {designaciones?.length === 0 && (
        <Card className="torneos-vacio">
          <IconoEscudo size={36} />
          <h2>No tenés designaciones</h2>
          <p>Cuando un organizador te designe árbitro de un torneo, lo vas a ver acá.</p>
        </Card>
      )}

      {designaciones && designaciones.length > 0 && (
        <ul className="designaciones-lista">
          {designaciones.map((d) => (
            <li key={d.torneoId}>
              <Card className="designacion">
                <div className="designacion-cabecera">
                  <h2>{d.slug ? <Link to={`/torneos/${d.slug}`}>{d.torneo}</Link> : d.torneo}</h2>
                  <Badge tone={ESTADO[d.estado].tono}>{ESTADO[d.estado].texto}</Badge>
                </div>
                <p className="designacion-dato">Organiza: {d.organizador}</p>
                {d.fechaInicio && (
                  <p className="designacion-dato">Empieza: {fechaHora(d.fechaInicio)}</p>
                )}
                <p className="designacion-dato">
                  Permisos: {d.permisos.map((p) => PERMISO[p]).join(' · ')}
                </p>

                {d.estado === 'PENDIENTE' && (
                  <div className="designacion-acciones">
                    <Button
                      type="button"
                      disabled={ocupado !== null}
                      onClick={() => responder(d, true)}
                    >
                      Aceptar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={ocupado !== null}
                      onClick={() => setARechazar(d)}
                    >
                      Rechazar
                    </Button>
                  </div>
                )}
                {d.estado === 'ACEPTADO' && d.permisos.includes('RESOLVER_OBJECIONES') && (
                  <div className="designacion-acciones">
                    <Link to={`/torneos/${d.torneoId}/objeciones`} className="btn btn-secondary">
                      Ver objeciones
                    </Link>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={aRechazar !== null}
        title="¿Rechazar la designación?"
        onClose={() => setARechazar(null)}
        closeDisabled={ocupado !== null}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={ocupado !== null}
              onClick={() => setARechazar(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={ocupado !== null}
              onClick={() => aRechazar && responder(aRechazar, false)}
            >
              Rechazar
            </Button>
          </>
        }
      >
        <p>
          No vas a arbitrar {aRechazar?.torneo}. Al organizador le llega un aviso y puede designar a
          otro. Si después cambiás de idea, te tiene que volver a designar.
        </p>
      </Modal>
    </div>
  );
};
