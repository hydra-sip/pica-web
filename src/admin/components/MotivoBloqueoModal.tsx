import React, { useEffect, useState } from 'react';
import { usuarioApi, UsuarioDetalle, UsuarioResumen } from '../../api/usuarioApi';
import { fecha, fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Modal } from '../../shared/ui';
import './bloqueo.css';

interface MotivoBloqueoModalProps {
  usuario: UsuarioResumen | null;
  puedeLevantar: boolean;
  onClose: () => void;
  onLevantado: () => void;
}

/** Motivo y duración del bloqueo vigente, con la opción de levantarlo. */
export const MotivoBloqueoModal: React.FC<MotivoBloqueoModalProps> = ({
  usuario,
  puedeLevantar,
  onClose,
  onLevantado,
}) => {
  const [detalle, setDetalle] = useState<UsuarioDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [levantando, setLevantando] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    setDetalle(null);
    setError(null);
    usuarioApi
      .getUsuario(usuario.id)
      .then(setDetalle)
      .catch((err) => setError(mensajeDeError(err, 'No se pudo cargar el bloqueo.')));
  }, [usuario]);

  if (!usuario) return null;

  const levantar = async () => {
    setLevantando(true);
    setError(null);
    try {
      await usuarioApi.levantarBloqueo(usuario.id);
      onLevantado();
      onClose();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo levantar el bloqueo.'));
    } finally {
      setLevantando(false);
    }
  };

  const bloqueo = detalle?.bloqueo;

  return (
    <Modal
      isOpen
      title={`Bloqueo de ${usuario.persona?.nombreCompleto || usuario.username}`}
      onClose={onClose}
      closeDisabled={levantando}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={levantando}>
            Cerrar
          </Button>
          {puedeLevantar && (
            <Button onClick={levantar} loading={levantando} disabled={!detalle}>
              Levantar bloqueo
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {error && (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        )}
        {!detalle && !error && <p style={{ margin: 0 }}>Cargando...</p>}
        {detalle &&
          (bloqueo ? (
            <dl className="bloqueo-resumen">
              <div>
                <dt>Desde</dt>
                <dd>{fechaHora(bloqueo.desde)}</dd>
              </div>
              <div>
                <dt>Hasta</dt>
                <dd>{bloqueo.hasta ? fecha(bloqueo.hasta) : 'Indefinido'}</dd>
              </div>
              <div>
                <dt>Motivo</dt>
                <dd>{bloqueo.motivo}</dd>
              </div>
            </dl>
          ) : (
            <p style={{ margin: 0 }}>Está bloqueado, pero no tiene un motivo registrado.</p>
          ))}
      </div>
    </Modal>
  );
};
