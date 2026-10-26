import React from 'react';

interface TorneoPaginationProps {
  currentPage: number; // 0-based
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}

export const TorneoPagination: React.FC<TorneoPaginationProps> = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    if (totalElements === 0) return null;
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 'var(--space-5)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Mostrando {totalElements} {totalElements === 1 ? 'torneo' : 'torneos'}
      </div>
    );
  }

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min(totalElements, (currentPage + 1) * pageSize);

  // Generar rango de números de página
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      if (start > 1) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 2) pages.push('...');
      pages.push(totalPages - 1);
    }

    return pages;
  };

  return (
    <nav
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginTop: 'var(--space-6)',
      }}
      aria-label="Paginación de torneos"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="Página anterior"
        >
          ‹ Anterior
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '0 0.5rem',
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                …
              </span>
            );
          }

          const pageIdx = p as number;
          const isActive = pageIdx === currentPage;
          return (
            <button
              key={pageIdx}
              type="button"
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onPageChange(pageIdx)}
              aria-label={`Página ${pageIdx + 1}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageIdx + 1}
            </button>
          );
        })}

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          aria-label="Página siguiente"
        >
          Siguiente ›
        </button>
      </div>

      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
        Página <strong>{currentPage + 1}</strong> de <strong>{totalPages}</strong> ({startItem} -{' '}
        {endItem} de <strong>{totalElements}</strong> torneos)
      </div>
    </nav>
  );
};
