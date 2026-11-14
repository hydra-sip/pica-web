import React, { useEffect, useMemo, useState } from 'react';
import { custodiaApi, IngresoInscripcion } from '../../api/custodiaApi';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, BadgeTone, Button, Card, Input, Select, Table } from '../../shared/ui';
import './pagoConSaldo.css';
import './panelFinanciero.css';

interface LibroDeIngresosProps {
  torneoId: number;
}

const POR_PAGINA = 10;

const ESTADO: Record<IngresoInscripcion['estado'], { texto: string; tono: BadgeTone }> = {
  CONFIRMADO: { texto: 'Confirmado', tono: 'exito' },
  REVERTIDO: { texto: 'Devuelto', tono: 'info' },
  PENDIENTE: { texto: 'Pendiente', tono: 'aviso' },
  RECHAZADO: { texto: 'Rechazado', tono: 'peligro' },
};

/** Sin tildes ni mayúsculas, para buscar «lujan» y encontrar «Luján». */
const normal = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * HU-608, wireframe «Dashboard Contable y Liquidación»: el libro de ingresos del torneo, un pago de inscripción por
 * fila, con quién pagó (el capitán, en equipos), lo que pagó y los gastos administrativos aparte. Se busca por equipo,
 * jugador o comprobante y se filtra por estado; viene entero porque no pasa del cupo, y se pagina acá.
 */
export const LibroDeIngresos: React.FC<LibroDeIngresosProps> = ({ torneoId }) => {
  const [ingresos, setIngresos] = useState<IngresoInscripcion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<IngresoInscripcion['estado'] | ''>('');
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    let vigente = true;
    custodiaApi
      .ingresos(torneoId)
      .then((i) => vigente && setIngresos(i))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar el libro de ingresos.'))
      );
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  const filtrados = useMemo(() => {
    const q = normal(busqueda.trim());
    return (ingresos ?? []).filter(
      (i) =>
        (!estado || i.estado === estado) &&
        (!q ||
          [i.equipoNombre, i.pagadorNombre, i.pagadorUsername, i.comprobante].some(
            (campo) => campo && normal(campo).includes(q)
          ))
    );
  }, [ingresos, busqueda, estado]);

  if (error) {
    return (
      <div className="alerta alerta-peligro" role="alert">
        {error}
      </div>
    );
  }
  if (!ingresos) return null;

  const total = filtrados.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const visibles = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const conEquipos = ingresos.some((i) => i.equipoNombre);

  return (
    <Card as="section" className="libro-ingresos" aria-label="Libro de ingresos por inscripción">
      <div className="panel-financiero-encabezado">
        <h2>
          Libro de ingresos por inscripción ({ingresos.length}{' '}
          {ingresos.length === 1 ? 'registro' : 'registros'})
        </h2>
        <div className="libro-ingresos-filtros">
          <Input
            type="search"
            aria-label="Buscar en el libro de ingresos"
            placeholder="Buscar equipo, jugador o comprobante..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(0);
            }}
          />
          <Select
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as IngresoInscripcion['estado'] | '');
              setPagina(0);
            }}
          >
            <option value="">Todos</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="REVERTIDO">Devuelto</option>
          </Select>
        </div>
      </div>

      {ingresos.length === 0 ? (
        <p className="panel-financiero-aviso">Todavía no entró ningún pago de inscripción.</p>
      ) : total === 0 ? (
        <p className="panel-financiero-aviso">No hay pagos que coincidan con la búsqueda.</p>
      ) : (
        <>
          <Table caption="Pagos de inscripción, del más nuevo al más viejo">
            <thead>
              <tr>
                <th>Comprobante</th>
                {conEquipos && <th>Equipo</th>}
                <th>{conEquipos ? 'Capitán' : 'Jugador'}</th>
                <th>Fecha</th>
                <th>Inscripción</th>
                <th>Gastos adm.</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((i) => (
                <tr key={i.movimientoId}>
                  <td>
                    <code>{i.comprobante}</code>
                  </td>
                  {conEquipos && <td>{i.equipoNombre ?? '-'}</td>}
                  <td>
                    {i.pagadorNombre}{' '}
                    <span className="libro-ingresos-usuario">@{i.pagadorUsername}</span>
                  </td>
                  <td>{fechaHora(i.pagadoEn)}</td>
                  <td>{pesos(i.monto)}</td>
                  <td>{pesos(i.gastosAdministrativos)}</td>
                  <td>
                    <strong>{pesos(i.total)}</strong>
                  </td>
                  <td>
                    <Badge tone={ESTADO[i.estado].tono}>{ESTADO[i.estado].texto}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="libro-ingresos-paginacion">
            <span>
              Mostrando {pagina * POR_PAGINA + 1} a {Math.min((pagina + 1) * POR_PAGINA, total)} de{' '}
              {total} {total === 1 ? 'pago' : 'pagos'}
            </span>
            <nav
              aria-label="Paginación del libro de ingresos"
              className="panel-financiero-descargas"
            >
              <Button
                size="sm"
                variant="secondary"
                disabled={pagina === 0}
                onClick={() => setPagina(pagina - 1)}
              >
                &laquo; Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pagina + 1 >= paginas}
                onClick={() => setPagina(pagina + 1)}
              >
                Siguiente &raquo;
              </Button>
            </nav>
          </div>
        </>
      )}
    </Card>
  );
};
