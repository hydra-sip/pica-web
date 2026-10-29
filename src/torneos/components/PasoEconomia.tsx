import React from 'react';
import { GastoDetalle } from '../../api/torneoApi';
import { Button, Field, Input } from '../../shared/ui';
import { calcular, ErroresEconomia, FormEconomia, sumaPremios } from '../economia';
import { pesosArs } from '../formato';
import { GastosPrevistos } from './GastosPrevistos';

interface PasoEconomiaProps {
  torneoId: number;
  form: FormEconomia;
  onCambio: (cambios: Partial<FormEconomia>) => void;
  errores: ErroresEconomia;
  habilitado: boolean;
  /** Cupo máximo del paso 2: la recaudación se estima con el cupo completo. */
  cupo: number | null;
  /** "equipos" o "jugadores". */
  quienes: string;
  /** El % sellado al publicar o, en borrador, el vigente de la plataforma. */
  pctGastosAdministrativos: number;
  gastos: GastoDetalle[];
  onGastos: (gastos: GastoDetalle[]) => void;
}

const Suma: React.FC<{ valor: number; objetivo: string }> = ({ valor, objetivo }) => (
  <p className={`torneos-suma ${valor === 100 ? 'ok' : 'pendiente'}`} role="status">
    {valor === 100 ? '✓ ' : ''}
    {objetivo}: {valor} %{valor === 100 ? ' (válido)' : ' (tiene que ser 100 %)'}
  </p>
);

const Linea: React.FC<{ etiqueta: string; monto: number | null; destacada?: boolean }> = ({
  etiqueta,
  monto,
  destacada,
}) => (
  <div className={`torneos-linea${destacada ? ' destacada' : ''}`}>
    <span>{etiqueta}</span>
    <strong>{pesosArs(monto)}</strong>
  </div>
);

/**
 * Paso 3, "Esquema económico y premios" (wireframe "Wizard Creacion de Torneo - Paso 3", HU-601): valor de la
 * inscripción, que va entera al pozo; gastos previstos y premios por puesto. Los gastos administrativos de la
 * plataforma los paga aparte quien se inscribe. Las cuentas se recalculan mientras se escribe, con las mismas
 * fórmulas que el back.
 */
export const PasoEconomia: React.FC<PasoEconomiaProps> = ({
  torneoId,
  form,
  onCambio,
  errores,
  habilitado,
  cupo,
  quienes,
  pctGastosAdministrativos,
  gastos,
  onGastos,
}) => {
  const cuentas = calcular(form, cupo, gastos, pctGastosAdministrativos);
  const valor = Number(form.valorInscripcion);

  const campo = (nombre: keyof Omit<FormEconomia, 'premios'>) => ({
    value: form[nombre],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCambio({ [nombre]: e.target.value }),
    disabled: !habilitado,
  });

  const cambiarPremio = (i: number, valor: string) =>
    onCambio({ premios: form.premios.map((p, j) => (j === i ? valor : p)) });

  return (
    <>
      <section className="torneos-seccion">
        <h3>1. Recaudación</h3>
        <div className="torneos-grilla">
          <Field
            label="Valor de la inscripción por participante ($ ARS)"
            required
            hint="En pesos argentinos, hasta 2 decimales."
            error={errores.valorInscripcion}
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="20000"
              {...campo('valorInscripcion')}
            />
          </Field>
          <div className="torneos-dato">
            <span>Cupo máximo</span>
            <strong>{cupo === null ? 'Sin definir' : `${cupo} ${quienes}`}</strong>
            <small>Definido en el paso 2</small>
          </div>
        </div>
        <Linea
          etiqueta={
            cupo !== null && valor > 0
              ? `Recaudación bruta estimada (${cupo} × ${pesosArs(valor)})`
              : 'Recaudación bruta estimada'
          }
          monto={cuentas.recaudacion}
          destacada
        />
      </section>

      <section className="torneos-seccion">
        <h3>2. Gastos administrativos y gastos previstos</h3>
        <p className="torneos-celda-secundaria">
          La inscripción va entera al pozo de competidores. Quien se inscribe paga aparte un{' '}
          {pctGastosAdministrativos} % de gastos administrativos de la plataforma.
        </p>
        <div className="torneos-cuentas">
          <Linea
            etiqueta={`Gastos administrativos por inscripción (${pctGastosAdministrativos} %)`}
            monto={cuentas.gastosAdministrativos}
          />
          <Linea etiqueta="Total que paga cada participante" monto={cuentas.totalAPagar} />
        </div>

        <h4 className="torneos-subtitulo-seccion">Gastos previstos</h4>
        <GastosPrevistos
          torneoId={torneoId}
          gastos={gastos}
          onCambio={onGastos}
          habilitado={habilitado}
        />

        <div className="torneos-cuentas">
          <Linea etiqueta="Pozo de competidores" monto={cuentas.recaudacion} />
          <Linea etiqueta="Gastos previstos" monto={cuentas.gastos === 0 ? 0 : -cuentas.gastos} />
          <Linea etiqueta="Pozo neto a repartir en premios" monto={cuentas.pozoNeto} destacada />
        </div>
      </section>

      <section className="torneos-seccion">
        <h3>3. Premios por puesto</h3>
        <p className="torneos-celda-secundaria">
          Cada puesto se lleva un % del pozo neto. En borrador pueden sumar menos; para publicar,
          100 %.
        </p>
        <ol className="torneos-premios">
          {form.premios.map((pct, i) => (
            <li key={i} className="torneos-premio">
              <span className="torneos-premio-puesto">{i + 1}.º puesto</span>
              <Input
                aria-label={`Porcentaje del ${i + 1}.º puesto`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={pct}
                onChange={(e) => cambiarPremio(i, e.target.value)}
                disabled={!habilitado}
              />
              <span className="torneos-premio-monto">➔ {pesosArs(cuentas.porPuesto[i])}</span>
              {habilitado && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Quitar el ${i + 1}.º puesto`}
                  onClick={() => onCambio({ premios: form.premios.filter((_, j) => j !== i) })}
                >
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ol>
        {habilitado && (cupo === null || form.premios.length < cupo) && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onCambio({ premios: [...form.premios, ''] })}
          >
            Agregar puesto
          </Button>
        )}
        {errores.premios && (
          <span className="field-error" role="alert">
            {errores.premios}
          </span>
        )}
        <Suma valor={sumaPremios(form)} objetivo="Los premios suman" />
      </section>
    </>
  );
};
