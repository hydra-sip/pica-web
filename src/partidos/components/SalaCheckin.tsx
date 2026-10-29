import React, { useEffect, useState } from 'react';
import { CheckinPartido, LadoCheckin, partidoApi } from '../../api/partidoApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card } from '../../shared/ui';
import { tiempoHasta } from '../formato';

type Fase = 'ANTES' | 'ABIERTA' | 'CERRADA';

/** La hora del navegador, actualizada cada segundo, para la cuenta regresiva. */
const useAhora = (): number => {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);
  return ahora;
};

const FilaLado: React.FC<{ lado: LadoCheckin | null }> = ({ lado }) => (
  <li>
    <span>{lado?.nombre ?? 'A definir'}</span>
    {lado?.checkinEn ? (
      <Badge tone="exito">Confirmó · {fechaHora(lado.checkinEn)}</Badge>
    ) : (
      <Badge tone="neutral">Sin confirmar</Badge>
    )}
  </li>
);

/**
 * La sala de check-in del partido (HU-308): la ventana con su cuenta regresiva y si cada lado confirmó su presencia.
 * El capitán confirma la de su lado mientras está abierta. Sin ventana (el torneo no la configuró o el partido no
 * tiene fecha) no muestra nada. El back acepta un par de minutos de tolerancia en cada extremo; acá la ventana se
 * muestra sin ella.
 */
export const SalaCheckin: React.FC<{ partidoId: number; onConfirmado: () => void }> = ({
  partidoId,
  onConfirmado,
}) => {
  const [checkin, setCheckin] = useState<CheckinPartido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const ahora = useAhora();

  useEffect(() => {
    let vigente = true;
    partidoApi
      .checkin(partidoId)
      .then((c) => vigente && setCheckin(c))
      .catch(() => vigente && setCheckin(null));
    return () => {
      vigente = false;
    };
  }, [partidoId]);

  if (!checkin?.ventana) return null;

  const abre = new Date(checkin.ventana.abreEn).getTime();
  const cierra = new Date(checkin.ventana.cierraEn).getTime();
  const fase: Fase = ahora < abre ? 'ANTES' : ahora <= cierra ? 'ABIERTA' : 'CERRADA';
  const mio = checkin.miLado === 'LOCAL' ? checkin.local : checkin.visitante;
  const pendiente = checkin.miLado !== null && !mio?.checkinEn;
  const confirmados = [checkin.local, checkin.visitante].filter((l) => l?.checkinEn).length;
  const conRivales = Boolean(checkin.local && checkin.visitante);

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      setCheckin(await partidoApi.hacerCheckin(partidoId));
      onConfirmado();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo confirmar la presencia.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card as="section" className="partido-checkin" aria-label="Check-in">
      <p className="partido-rotulo">Check-in</p>
      <p className="partido-ayuda">
        Abre el {fechaHora(checkin.ventana.abreEn)} y cierra el{' '}
        {fechaHora(checkin.ventana.cierraEn)}.
      </p>
      <p className="partido-plazo" role="timer">
        {fase === 'ANTES' && `Abre en ${tiempoHasta(abre - ahora)}`}
        {fase === 'ABIERTA' && `Cierra en ${tiempoHasta(cierra - ahora)}`}
        {fase === 'CERRADA' && 'La ventana de check-in cerró.'}
      </p>
      {/* lo que hace el back al vencer la ventana, con la tolerancia (HU-309) */}
      {fase === 'CERRADA' && conRivales && confirmados === 1 && (
        <p className="partido-ayuda">
          Si el rival no confirmó, en unos minutos se le da el partido a quien sí lo hizo.
        </p>
      )}
      {fase === 'CERRADA' && conRivales && confirmados === 0 && (
        <p className="partido-ayuda">
          Si nadie confirmó, se aplica lo que eligió el organizador: reprogramar o descalificar a
          los dos.
        </p>
      )}
      <ul className="partido-checkin-lados">
        <FilaLado lado={checkin.local} />
        <FilaLado lado={checkin.visitante} />
      </ul>
      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}
      {pendiente && fase === 'ABIERTA' && (
        <Button loading={enviando} block onClick={() => void confirmar()}>
          Confirmar presencia
        </Button>
      )}
      {pendiente && fase === 'ANTES' && (
        <p className="partido-ayuda">Cuando abra, confirmá la presencia de tu lado desde acá.</p>
      )}
      {checkin.miLado !== null && mio?.checkinEn && (
        <p className="partido-ayuda" role="status">
          Confirmaste la presencia de tu lado.
        </p>
      )}
    </Card>
  );
};
