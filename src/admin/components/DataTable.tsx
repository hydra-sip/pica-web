import React, { useMemo, useState } from 'react';
import { StatusChip, EntityStatus } from './StatusChip';
import { ConfirmModal } from './ConfirmModal';

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, any>> {
  title?: string;
  description?: string;
  data: T[];
  columns: ColumnDef<T>[];
  searchFields?: (keyof T | string)[];
  statusField?: keyof T | string;
  idField?: keyof T | string;
  onCreate?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => Promise<void> | void;
  onReactivate?: (item: T) => Promise<void> | void;
  isLoading?: boolean;
  createButtonText?: string;
  // Extra filters & custom actions
  extraFilters?: React.ReactNode;
  customActions?: (item: T) => React.ReactNode;
  // Filas que no se pueden editar, dar de baja ni reactivar (ej.: usuario con protegido: true)
  isReadOnly?: (item: T) => boolean;
  // Opciones del filtro de estado; usuarios tiene otros estados que personas y roles
  statusOptions?: { value: string; label: string }[];

  // Server-side control props
  serverSide?: boolean;
  page?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSortChange?: (sortColumn: string, sortDirection: 'asc' | 'desc') => void;
  onSearchChange?: (searchTerm: string) => void;
  onStatusFilterChange?: (status: string) => void;
}

const ESTADOS_POR_DEFECTO = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
  { value: 'ELIMINADO', label: 'Eliminados' },
];

export function DataTable<T extends Record<string, any>>({
  title,
  description,
  data = [],
  columns,
  searchFields = [],
  statusField = 'estado',
  idField = 'id',
  onCreate,
  onView,
  onEdit,
  onDelete,
  onReactivate,
  isLoading = false,
  createButtonText = 'Nuevo Registro',
  extraFilters,
  customActions,
  isReadOnly,
  statusOptions = ESTADOS_POR_DEFECTO,
  serverSide = false,
  page: propPage,
  pageSize: propPageSize,
  totalElements: propTotalElements,
  totalPages: propTotalPages,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  onStatusFilterChange,
}: DataTableProps<T>) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>('TODOS');
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc');
  const [internalCurrentPage, setInternalCurrentPage] = useState<number>(1);
  const [internalPageSize, setInternalPageSize] = useState<number>(5);

  const isServer = serverSide || !!onPageChange;

  const searchTerm = internalSearchTerm;
  const selectedStatusFilter = internalStatusFilter;
  const sortColumn = internalSortColumn;
  const sortDirection = internalSortDirection;

  const currentPage = isServer ? (propPage ?? 1) : internalCurrentPage;
  const pageSize = isServer ? (propPageSize ?? 20) : internalPageSize;

  // Modals for confirmation (Baja / Reactivar)
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    type: 'delete' | 'reactivate' | null;
    item: T | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    type: null,
    item: null,
    isLoading: false,
  });

  // Handle sort column click
  const handleSort = (colKey: string, sortable?: boolean) => {
    if (!sortable) return;
    let nextDir: 'asc' | 'desc' = 'asc';
    let nextCol: string | null = colKey;

    if (sortColumn === colKey) {
      if (sortDirection === 'asc') {
        nextDir = 'desc';
      } else {
        nextCol = null;
        nextDir = 'asc';
      }
    }

    setInternalSortColumn(nextCol);
    setInternalSortDirection(nextDir);
    if (onSortChange) {
      onSortChange(nextCol || '', nextDir);
    }
  };

  const handleSearchChange = (term: string) => {
    setInternalSearchTerm(term);
    if (!isServer) setInternalCurrentPage(1);
    if (onSearchChange) onSearchChange(term);
  };

  const handleStatusChange = (status: string) => {
    setInternalStatusFilter(status);
    if (!isServer) setInternalCurrentPage(1);
    if (onStatusFilterChange) onStatusFilterChange(status);
  };

  const handlePageChange = (newPage: number) => {
    if (!isServer) setInternalCurrentPage(newPage);
    if (onPageChange) onPageChange(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    if (!isServer) {
      setInternalPageSize(newSize);
      setInternalCurrentPage(1);
    }
    if (onPageSizeChange) onPageSizeChange(newSize);
  };

  // Filtered and sorted data (for client-side mode)
  const filteredAndSortedData = useMemo(() => {
    if (isServer) return data;
    let result = [...data];

    // Status Filter
    if (selectedStatusFilter !== 'TODOS') {
      result = result.filter((item) => {
        const itemStatus = String(item[statusField as string] || '').toUpperCase();
        return itemStatus === selectedStatusFilter;
      });
    }

    // Search Filter
    if (searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) => {
        if (searchFields.length > 0) {
          return searchFields.some((field) => {
            const val = item[field as string];
            if (val === null || val === undefined) return false;
            if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(term);
            return String(val).toLowerCase().includes(term);
          });
        }
        return Object.values(item).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(term);
          return String(val).toLowerCase().includes(term);
        });
      });
    }

    // Sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        let cmp = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else {
          cmp = String(valA).localeCompare(String(valB));
        }

        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, selectedStatusFilter, searchTerm, searchFields, statusField, sortColumn, sortDirection, isServer]);

  // Page calculations
  const totalItems = isServer ? (propTotalElements ?? data.length) : filteredAndSortedData.length;
  const totalPages = isServer ? (propTotalPages ?? 1) : (Math.ceil(totalItems / pageSize) || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedData = useMemo(() => {
    if (isServer) return data;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [isServer, data, filteredAndSortedData, safeCurrentPage, pageSize]);

  // Action modal triggers
  const triggerDelete = (item: T) => {
    setConfirmModalState({
      isOpen: true,
      type: 'delete',
      item,
      isLoading: false,
    });
  };

  const triggerReactivate = (item: T) => {
    setConfirmModalState({
      isOpen: true,
      type: 'reactivate',
      item,
      isLoading: false,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModalState.item || !confirmModalState.type) return;

    setConfirmModalState((prev) => ({ ...prev, isLoading: true }));
    try {
      if (confirmModalState.type === 'delete' && onDelete) {
        await onDelete(confirmModalState.item);
      } else if (confirmModalState.type === 'reactivate' && onReactivate) {
        await onReactivate(confirmModalState.item);
      }
      setConfirmModalState({ isOpen: false, type: null, item: null, isLoading: false });
    } catch (error) {
      console.error('Error al ejecutar acción:', error);
      setConfirmModalState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header bar: Title & Create button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          {title && <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>{title}</h2>}
          {description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {description}
            </p>
          )}
        </div>

        {onCreate && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onCreate}
            style={{ fontSize: '0.875rem', padding: '0.55rem 1.15rem' }}
          >
            + {createButtonText}
          </button>
        )}
      </div>

      {/* Control bar: Search, Status filter, Page size */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          {/* Búsqueda libre */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '380px' }}>
            <input
              type="text"
              placeholder="Buscar en la tabla..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
          </div>

          {/* Filtro de Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Estado:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {statusOptions.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Extra filters */}
          {extraFilters}
        </div>

        {/* Page size selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Filas por página:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.875rem',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  style={{
                    padding: '0.85rem 1rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {col.label}
                    {col.sortable && (
                      <span style={{ fontSize: '0.75rem', color: sortColumn === col.key ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {sortColumn === col.key ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {(onView || onEdit || onDelete || onReactivate || customActions) && (
                <th
                  style={{
                    padding: '0.85rem 1rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textAlign: 'right',
                  }}
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (onView || onEdit || onDelete || onReactivate || customActions ? 1 : 0)}
                  style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}
                >
                  Cargando información...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onView || onEdit || onDelete || onReactivate || customActions ? 1 : 0)}
                  style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}
                >
                  No se encontraron registros que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => {
                const itemId = item[idField as string] || idx;
                const itemStatus = String(item[statusField as string] || '').toUpperCase();
                // el contrato marca la baja lógica con eliminado: true; 'ELIMINADO' queda para las pantallas con datos locales
                const isEliminado = item.eliminado === true || itemStatus === 'ELIMINADO';
                const soloLectura = isReadOnly ? isReadOnly(item) : false;

                return (
                  <tr
                    key={itemId}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                        {col.render
                          ? col.render(item)
                          : col.key === statusField
                          ? <StatusChip status={(isEliminado ? 'ELIMINADO' : item[statusField as string]) as EntityStatus} />
                          : String(item[col.key] ?? '-')}
                      </td>
                    ))}

                    {/* Action buttons */}
                    {(onView || onEdit || onDelete || onReactivate || customActions) && (
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {customActions && customActions(item)}

                          {onView && (
                            <button
                              type="button"
                              title="Ver detalle"
                              onClick={() => onView(item)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                padding: '0.35rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                            >
                              👁️ Ver
                            </button>
                          )}

                          {onEdit && !isEliminado && !soloLectura && (
                            <button
                              type="button"
                              title="Editar registro"
                              onClick={() => onEdit(item)}
                              style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: 'var(--accent-secondary)',
                                padding: '0.35rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                            >
                              ✏️ Editar
                            </button>
                          )}

                          {onDelete && !isEliminado && !soloLectura && (
                            <button
                              type="button"
                              title="Dar de baja"
                              onClick={() => triggerDelete(item)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                padding: '0.35rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                            >
                              🗑️ Baja
                            </button>
                          )}

                          {onReactivate && isEliminado && !soloLectura && (
                            <button
                              type="button"
                              title="Reactivar registro"
                              onClick={() => triggerReactivate(item)}
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#10b981',
                                padding: '0.35rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                            >
                              🔄 Reactivar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          paddingTop: '0.5rem',
        }}
      >
        <div>
          Mostrando {totalItems > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0} a{' '}
          {Math.min(safeCurrentPage * pageSize, totalItems)} de {totalItems} registros
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: safeCurrentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            &laquo; Anterior
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              type="button"
              onClick={() => handlePageChange(pg)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: pg === safeCurrentPage ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                backgroundColor: pg === safeCurrentPage ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: pg === safeCurrentPage ? 'var(--accent-secondary)' : 'var(--text-primary)',
                fontWeight: pg === safeCurrentPage ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {pg}
            </button>
          ))}

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: safeCurrentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Siguiente &raquo;
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Delete/Reactivate */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.type === 'delete' ? 'Confirmar Baja' : 'Confirmar Reactivación'}
        message={
          confirmModalState.type === 'delete'
            ? `¿Está seguro de que desea dar de baja este registro? El estado cambiará a ELIMINADO.`
            : `¿Desea reactivar este registro? El estado volverá a ser ACTIVO.`
        }
        confirmText={confirmModalState.type === 'delete' ? 'Dar de Baja' : 'Reactivar'}
        variant={confirmModalState.type === 'delete' ? 'danger' : 'primary'}
        isLoading={confirmModalState.isLoading}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmModalState({ isOpen: false, type: null, item: null, isLoading: false })}
      />
    </div>
  );
}
