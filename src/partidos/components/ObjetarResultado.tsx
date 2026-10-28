import React, { useState } from 'react';
import { PartidoDetalle, partidoApi } from '../../api/partidoApi';
import { erroresPorCampo, mensajeDeError } from '../../shared/mensajesError';
import { Button, Field, Textarea } from '../../shared/ui';
import { MARCADOR_VACIO, Marcador, erroresDelMarcador, payloadDelMarcador } from '../marcador';
import { CamposMarcador } from './CamposMarcador';

const MAXIMO_MOTIVO = 1000;
const SIN_EVIDENCIA =
  'Adjuntá al menos una foto o video en Evidencia: sin eso no se puede objetar.';

interface ObjetarResultadoProps {
  partido: PartidoDetalle;
  /** Si el lado de quien objeta ya subió evidencia: es obligatoria. */
  conEvidencia: boolean;
  onObjetado: (partido: PartidoDetalle) => void;
}

/**
 * Objetar el resultado que cargó el rival (wireframe "Carga y Objeción Resultados", PICA-245): el resultado que fue,
 * el motivo y al menos una evidencia propia. El partido queda objetado y no avanza hasta el laudo del árbitro.
 */
export const ObjetarResultado: React.FC<ObjetarResultadoProps> = ({
  partido,
  conEvidencia,
  onObjetado,
}) => {
  const [marcador, setMarcador] = useState<Marcador>(MARCADOR_VACIO);
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const objetar = async (e: React.FormEvent) => {
    e.preventDefault();
    const faltan = erroresDelMarcador(marcador);
    if (motivo.trim() === '') faltan.motivo = 'Contá por qué no coincide.';
    if (!conEvidencia) faltan.evidencia = SIN_EVIDENCIA;
    setErrores(faltan);
    setError(null);
    if (Object.keys(faltan).length > 0) return;

    setEnviando(true);
    try {
      onObjetado(
        await partidoApi.objetarResultado(partido.id, {
          ...payloadDelMarcador(marcador),
          motivo: motivo.trim(),
        })
      );
    } catch (err) {
      const porCampo = erroresPorCampo(err);
      setErrores(porCampo);
      if (Object.keys(porCampo).length === 0)
        setError(mensajeDeError(err, 'No se pudo objetar el resultado.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="partido-objetar" onSubmit={(e) => void objetar(e)} noValidate>
      <strong>¿El resultado no coincide?</strong>
      <p className="partido-ayuda">Cargá el resultado que fue para vos y por qué.</p>
      <CamposMarcador
        marcador={marcador}
        errores={errores}
        nombreLocal={partido.local?.nombre}
        nombreVisitante={partido.visitante?.nombre}
        onChange={setMarcador}
      />
      <Field label="Motivo" error={errores.motivo} hint={`Hasta ${MAXIMO_MOTIVO} caracteres.`}>
        <Textarea
          rows={3}
          maxLength={MAXIMO_MOTIVO}
          value={motivo}
          placeholder="Ej.: terminó 2-2 y se definió por penales. Pido revisar la planilla."
          onChange={(e) => setMotivo(e.target.value)}
        />
      </Field>
      {(errores.evidencia || error) && (
        <p className="partido-error" role="alert">
          {errores.evidencia ? SIN_EVIDENCIA : error}
        </p>
      )}
      <Button type="submit" variant="danger" loading={enviando} block>
        Objetar resultado (elevar a árbitro)
      </Button>
      <p className="partido-ayuda">Se congelará el avance del cruce hasta el laudo.</p>
    </form>
  );
};
