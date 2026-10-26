import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { torneoApi } from '../../api/torneoApi';
import { TorneoResumen, EstadoTorneo, PageMetadata } from '../types/torneo';
import { TorneoCard } from './TorneoCard';
import { TorneoFilters } from './TorneoFilters';
import { TorneoPagination } from './TorneoPagination';
import { TorneoCardSkeleton } from './TorneoSkeleton';

interface TorneosCatalogoProps {
  pageSize?: number;
}

export const TorneosCatalogo: React.FC<TorneosCatalogoProps> = ({ pageSize = 9 }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const disciplinaParam = searchParams.get('disciplina') || '';
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

  const fetchTorneos = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await torneoApi.getTorneosResumen({
        disciplina: disciplinaParam || undefined,
        estado: estadoParam || undefined,
        page: pageParam,
        size: pageSize,
      });

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
      console.error('Error al cargar torneos:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cargar la lista de torneos. Por favor, reintentá.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [disciplinaParam, estadoParam, pageParam, pageSize]);

  useEffect(() => {
    fetchTorneos();
  }, [fetchTorneos]);

  const handleDisciplinaChange = (nuevaDisciplina: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nuevaDisciplina) {
      nextParams.set('disciplina', nuevaDisciplina);
    } else {
      nextParams.delete('disciplina');
    }
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
    nextParams.delete('disciplina');
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

      {/* Filtros: disciplina (con debounce), estado (selector sin borrador) y reset */}
      <TorneoFilters
        disciplina={disciplinaParam}
        estado={estadoParam}
        onDisciplinaChange={handleDisciplinaChange}
        onEstadoChange={handleEstadoChange}
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
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>⚠️</div>
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
          <button type="button" className="btn btn-primary" onClick={fetchTorneos}>
            🔄 Reintentar
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
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🔍</div>
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
