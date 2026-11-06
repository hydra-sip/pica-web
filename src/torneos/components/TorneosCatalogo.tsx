import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { torneoApi } from '../../api/torneoApi';
import { TorneoResumen, EstadoTorneo, ModalidadTorneo, PageMetadata } from '../types/torneo';
import { TorneoCard } from './TorneoCard';
import { TorneoFilters } from './TorneoFilters';
import { TorneoPagination } from './TorneoPagination';
import { TorneoCardSkeleton } from './TorneoSkeleton';
import { IconoAlerta, IconoRefrescar, IconoBuscar } from '../../shared/ui/Iconos';

interface TorneosCatalogoProps {
  pageSize?: number;
}

export const TorneosCatalogo: React.FC<TorneosCatalogoProps> = ({ pageSize = 9 }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = searchParams.get('q') || '';
  const modalidadParam = (searchParams.get('modalidad') as ModalidadTorneo) || '';
  const estadoParam = (searchParams.get('estado') as EstadoTorneo) || '';
  const pageParam = parseInt(searchParams.get('page') || '0', 10);

  const [torneos, setTorneos] = useState<TorneoResumen[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMetadata>({
    size: pageSize,
    number: 0,
    totalElements: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Solo vale la respuesta de la última consulta: una anterior puede llegar después y pisarla.
  const ultimaConsulta = useRef(0);

  const fetchTorneos = useCallback(async () => {
    const consulta = ++ultimaConsulta.current;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await torneoApi.getTorneosResumen({
        q: qParam || undefined,
        modalidad: modalidadParam || undefined,
        estado: estadoParam || undefined,
        page: pageParam,
        size: pageSize,
      });
      if (consulta !== ultimaConsulta.current) return;

      setTorneos(response.content || []);
      setPageMeta(
        response.page || {
          size: pageSize,
          number: pageParam,
          totalElements: response.content ? response.content.length : 0,
          totalPages: 1,
        }
      );
    } catch (err: unknown) {
      if (consulta !== ultimaConsulta.current) return;
      console.error('Error al cargar torneos:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cargar la lista de torneos. Por favor, reintentá.';
      setErrorMsg(msg);
    } finally {
      if (consulta === ultimaConsulta.current) setIsLoading(false);
    }
  }, [qParam, modalidadParam, estadoParam, pageParam, pageSize]);

  useEffect(() => {
    fetchTorneos();
  }, [fetchTorneos]);

  const handleQChange = (nuevoQ: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nuevoQ) {
      nextParams.set('q', nuevoQ);
    } else {
      nextParams.delete('q');
    }
    nextParams.set('page', '0');
    setSearchParams(nextParams);
  };

  const handleModalidadChange = (nuevaModalidad: ModalidadTorneo | '') => {
    const nextParams = new URLSearchParams(searchParams);
    if (nuevaModalidad) {
      nextParams.set('modalidad', nuevaModalidad);
    } else {
      nextParams.delete('modalidad');
    }
    nextParams.set('page', '0');
    setSearchParams(nextParams);
  };

  /** El chip "Todos": saca la búsqueda y la modalidad, y deja el estado como está. */
  const handleVerTodos = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    nextParams.delete('modalidad');
    nextParams.set('page', '0');
    setSearchParams(nextParams);
  };

  const handleEstadoChange = (nuevoEstado: EstadoTorneo | '') => {
    const nextParams = new URLSearchParams(searchParams);
    if (nuevoEstado) {
      nextParams.set('estado', nuevoEstado);
    } else {
      nextParams.delete('estado');
    }
    nextParams.set('page', '0');
    setSearchParams(nextParams);
  };

  const handlePageChange = (nuevaPagina: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nuevaPagina));
    setSearchParams(nextParams);

    const seccion = document.getElementById('catalogo-torneos');
    if (seccion) {
      seccion.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    nextParams.delete('modalidad');
    nextParams.delete('estado');
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  return (
    <section id="catalogo-torneos" aria-label="Catálogo de torneos" style={{ width: '100%' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: '0.25rem' }}>
          Torneos Disponibles
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          Explorá los torneos publicados, consultá sus bases, cupos y premios para elegir en cuál
          inscribirte.
        </p>
      </div>

      {/* Filtros: búsqueda (con debounce), modalidad, estado (selector sin borrador) y reset */}
      <TorneoFilters
        q={qParam}
        modalidad={modalidadParam}
        estado={estadoParam}
        onQChange={handleQChange}
        onModalidadChange={handleModalidadChange}
        onEstadoChange={handleEstadoChange}
        onVerTodos={handleVerTodos}
        onReset={handleResetFilters}
      />

      {/* Manejo de estados: Error, Cargando, Vacío y Lista */}
      {errorMsg ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-6) var(--space-4)',
            borderColor: 'var(--color-danger-border)',
            backgroundColor: 'var(--color-danger-bg)',
          }}
        >
          <div style={{ marginBottom: 'var(--space-2)', color: 'var(--color-danger)', display: 'flex', justifyContent: 'center' }}>
            <IconoAlerta size={40} />
          </div>
          <h3
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--color-danger)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Error al cargar los torneos
          </h3>
          <p
            style={{
              color: 'var(--color-text)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {errorMsg}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={fetchTorneos}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <IconoRefrescar size={16} />
            <span>Reintentar</span>
          </button>
        </div>
      ) : isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <TorneoCardSkeleton key={`skeleton-${idx}`} />
          ))}
        </div>
      ) : torneos.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-6) var(--space-4)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div style={{ marginBottom: 'var(--space-2)', color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
            <IconoBuscar size={40} />
          </div>
          <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
            No se encontraron torneos
          </h3>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              maxWidth: '460px',
              margin: '0 auto var(--space-4)',
            }}
          >
            No hay competencias que coincidan con los filtros aplicados. Podés probar buscando otra
            disciplina o restableciendo los criterios de búsqueda.
          </p>
          <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {torneos.map((torneo) => (
              <TorneoCard key={torneo.id} torneo={torneo} />
            ))}
          </div>

          <TorneoPagination
            currentPage={pageMeta.number}
            totalPages={pageMeta.totalPages}
            totalElements={pageMeta.totalElements}
            pageSize={pageMeta.size}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </section>
  );
};
