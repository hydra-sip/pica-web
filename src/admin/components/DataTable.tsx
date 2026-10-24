import React, { useMemo, useState } from 'react';
import { StatusChip, EntityStatus } from './StatusChip';
import { ConfirmModal } from './ConfirmModal';
import { Button, Table } from '../../shared/ui';

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
  // Filas que se pueden editar pero no dar de baja (ej.: el usuario logueado sobre sí mismo, CE2-1)
  canDelete?: (item: T) => boolean;
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
  canDelete,
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

  const hayAcciones = !!(onView || onEdit || onDelete || onReactivate || customActions);
  const columnasTotales = columns.length + (hayAcciones ? 1 : 0);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Título y botón de alta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          {title && <h2 style={{ fontSize: 'var(--text-xl)' }}>{title}</h2>}
          {description && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{description}</p>
          )}
        </div>

        {onCreate && <Button onClick={onCreate}>+ {createButtonText}</Button>}
      </div>

      {/* Búsqueda, filtro de estado y filas por página */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          backgroundColor: 'var(--color-surface)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
          <input
            type="search"
            className="input"
            aria-label="Buscar en la tabla"
            placeholder="Buscar en la tabla..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ flex: '1 1 220px', maxWidth: '380px', minWidth: 0 }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Estado:
            <select className="input" value={selectedStatusFilter} onChange={(e) => handleStatusChange(e.target.value)} style={{ width: 'auto' }}>
              {statusOptions.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>

          {extraFilters}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Filas por página:
          <select className="input" value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} style={{ width: 'auto' }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
      </div>

      <Table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key, col.sortable)}
                aria-sort={sortColumn === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                style={{ cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  {col.label}
                  {col.sortable && (
                    <span aria-hidden="true" style={{ color: sortColumn === col.key ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                      {sortColumn === col.key ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  )}
                </span>
              </th>
            ))}
            {hayAcciones && <th style={{ textAlign: 'right' }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columnasTotales} className="table-vacia">
                Cargando información...
              </td>
            </tr>
          ) : paginatedData.length === 0 ? (
            <tr>
              <td colSpan={columnasTotales} className="table-vacia">
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
              const sePuedeDarDeBaja = canDelete ? canDelete(item) : true;

              return (
                <tr key={itemId}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(item)
                        : col.key === statusField
                        ? <StatusChip status={(isEliminado ? 'ELIMINADO' : item[statusField as string]) as EntityStatus} />
                        : String(item[col.key] ?? '-')}
                    </td>
                  ))}

                  {hayAcciones && (
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {customActions && customActions(item)}

                        {onView && (
                          <Button size="sm" variant="secondary" title="Ver detalle" onClick={() => onView(item)}>
                            Ver
                          </Button>
                        )}

                        {onEdit && !isEliminado && !soloLectura && (
                          <Button size="sm" variant="secondary" title="Editar registro" onClick={() => onEdit(item)}>
                            Editar
                          </Button>
                        )}

                        {onDelete && !isEliminado && !soloLectura && sePuedeDarDeBaja && (
                          <Button size="sm" variant="danger" title="Dar de baja" onClick={() => triggerDelete(item)}>
                            Baja
                          </Button>
                        )}

                        {onReactivate && isEliminado && !soloLectura && (
                          <Button size="sm" variant="secondary" title="Reactivar registro" onClick={() => triggerReactivate(item)}>
                            Reactivar
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      {/* Paginación */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <div>
          Mostrando {totalItems > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0} a{' '}
          {Math.min(safeCurrentPage * pageSize, totalItems)} de {totalItems} registros
        </div>

        <nav aria-label="Paginación" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem' }}>
          <Button
            size="sm"
            variant="secondary"
            disabled={safeCurrentPage <= 1}
            onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
          >
            &laquo; Anterior
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <Button
              key={pg}
              size="sm"
              variant={pg === safeCurrentPage ? 'primary' : 'secondary'}
              aria-current={pg === safeCurrentPage ? 'page' : undefined}
              onClick={() => handlePageChange(pg)}
            >
              {pg}
            </Button>
          ))}

          <Button
            size="sm"
            variant="secondary"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
          >
            Siguiente &raquo;
          </Button>
        </nav>
      </div>

      {/* Confirmación de baja o reactivación */}
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
