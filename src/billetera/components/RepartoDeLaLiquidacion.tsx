import React, { useEffect, useState } from 'react';
import {
  EventoCustodia,
  LineaReparto,
  RepartoLiquidacion,
  custodiaApi,
} from '../../api/custodiaApi';
import { fechaHora, pesos } from '../../shared/formato';
import { Badge, Card, Table } from '../../shared/ui';
import './pagoConSaldo.css';

interface RepartoDeLaLiquidacionProps {
  evento: EventoCustodia;
  id: number;
}

const ORIGEN: Record<LineaReparto['origen'], string> = {
  TORNEO: 'Torneo',
  RIFA: 'Rifa',
  APORTE_RIFA: 'Aporte de la rifa',
};

/** Quién cobra la línea: el ganador (con su equipo), el organizador o la plataforma. */
const beneficiario = (linea: LineaReparto): string => {
  if (linea.rol === 'PLATAFORMA') return 'Plataforma PICA';
  const nombre = linea.beneficiarioNombre ?? linea.beneficiarioUsername ?? '-';
  return linea.equipoNombre ? `${nombre} (${linea.equipoNombre})` : nombre;
};

const concepto = (linea: LineaReparto): string => {
  if (linea.rol === 'PREMIO') return `Premio del ${linea.puesto}º puesto`;
  if (linea.rol === 'PLATAFORMA') return 'Gastos administrativos';
  return linea.origen === 'TORNEO' ? 'Gastos del torneo' : 'Organizador';
};

/** Lo mismo que ya está en la tabla, sumado por premio, para las tarjetas de arriba. */
const resumen = (lineas: LineaReparto[]): { titulo: string; monto: number; detalle?: string }[] => {
  const tarjetas: { titulo: string; monto: number; detalle?: string }[] = [];
  const porPuesto = new Map<number, { monto: number; quienes: string[] }>();
  for (const l of lineas.filter((l) => l.rol === 'PREMIO' && l.puesto != null)) {
    const actual = porPuesto.get(l.puesto!) ?? { monto: 0, quienes: [] };
    actual.monto += l.monto;
    const quien = l.equipoNombre ?? l.beneficiarioUsername ?? '';
    if (quien && !actual.quienes.includes(quien)) actual.quienes.push(quien);
    porPuesto.set(l.puesto!, actual);
  }
  Array.from(porPuesto.entries())
    .sort(([a], [b]) => a - b)
    .slice(0, 2)
    .forEach(([puesto, p]) =>
      tarjetas.push({
        titulo: `Premio ${puesto}º puesto`,
        monto: p.monto,
        detalle: p.quienes.join(', '),
      })
    );
  const plataforma = lineas.filter((l) => l.rol === 'PLATAFORMA').reduce((s, l) => s + l.monto, 0);
  if (plataforma > 0)
    tarjetas.push({ titulo: 'Plataforma', monto: plataforma, detalle: 'Gastos administrativos' });
  return tarjetas;
};

/**
 * HU-606, para el organizador (wireframe 64): cómo repartió la liquidación lo que estaba en custodia, con una
 * tarjeta por el total, los dos primeros premios y la plataforma, y el desglose de cada acreditación. Mientras no se
 * liquidó, o si no se puede leer (no es el organizador), no se muestra.
 */
export const RepartoDeLaLiquidacion: React.FC<RepartoDeLaLiquidacionProps> = ({ evento, id }) => {
  const [reparto, setReparto] = useState<RepartoLiquidacion | null>(null);

  useEffect(() => {
    let vigente = true;
    custodiaApi
      .reparto(evento, id)
      .then((r) => vigente && setReparto(r))
      .catch(() => vigente && setReparto(null));
    return () => {
      vigente = false;
    };
  }, [evento, id]);

  if (!reparto || !reparto.liquidado) return null;

  return (
    <Card as="section" className="reparto-liquidacion" aria-label="Reparto de la liquidación">
      <h2>Reparto de la liquidación</h2>
      <p className="resumen-pago-detalle">
        <Badge tone="exito">{evento === 'torneos' ? 'Liquidado' : 'Liquidada'}</Badge>
        {reparto.liquidadoEn && ` • ${fechaHora(reparto.liquidadoEn)}`}
      </p>

      <div className="reparto-tarjetas">
        <div className="reparto-tarjeta">
          <span>Total repartido</span>
          <strong>{pesos(reparto.total)}</strong>
          <small>
            {reparto.lineas.some((l) => l.origen === 'APORTE_RIFA')
              ? `Custodia ${evento === 'torneos' ? 'del torneo' : 'de la rifa'} y aporte de la rifa`
              : '100 % de la custodia'}
          </small>
        </div>
        {resumen(reparto.lineas).map((t) => (
          <div className="reparto-tarjeta" key={t.titulo}>
            <span>{t.titulo}</span>
            <strong>{pesos(t.monto)}</strong>
            {t.detalle && <small>{t.detalle}</small>}
          </div>
        ))}
      </div>

      <Table caption="Desglose de las acreditaciones">
        <thead>
          <tr>
            <th>Beneficiario</th>
            <th>Concepto</th>
            <th>Origen</th>
            <th style={{ textAlign: 'right' }}>Monto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {reparto.lineas.map((linea, i) => (
            <tr key={i}>
              <td>{beneficiario(linea)}</td>
              <td>{concepto(linea)}</td>
              <td>{ORIGEN[linea.origen]}</td>
              <td style={{ textAlign: 'right' }}>{pesos(linea.monto)}</td>
              <td>
                <Badge tone="exito">Acreditado</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="custodia-evento-nota">
        Cada acreditación quedó en la billetera de quien cobra y en el libro de auditoría.
      </p>
    </Card>
  );
};
