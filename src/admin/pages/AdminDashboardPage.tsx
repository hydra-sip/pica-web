import React, { useEffect, useState } from 'react';
import { httpClient } from '../../api/httpClient';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';

interface AdminStats {
  totalUsers: number;
  activeProjects: number;
  systemStatus: string;
  lastBackup: string;
}

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    httpClient
      .get<AdminStats>('/admin/stats')
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(mensajeDeError(err, 'No se pudieron cargar las métricas.'));
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <span className="badge">Módulo Administración</span>
        <h1 style={{ marginTop: '0.5rem' }}>Panel de Control PICA</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Resumen operativo del sistema y métricas globales.
        </p>
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Usuarios Registrados</span>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            {loading ? '...' : stats?.totalUsers}
          </h2>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Proyectos Activos</span>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--color-primary)', marginTop: '0.25rem' }}>
            {loading ? '...' : stats?.activeProjects}
          </h2>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Estado del Sistema</span>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
            {loading ? '...' : stats?.systemStatus}
          </h2>
        </div>
      </div>

      <div className="card">
        <h3>Actividad Reciente y Respaldos</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
          Última copia de seguridad procesada por MSW Mock Server:{' '}
          <strong style={{ color: 'var(--color-text)' }}>
            {stats?.lastBackup ? fechaHora(stats.lastBackup) : 'Cargando...'}
          </strong>
        </p>
      </div>
    </div>
  );
};
