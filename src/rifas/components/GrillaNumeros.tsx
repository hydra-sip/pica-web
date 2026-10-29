import React, { useMemo, useState } from 'react';
import { EstadoNumero, NumeroOcupado } from '../../api/rifaApi';
import { Button, Input } from '../../shared/ui';

interface GrillaNumerosProps {
  numeroDesde: number;
  numeroHasta: number;
  ocupados: NumeroOcupado[];
  /** Con la venta abierta los libres se pueden elegir; si no, la grilla es solo para ver. */
  seleccionable: boolean;
  seleccion: Set<number>;
  onAlternar: (numero: number) => void;
}

// Una rifa puede tener miles de números: se muestran de a 100
const POR_BLOQUE = 100;

const TEXTO_ESTADO: Record<EstadoNumero, string> = {
  VENDIDO: 'vendido',
  RESERVADO: 'reservado',
  REINTEGRADO: 'no disponible',
};

/**
 * La grilla de números de una rifa (PICA-221, PICA-223). El back devuelve solo los ocupados: el resto del rango está
 * libre y, con la venta abierta, se elige con un clic. Se recorre de a 100 y se puede saltar al bloque de un número.
 */
export const GrillaNumeros: React.FC<GrillaNumerosProps> = ({
  numeroDesde,
  numeroHasta,
  ocupados,
  seleccionable,
  seleccion,
  onAlternar,
}) => {
  const [bloque, setBloque] = useState(0);
  const [buscado, setBuscado] = useState('');

  const estadoDe = useMemo(() => new Map(ocupados.map((o) => [o.numero, o.estado])), [ocupados]);
  const total = numeroHasta - numeroDesde + 1;
  const bloques = Math.ceil(total / POR_BLOQUE);
  const desde = numeroDesde + bloque * POR_BLOQUE;
  const hasta = Math.min(desde + POR_BLOQUE - 1, numeroHasta);
  const vendidos = ocupados.filter((o) => o.estado === 'VENDIDO').length;
  const reservados = ocupados.filter((o) => o.estado === 'RESERVADO').length;

  const irAlNumero = (e: React.FormEvent) => {
    e.preventDefault();
    const numero = Number(buscado);
    if (Number.isInteger(numero) && numero >= numeroDesde && numero <= numeroHasta) {
      setBloque(Math.floor((numero - numeroDesde) / POR_BLOQUE));
    }
  };

  const numeros = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

  return (
    <section aria-labelledby="rifa-grilla-titulo" className="grilla-numeros">
      <div className="grilla-encabezado">
        <h2 id="rifa-grilla-titulo" className="rifas-subtitulo-seccion">
          {seleccionable ? 'Elegí tus números' : 'Números'}
        </h2>
        <ul className="grilla-leyenda">
          <li>
            <span className="grilla-muestra libre" aria-hidden="true" /> Disponibles (
            {total - ocupados.length})
          </li>
          {seleccionable && (
            <li>
              <span className="grilla-muestra elegido" aria-hidden="true" /> Elegidos (
              {seleccion.size})
            </li>
          )}
          <li>
            <span className="grilla-muestra vendido" aria-hidden="true" /> Vendidos ({vendidos})
          </li>
          <li>
            <span className="grilla-muestra reservado" aria-hidden="true" /> Reservados (
            {reservados})
          </li>
        </ul>
      </div>

      {bloques > 1 && (
        <div className="grilla-navegacion">
          <Button
            variant="secondary"
            disabled={bloque === 0}
            onClick={() => setBloque((b) => b - 1)}
          >
            ← Anteriores
          </Button>
          <span>
            {desde} – {hasta}
          </span>
          <Button
            variant="secondary"
            disabled={bloque + 1 >= bloques}
            onClick={() => setBloque((b) => b + 1)}
          >
            Siguientes →
          </Button>
          <form onSubmit={irAlNumero} className="grilla-buscar">
            <Input
              aria-label="Buscar un número"
              type="number"
              min={numeroDesde}
              max={numeroHasta}
              placeholder="Buscar número"
              value={buscado}
              onChange={(e) => setBuscado(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              Ir
            </Button>
          </form>
        </div>
      )}

      <ol className="grilla" aria-label={`Números del ${desde} al ${hasta}`}>
        {numeros.map((numero) => {
          const estado = estadoDe.get(numero);
          const elegido = seleccion.has(numero);
          const clase = `grilla-celda ${estado ? estado.toLowerCase() : elegido ? 'elegido' : 'libre'}${
            String(numero) === buscado ? ' buscado' : ''
          }`;
          return (
            <li key={numero} className={estado || !seleccionable ? clase : undefined}>
              {estado || !seleccionable ? (
                <span aria-label={`${numero}: ${estado ? TEXTO_ESTADO[estado] : 'disponible'}`}>
                  {numero}
                </span>
              ) : (
                <button
                  type="button"
                  className={clase}
                  aria-pressed={elegido}
                  aria-label={`${numero}: ${elegido ? 'elegido' : 'disponible'}`}
                  onClick={() => onAlternar(numero)}
                >
                  {numero}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
