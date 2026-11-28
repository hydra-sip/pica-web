import { useCallback, useEffect, useState } from 'react';
import { usuarioApi, UsuarioResumen } from '../../api/usuarioApi';
import { rolApi, RolResumen } from '../../api/rolApi';

// La columna Persona se ordena por apellido (el back no ordena por el objeto)
const ORDEN_POR_COLUMNA: Record<string, string> = { persona: 'apellidos' };

/**
 * El listado de usuarios del backoffice: la página del servidor, los filtros (búsqueda, estado y rol), el orden y
 * el catálogo de roles. Cambiar un filtro o el tamaño de página vuelve a la primera página.
 */
export const useUsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Filters (Spring Data REST)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [rolFilter, setRolFilter] = useState(0);
  const [sortParam, setSortParam] = useState('id,asc');

  // Catalogue of available Roles (loaded from server)
  const [availableRoles, setAvailableRoles] = useState<RolResumen[]>([]);

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await usuarioApi.getUsuarios({
        q: searchTerm || undefined,
        // ELIMINADO no es un estado del contrato: se pide con incluirEliminados
        estado: statusFilter !== 'TODOS' && statusFilter !== 'ELIMINADO' ? statusFilter : undefined,
        incluirEliminados: statusFilter === 'ELIMINADO' || statusFilter === 'TODOS',
        rol: rolFilter || undefined,
        page: page - 1, // Spring Data 0-indexed
        size: pageSize,
        sort: sortParam,
      });

      setUsuarios(res.content || []);
      setTotalElements(res.page?.totalElements || res.content.length);
      setTotalPages(res.page?.totalPages || 1);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, rolFilter, page, pageSize, sortParam]);

  // Load available roles list
  useEffect(() => {
    rolApi
      .getRoles({ size: 100 })
      .then((res) => {
        setAvailableRoles(res.content || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const cambiarPagina = (nueva: number) => setPage(nueva);
  const cambiarTamanio = (tamanio: number) => {
    setPageSize(tamanio);
    setPage(1);
  };
  const buscar = (termino: string) => {
    setSearchTerm(termino);
    setPage(1);
  };
  const filtrarPorEstado = (estado: string) => {
    setStatusFilter(estado);
    setPage(1);
  };
  const filtrarPorRol = (rolId: number) => {
    setRolFilter(rolId);
    setPage(1);
  };
  const ordenar = (columna: string | null, direccion: string) => {
    if (columna) setSortParam(`${ORDEN_POR_COLUMNA[columna] ?? columna},${direccion}`);
    else setSortParam('id,asc');
  };

  return {
    usuarios,
    isLoading,
    page,
    pageSize,
    totalElements,
    totalPages,
    rolFilter,
    availableRoles,
    recargar: fetchUsuarios,
    cambiarPagina,
    cambiarTamanio,
    buscar,
    filtrarPorEstado,
    filtrarPorRol,
    ordenar,
  };
};

export type UsuariosAdmin = ReturnType<typeof useUsuariosAdmin>;
