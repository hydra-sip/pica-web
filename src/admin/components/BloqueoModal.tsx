import React, { useEffect, useState } from 'react';
import { usuarioApi, UsuarioResumen } from '../../api/usuarioApi';
import { fecha } from '../../shared/formato';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Button, Field, Input, Modal, Select, Textarea } from '../../shared/ui';
import './bloqueo.css';

// Días hasta la fecha de fin; vacío es indefinido (lo levanta un administrador)
const DURACIONES = [
  { value: '1', label: '1 día' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días corridos' },
  { value: '90', label: '90 días' },
  { value: '', label: 'Indefinido' },
];

const PALABRA = 'BLOQUEAR';
const DIA_MS = 24 * 60 * 60 * 1000;

interface BloqueoModalProps {
  usuario: UsuarioResumen | null;
  onClose: () => void;
  onBloqueado: () => void;
}

/** Sanción y bloqueo (RF-062): motivo y duración, y después confirmar escribiendo BLOQUEAR. */
export const BloqueoModal: React.FC<BloqueoModalProps> = ({ usuario, onClose, onBloqueado }) => {
  const [paso, setPaso] = useState<'datos' | 'confirmar'>('datos');
  const [duracion, setDuracion] = useState('30');
  const [motivo, setMotivo] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) {
      setPaso('datos');
      setDuracion('30');
      setMotivo('');
      setConfirmacion('');
      setErrores({});
      setError(null);
    }
  }, [usuario]);

  if (!usuario) return null;

  const nombre = usuario.persona?.nombreCompleto || usuario.username;
  const duracionTexto = DURACIONES.find((d) => d.value === duracion)?.label ?? '';
  const hasta = duracion ? new Date(Date.now() + Number(duracion) * DIA_MS) : null;

  const continuar = () => {
    if (!motivo.trim()) {
      setErrores({ motivo: 'Contá por qué se lo bloquea: queda registrado.' });
      return;
    }
    setErrores({});
    setPaso('confirmar');
  };

  const aplicar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await usuarioApi.bloquear(usuario.id, motivo.trim(), hasta?.toISOString() ?? null);
      onBloqueado();
      onClose();
    } catch (err) {
      const porCampo = erroresPorCampo(err);
      if (Object.keys(porCampo).length > 0) {
        setErrores(porCampo);
        setPaso('datos');
      }
      setError(mensajeDeError(err, 'No se pudo bloquear al usuario.'));
    } finally {
      setEnviando(false);
    }
  };

  const pie =
    paso === 'datos' ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={continuar}>
          Continuar
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={() => setPaso('datos')} disabled={enviando}>
          Volver
        </Button>
        <Button
          variant="danger"
          onClick={aplicar}
          loading={enviando}
          disabled={confirmacion.trim().toUpperCase() !== PALABRA}
        >
          Aplicar bloqueo
        </Button>
      </>
    );

  return (
    <Modal
      isOpen
      title={paso === 'datos' ? `Bloquear a ${nombre}` : `¿Aplicar el bloqueo a ${nombre}?`}
      onClose={onClose}
      footer={pie}
      closeDisabled={enviando}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {error && (
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        )}

        {paso === 'datos' ? (
          <>
            <Field
              label="Duración"
              hint={hasta ? `Hasta el ${fecha(hasta)}.` : 'Hasta que un administrador lo levante.'}
            >
              <Select value={duracion} onChange={(e) => setDuracion(e.target.value)}>
                {DURACIONES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Motivo" required error={errores.motivo || errores.hasta}>
              <Textarea
                rows={4}
                maxLength={500}
                placeholder="Ej.: conducta antideportiva reiterada en el Torneo Clausura."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </Field>
            <div className="alerta alerta-info">
              Se cierran sus sesiones: queda afuera de inmediato en todos sus dispositivos.
            </div>
          </>
        ) : (
          <>
            <dl className="bloqueo-resumen">
              <div>
                <dt>Duración</dt>
                <dd>{hasta ? `${duracionTexto}, hasta el ${fecha(hasta)}` : 'Indefinido'}</dd>
              </div>
              <div>
                <dt>Motivo</dt>
                <dd>{motivo.trim()}</dd>
              </div>
            </dl>
            <Field label={`Escribí "${PALABRA}" para confirmar`}>
              <Input
                autoComplete="off"
                placeholder={PALABRA}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
              />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
};
