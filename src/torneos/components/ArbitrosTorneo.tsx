import React, { useEffect, useState } from 'react';
import {
  ArbitroDetalle,
  ArbitroOpcion,
  EstadoDesignacion,
  PermisoArbitro,
  torneoApi,
} from '../../api/torneoApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Button, Input } from '../../shared/ui';

const PERMISOS: { codigo: PermisoArbitro; texto: string }[] = [
  { codigo: 'CARGAR_RESULTADOS', texto: 'Cargar y validar resultados' },
  { codigo: 'RESOLVER_OBJECIONES', texto: 'Resolver objeciones' },
];

const ESTADO: Record<EstadoDesignacion, { texto: string; tono: BadgeTone }> = {
  PENDIENTE: { texto: 'Pendiente de aceptación', tono: 'aviso' },
  ACEPTADO: { texto: 'Aceptó', tono: 'exito' },
  RECHAZADO: { texto: 'Rechazó', tono: 'peligro' },
};

const nombre = (a: { nombres: string; apellidos: string }) => `${a.nombres} ${a.apellidos}`;

interface ArbitrosTorneoProps {
  /** Null mientras el torneo no se guardó: los árbitros se designan sobre un borrador que ya existe. */
  torneoId: number | null;
  habilitado: boolean;
}

/**
 * "Designación de árbitros" del paso 2 (HU-203, wireframe "Wizard Paso 2 Cupos y Árbitros"). Cada designación
 * se guarda en el momento, como los gastos del paso 3. Sin datos de matrícula ni disponibilidad, cada árbitro
 * muestra los permisos que se le dieron.
 */
export const ArbitrosTorneo: React.FC<ArbitrosTorneoProps> = ({ torneoId, habilitado }) => {
  const [arbitros, setArbitros] = useState<ArbitroDetalle[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [opciones, setOpciones] = useState<ArbitroOpcion[]>([]);
  const [permisos, setPermisos] = useState<PermisoArbitro[]>(PERMISOS.map((p) => p.codigo));
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!torneoId) return;
    let vigente = true;
    torneoApi
      .arbitros(torneoId)
      .then((a) => vigente && setArbitros(a))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar los árbitros.'))
      );
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  // La búsqueda se manda cuando se deja de escribir.
  useEffect(() => {
    if (!torneoId || !habilitado) return;
    let vigente = true;
    const espera = setTimeout(() => {
      torneoApi
        .buscarArbitros(busqueda.trim())
        .then((pagina) => vigente && setOpciones(pagina.content))
        .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo buscar árbitros.')));
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [busqueda, torneoId, habilitado]);

  const ejecutar = async (accion: () => Promise<void>) => {
    setOcupado(true);
    setError(null);
    try {
      await accion();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el árbitro.'));
    } finally {
      setOcupado(false);
    }
  };

  const designar = (opcion: ArbitroOpcion) =>
    ejecutar(async () => {
      if (!torneoId) return;
      const designado = await torneoApi.designarArbitro(torneoId, opcion.id, permisos);
      setArbitros((actuales) => [...actuales, designado]);
    });

  const quitar = (arbitro: ArbitroDetalle) =>
    ejecutar(async () => {
      if (!torneoId) return;
      await torneoApi.quitarArbitro(torneoId, arbitro.usuarioId);
      setArbitros((actuales) => actuales.filter((a) => a.usuarioId !== arbitro.usuarioId));
    });

  const cambiarPermiso = (codigo: PermisoArbitro, elegido: boolean) =>
    setPermisos((actuales) =>
      elegido ? [...actuales, codigo] : actuales.filter((p) => p !== codigo)
    );

  const designados = new Set(arbitros.map((a) => a.usuarioId));

  return (
    <section className="torneos-seccion torneos-arbitros">
      <div className="torneos-arbitros-titulo">
        <h3>Designación de árbitros</h3>
        <Badge tone="borde">
          {arbitros.length} {arbitros.length === 1 ? 'árbitro' : 'árbitros'}
        </Badge>
      </div>
      <p className="torneos-arbitros-ayuda">
        Solo los árbitros que acepten la designación van a poder cargar resultados y resolver
        objeciones, según los permisos que les des.
      </p>

      {!torneoId ? (
        <p className="torneos-arbitros-ayuda">Guardá el borrador para designar árbitros.</p>
      ) : (
        <>
          {arbitros.length > 0 && (
            <ul className="torneos-arbitros-lista">
              {arbitros.map((a) => (
                <li key={a.usuarioId} className="torneos-arbitro">
                  <span className="torneos-arbitro-nombre">
                    <strong>{nombre(a)}</strong>
                    <span>@{a.username}</span>
                  </span>
                  <span className="torneos-arbitro-permisos">
                    {PERMISOS.filter((p) => a.permisos.includes(p.codigo))
                      .map((p) => p.texto)
                      .join(' · ')}
                  </span>
                  <Badge tone={ESTADO[a.estado].tono}>{ESTADO[a.estado].texto}</Badge>
                  {habilitado && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={ocupado}
                      onClick={() => quitar(a)}
                    >
                      Quitar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {habilitado && (
            <div className="torneos-arbitros-buscar">
              <Input
                type="search"
                aria-label="Buscar árbitro"
                placeholder="Buscar árbitro por nombre o usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <fieldset className="torneos-arbitros-permisos">
                <legend>Permisos para el que designes</legend>
                {PERMISOS.map((p) => (
                  <label key={p.codigo}>
                    <input
                      type="checkbox"
                      checked={permisos.includes(p.codigo)}
                      onChange={(e) => cambiarPermiso(p.codigo, e.target.checked)}
                    />
                    {p.texto}
                  </label>
                ))}
              </fieldset>
              {permisos.length === 0 && (
                <p className="torneos-opciones-error" role="alert">
                  Elegí al menos un permiso para designar.
                </p>
              )}
              {opciones.length === 0 ? (
                <p className="torneos-arbitros-ayuda">
                  No hay árbitros que coincidan con la búsqueda.
                </p>
              ) : (
                <ul className="torneos-arbitros-lista">
                  {opciones.map((o) => (
                    <li key={o.id} className="torneos-arbitro torneos-arbitro-opcion">
                      <span className="torneos-arbitro-nombre">
                        <strong>{nombre(o)}</strong>
                        <span>@{o.username}</span>
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={ocupado || permisos.length === 0 || designados.has(o.id)}
                        onClick={() => designar(o)}
                      >
                        {designados.has(o.id) ? 'Designado' : 'Designar'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && (
            <p className="torneos-opciones-error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
};
