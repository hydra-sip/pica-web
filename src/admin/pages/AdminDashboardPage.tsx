import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { personaApi } from '../../api/personaApi';
import { rolApi } from '../../api/rolApi';
import { usuarioApi } from '../../api/usuarioApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { mensajeDeError } from '../../shared/mensajesError';
import { Card } from '../../shared/ui';
import './AdminDashboardPage.css';

interface Metrica {
  titulo: string;
  valor: number | null;
  detalle: string;
  ruta: string;
}

// El back todavía no tiene un endpoint de métricas: los totales salen del totalElements de cada listado
const total = (pedido: Promise<{ page?: { totalElements: number } }>) =>
  pedido.then((res) => res.page?.totalElements ?? 0);

export const AdminDashboardPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const veUsuarios = hasPermission('USUARIO_VER');
  const vePersonas = hasPermission('PERSONA_VER');
  const veRoles = hasPermission('ROL_VER');

  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pedidos: Promise<Metrica>[] = [];
    if (veUsuarios) {
      pedidos.push(
        Promise.all([
          total(usuarioApi.getUsuarios({ size: 1 })),
          total(usuarioApi.getUsuarios({ size: 1, estado: 'BLOQUEADO' })),
        ]).then(([usuarios, bloqueados]) => ({
          titulo: 'Usuarios',
          valor: usuarios,
          detalle: bloqueados === 1 ? '1 bloqueado' : `${bloqueados} bloqueados`,
          ruta: '/admin/usuarios',
        }))
      );
    }
    if (vePersonas) {
      pedidos.push(
        total(personaApi.getPersonas({ size: 1 })).then((personas) => ({
          titulo: 'Personas',
          valor: personas,
          detalle: 'Registradas en el padrón',
          ruta: '/admin/personas',
        }))
      );
    }
    if (veRoles) {
      pedidos.push(
        total(rolApi.getRoles({ size: 1 })).then((roles) => ({
          titulo: 'Roles',
          valor: roles,
          detalle: 'Con sus permisos por módulo',
          ruta: '/admin/roles',
        }))
      );
    }
    Promise.all(pedidos)
      .then(setMetricas)
      .catch((err) => setError(mensajeDeError(err, 'No se pudieron cargar los totales.')));
  }, [veUsuarios, vePersonas, veRoles]);

  const accesos = [
    veUsuarios && {
      titulo: 'Usuarios y roles',
      texto: 'Altas, roles, bloqueos y reseteo de claves',
      ruta: '/admin/usuarios',
    },
    vePersonas && {
      titulo: 'Personas',
      texto: 'Padrón de integrantes y sus datos',
      ruta: '/admin/personas',
    },
    veRoles && {
      titulo: 'Roles y permisos',
      texto: 'Qué puede hacer cada rol',
      ruta: '/admin/roles',
    },
  ].filter(Boolean) as { titulo: string; texto: string; ruta: string }[];

  return (
    <div className="panel">
      <div>
        <h1 className="panel-titulo">Panel</h1>
        <p className="panel-subtitulo">Resumen del backoffice de Hydra.</p>
      </div>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      <div className="panel-metricas">
        {metricas.map((m) => (
          <Link key={m.titulo} to={m.ruta} className="card panel-metrica">
            <span className="panel-metrica-titulo">{m.titulo}</span>
            <span className="panel-metrica-valor">{m.valor ?? '...'}</span>
            <span className="panel-metrica-detalle">{m.detalle}</span>
          </Link>
        ))}
      </div>

      <section className="panel-seccion" aria-labelledby="panel-accesos">
        <h2 id="panel-accesos" className="panel-seccion-titulo">
          Accesos rápidos
        </h2>
        <div className="panel-accesos">
          {accesos.map((a) => (
            <Card key={a.ruta} className="panel-acceso">
              <Link to={a.ruta} className="panel-acceso-link">
                <span>
                  <strong>{a.titulo}</strong>
                  <span className="panel-acceso-texto">{a.texto}</span>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
