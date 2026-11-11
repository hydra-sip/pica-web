import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { billeteraApi } from '../../api/billeteraApi';
import {
  ArbitroDetalle,
  EstadoPagoGasto,
  EstadoTorneo,
  GastoDetalle,
  torneoApi,
} from '../../api/torneoApi';
import { pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Button, Card, Modal, Select, Table } from '../../shared/ui';

interface HonorariosDelTorneoProps {
  torneoId: number;
  estado: EstadoTorneo;
}

const ESTADO_PAGO: Record<EstadoPagoGasto, { texto: string; tono: BadgeTone }> = {
  PENDIENTE: { texto: 'Sin depositar', tono: 'aviso' },
  EN_CUSTODIA: { texto: 'En custodia', tono: 'info' },
  ACREDITADO: { texto: 'Acreditado al árbitro', tono: 'exito' },
  REINTEGRADO: { texto: 'Devuelto', tono: 'neutral' },
  PAGADO: { texto: 'Pagado', tono: 'exito' },
};

const nombre = (a: { nombres: string; apellidos: string }) => `${a.nombres} ${a.apellidos}`;

/**
 * HU-604 (wireframe 49), en la consola del organizador: los honorarios arbitrales del paso 3. Cada uno se paga por la
 * plataforma: sale de su billetera, queda en la custodia del torneo y la liquidación se lo acredita al árbitro al
 * finalizar (y le devuelve el gasto al organizador). Solo así es deducible. Se elige un árbitro designado, que no haya
 * rechazado y con la identidad verificada; si el saldo no alcanza, el enlace a Cargar saldo. Mientras el torneo no
 * termina, un depósito se puede retirar. Sin honorarios previstos, no se muestra.
 */
export const HonorariosDelTorneo: React.FC<HonorariosDelTorneoProps> = ({ torneoId, estado }) => {
  const [honorarios, setHonorarios] = useState<GastoDetalle[]>([]);
  const [arbitros, setArbitros] = useState<ArbitroDetalle[]>([]);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [elegidos, setElegidos] = useState<Record<number, number>>({});
  const [confirmando, setConfirmando] = useState<GastoDetalle | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarSaldo = useCallback(() => {
    billeteraApi
      .obtener()
      .then((b) => setSaldo(b.saldoDisponible))
      .catch(() => setSaldo(null));
  }, []);

  useEffect(() => {
    let vigente = true;
    Promise.all([torneoApi.gastos(torneoId), torneoApi.arbitros(torneoId)])
      .then(([gastos, designados]) => {
        if (!vigente) return;
        setHonorarios(gastos.filter((g) => g.tipo === 'HONORARIO_ARBITRAL'));
        setArbitros(designados);
      })
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar los honorarios.'))
      );
    cargarSaldo();
    return () => {
      vigente = false;
    };
  }, [torneoId, cargarSaldo]);

  if (honorarios.length === 0 && !error) return null;

  // en revisión de una cancelación (HU-605) la plata queda como está hasta que soporte la resuelva
  const abierto =
    estado !== 'FINALIZADO' && estado !== 'CANCELADO' && estado !== 'CANCELACION_EN_REVISION';
  // Pueden cobrar los designados que no rechazaron y tienen la identidad verificada.
  const elegibles = arbitros.filter((a) => a.estado !== 'RECHAZADO' && a.identidadVerificada);

  const reemplazar = (guardado: GastoDetalle) =>
    setHonorarios((actuales) =>
      actuales.map((g) => (g.gastoId === guardado.gastoId ? guardado : g))
    );

  const ejecutar = async (accion: () => Promise<void>) => {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      cargarSaldo();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar el honorario.'));
    } finally {
      setOcupado(false);
    }
  };

  const depositar = (gasto: GastoDetalle) =>
    ejecutar(async () => {
      const arbitroId = elegidos[gasto.gastoId];
      if (!arbitroId) return;
      reemplazar(await torneoApi.pagarGasto(torneoId, gasto.gastoId, { arbitroId }));
      setConfirmando(null);
    });

  const retirar = (gasto: GastoDetalle) =>
    ejecutar(async () => {
      reemplazar(await torneoApi.retirarHonorario(torneoId, gasto.gastoId));
    });

  const arbitroElegido = (gasto: GastoDetalle) =>
    elegibles.find((a) => a.usuarioId === elegidos[gasto.gastoId]);

  return (
    <Card as="section" className="honorarios-torneo" aria-label="Honorarios arbitrales">
      <div className="torneos-tarjeta-titulo">
        <h2>Honorarios arbitrales</h2>
        {saldo != null && (
          <span className="torneos-subtitulo">Tu saldo disponible: {pesos(saldo)}</span>
        )}
      </div>
      <p className="torneos-subtitulo honorarios-ayuda">
        Se pagan desde tu billetera y quedan en la custodia del torneo. Al finalizar, la liquidación
        se los acredita a cada árbitro y te devuelve el gasto: así cuentan como gasto del torneo. Un
        honorario que no deposités no se descuenta y queda en el pozo.
      </p>

      <Table caption="Honorarios del torneo">
        <thead>
          <tr>
            <th>Concepto</th>
            <th style={{ textAlign: 'right' }}>Monto</th>
            <th>Árbitro</th>
            <th>Estado</th>
            {abierto && <th>Acción</th>}
          </tr>
        </thead>
        <tbody>
          {honorarios.map((g) => {
            const pendiente = g.estadoPago === 'PENDIENTE';
            const noAlcanza = saldo != null && saldo < g.monto;
            return (
              <tr key={g.gastoId}>
                <td>{g.descripcion}</td>
                <td style={{ textAlign: 'right' }}>{pesos(g.monto)}</td>
                <td>
                  {g.beneficiario ? (
                    `${nombre(g.beneficiario)} (@${g.beneficiario.username})`
                  ) : pendiente && abierto && elegibles.length > 0 ? (
                    <Select
                      aria-label={`Árbitro para ${g.descripcion}`}
                      value={elegidos[g.gastoId] ?? ''}
                      disabled={ocupado}
                      onChange={(e) =>
                        setElegidos({ ...elegidos, [g.gastoId]: Number(e.target.value) })
                      }
                    >
                      <option value="">Elegí un árbitro</option>
                      {elegibles.map((a) => (
                        <option key={a.usuarioId} value={a.usuarioId}>
                          {nombre(a)} (@{a.username})
                        </option>
                      ))}
                    </Select>
                  ) : pendiente && abierto ? (
                    <span className="torneos-celda-secundaria">
                      Designá un árbitro con la identidad verificada.
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <Badge tone={ESTADO_PAGO[g.estadoPago].tono}>
                    {ESTADO_PAGO[g.estadoPago].texto}
                  </Badge>
                </td>
                {abierto && (
                  <td>
                    {pendiente && (
                      <div className="honorarios-accion">
                        <Button
                          size="sm"
                          disabled={ocupado || !elegidos[g.gastoId] || noAlcanza}
                          onClick={() => setConfirmando(g)}
                        >
                          Pagar honorario
                        </Button>
                        {noAlcanza && (
                          <Link to="/billetera" className="honorarios-cargar">
                            Cargar saldo
                          </Link>
                        )}
                      </div>
                    )}
                    {g.estadoPago === 'EN_CUSTODIA' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={ocupado}
                        onClick={() => void retirar(g)}
                      >
                        Retirar
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      <Modal
        isOpen={confirmando != null}
        title="¿Pagar el honorario?"
        onClose={() => setConfirmando(null)}
        closeDisabled={ocupado}
        footer={
          <>
            <Button variant="secondary" disabled={ocupado} onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button loading={ocupado} onClick={() => confirmando && void depositar(confirmando)}>
              Pagar {confirmando ? pesos(confirmando.monto) : ''}
            </Button>
          </>
        }
      >
        {confirmando && (
          <p>
            Salen {pesos(confirmando.monto)} de tu billetera y quedan en la custodia del torneo
            hasta la liquidación, que se los acredita a{' '}
            {arbitroElegido(confirmando) ? nombre(arbitroElegido(confirmando)!) : 'el árbitro'}. Si
            rechaza la designación o lo quitás, vuelven a tu billetera.
          </p>
        )}
      </Modal>
    </Card>
  );
};
