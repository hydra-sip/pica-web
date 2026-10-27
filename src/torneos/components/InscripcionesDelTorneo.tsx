import React, { useEffect, useState } from 'react';
import { EstadoInscripcion, InscripcionDelTorneo, torneoApi } from '../../api/torneoApi';
import { PageResponse } from '../../api/usuarioApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Button, Card, Table } from '../../shared/ui';
import { formatFecha } from '../utils/formatters';

const TAMANIO_PAGINA = 20;

/** Los que lista el back: los borradores son privados del capitán mientras arma. */
const ESTADOS: Exclude<EstadoInscripcion, 'BORRADOR'>[] = [
  'CONFIRMADA',
  'PENDIENTE_PAGO',
  'CANCELADA',
  'REINTEGRADA',
];

const ESTADO_UI: Record<EstadoInscripcion, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_PAGO: 'Pendiente de pago',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REINTEGRADA: 'Reintegrada',
};

const TONO: Record<EstadoInscripcion, BadgeTone> = {
  BORRADOR: 'neutral',
  PENDIENTE_PAGO: 'aviso',
  CONFIRMADA: 'exito',
  CANCELADA: 'neutral',
  REINTEGRADA: 'info',
};

const participante = (i: InscripcionDelTorneo): { nombre: string; detalle: string } => {
  if (i.equipo && i.capitan) {
    const jugadores = i.jugadores === 1 ? '1 jugador' : `${i.jugadores ?? 0} jugadores`;
    return { nombre: i.equipo.nombre, detalle: `Capitán @${i.capitan.username} · ${jugadores}` };
  }
  return {
    nombre: i.usuario ? `${i.usuario.nombres} ${i.usuario.apellidos}` : '—',
    detalle: i.usuario ? `@${i.usuario.username}` : '',
  };
};

interface InscripcionesDelTorneoProps {
  torneoId: number;
  /** Cambia para volver a pedir la lista: por ejemplo, después de cerrar la inscripción. */
  recarga: number;
}

/**
 * Las inscripciones del torneo en la consola (HU-206, PICA-214), de la más vieja a la más nueva, con un filtro por
 * estado. Filtra y pagina el back. Sin link a la nómina: "Mi inscripción" supone que quien mira es el capitán.
 */
export const InscripcionesDelTorneo: React.FC<InscripcionesDelTorneoProps> = ({
  torneoId,
  recarga,
}) => {
  const [estado, setEstado] = useState<EstadoInscripcion | null>(null);
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<PageResponse<InscripcionDelTorneo> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    torneoApi
      .inscripciones(torneoId, { estado: estado ?? undefined, page: pagina, size: TAMANIO_PAGINA })
      .then((d) => vigente && setDatos(d))
      .catch(
        (err) =>
          vigente && setError(mensajeDeError(err, 'No se pudieron cargar las inscripciones.'))
      )
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [torneoId, estado, pagina, recarga]);

  const elegir = (e: EstadoInscripcion | null) => {
    setEstado(e);
    setPagina(0);
  };

  const desde = pagina * TAMANIO_PAGINA;

  return (
    <Card>
      <div className="torneos-tarjeta-titulo">
        <h2>Inscripciones</h2>
      </div>

      <div className="torneos-pestanas" role="group" aria-label="Filtrar inscripciones por estado">
        <button
          type="button"
          className={`torneos-pestana${estado === null ? ' activa' : ''}`}
          aria-pressed={estado === null}
          onClick={() => elegir(null)}
        >
          Todas
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            type="button"
            className={`torneos-pestana${estado === e ? ' activa' : ''}`}
            aria-pressed={estado === e}
            onClick={() => elegir(e)}
          >
            {ESTADO_UI[e]}
          </button>
        ))}
      </div>

      {error ? (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      ) : !datos && cargando ? (
        <p className="torneos-vacio" role="status">
          Cargando inscripciones...
        </p>
      ) : datos && datos.content.length === 0 ? (
        <p className="torneos-vacio">
          {estado === null
            ? 'Todavía no hay inscripciones.'
            : 'No hay inscripciones en ese estado.'}
        </p>
      ) : (
        datos && (
          <Table caption="Inscripciones del torneo" aria-busy={cargando}>
            <thead>
              <tr>
                <th scope="col">Participante</th>
                <th scope="col">Estado</th>
                <th scope="col">Inscripción</th>
              </tr>
            </thead>
            <tbody>
              {datos.content.map((i) => {
                const { nombre, detalle } = participante(i);
                return (
                  <tr key={i.id}>
                    <td>
                      <span className="torneos-nombre-fila">{nombre}</span>
                      {detalle && <span className="torneos-celda-secundaria">{detalle}</span>}
                    </td>
                    <td>
                      <Badge tone={TONO[i.estado]}>{ESTADO_UI[i.estado]}</Badge>
                    </td>
                    <td>{formatFecha(i.creadoEn)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )
      )}

      {datos && datos.page.totalElements > 0 && (
        <div className="torneos-paginacion">
          <span>
            Mostrando {desde + 1} a {desde + datos.content.length} de {datos.page.totalElements}
          </span>
          {datos.page.totalPages > 1 && (
            <div>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagina === 0 || cargando}
                onClick={() => setPagina((p) => p - 1)}
              >
                ← Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagina + 1 >= datos.page.totalPages || cargando}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente →
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
