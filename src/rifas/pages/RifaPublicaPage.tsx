import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CompraRifa,
  NumeroOcupado,
  rifaPublicaApi,
  RifaPublicaDetalle,
  ReservaRifa,
  ventaRifaApi,
} from '../../api/rifaApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRifaRealtime } from '../../realtime/useRifaRealtime';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import { fechaHora, pesos } from '../../shared/formato';
import { Badge, BadgeTone, Button, Card } from '../../shared/ui';
import { GrillaNumeros } from '../components/GrillaNumeros';
import { PagoRifa } from '../components/PagoRifa';
import { RecaudadoRifa } from '../components/RecaudadoRifa';
import '../rifas.css';

const estadoDeLaVenta = (
  rifa: RifaPublicaDetalle
): { texto: string; tono: BadgeTone; abierta: boolean } => {
  const ahora = Date.now();
  if (rifa.estado !== 'EN_VENTA' || new Date(rifa.ventaHasta).getTime() <= ahora) {
    return { texto: 'Venta cerrada', tono: 'neutral', abierta: false };
  }
  if (new Date(rifa.ventaDesde).getTime() > ahora) {
    return { texto: 'Próximamente', tono: 'aviso', abierta: false };
  }
  return { texto: 'En venta', tono: 'exito', abierta: true };
};

/** Los números que el back marcó como ocupados en un 409 (NUMERO_NO_DISPONIBLE, RESERVA_VENCIDA). */
const numerosDelError = (err: unknown): number[] =>
  (err as { problemDetail?: { numeros?: number[] } }).problemDetail?.numeros ?? [];

/**
 * GET /rifas/publicas/{id} y su grilla (PICA-221): la rifa como la ve quien compra, sin login. Con la venta abierta
 * se eligen números y se compran en dos pasos (PICA-223): "Comprar" los reserva y abre el pago simulado, y "Aceptar"
 * los paga. Las ventas de otros llegan por el tiempo real y la grilla se actualiza sola.
 */
export const RifaPublicaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const rifaId = Number(id);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [rifa, setRifa] = useState<RifaPublicaDetalle | null>(null);
  const [ocupados, setOcupados] = useState<NumeroOcupado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const [reservando, setReservando] = useState(false);
  const [reserva, setReserva] = useState<ReservaRifa | null>(null);
  // Una clave por intento de pago: si "Aceptar" se repite, el back devuelve el mismo comprobante
  const [clave, setClave] = useState('');
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [compra, setCompra] = useState<CompraRifa | null>(null);

  // con cada venta cambian la grilla y el monto acumulado (HU-405)
  const recargarNumeros = useCallback(() => {
    rifaPublicaApi
      .numerosOcupados(rifaId)
      .then(setOcupados)
      .catch(() => undefined);
    rifaPublicaApi
      .obtener(rifaId)
      .then(setRifa)
      .catch(() => undefined);
  }, [rifaId]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    Promise.all([rifaPublicaApi.obtener(rifaId), rifaPublicaApi.numerosOcupados(rifaId)])
      .then(([r, o]) => {
        if (vigente) {
          setRifa(r);
          setOcupados(o);
        }
      })
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar la rifa.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [rifaId]);

  useRifaRealtime(rifa ? rifa.id : null, {
    onActualizar: recargarNumeros,
    onReconnect: recargarNumeros,
  });

  const alternar = (numero: number) => {
    setAviso(null);
    setSeleccion((prev) => {
      const nueva = new Set(prev);
      if (nueva.has(numero)) {
        nueva.delete(numero);
      } else {
        nueva.add(numero);
      }
      return nueva;
    });
  };

  /** Algunos elegidos ya no están: se sacan de la selección y se actualiza la grilla. */
  const quitarOcupados = (numeros: number[], texto: string) => {
    setSeleccion((prev) => new Set([...prev].filter((n) => !numeros.includes(n))));
    setAviso(texto);
    recargarNumeros();
  };

  const comprar = async () => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: { pathname: location.pathname } } });
      return;
    }
    setAviso(null);
    setReservando(true);
    try {
      setReserva(await ventaRifaApi.reservar(rifaId, [...seleccion]));
      setClave(crypto.randomUUID());
      setErrorPago(null);
      recargarNumeros();
    } catch (err) {
      if (codigoDeError(err) === 'NUMERO_NO_DISPONIBLE') {
        const tomados = numerosDelError(err);
        quitarOcupados(tomados, `Alguien eligió antes ${tomados.join(', ')}: elegí otros.`);
      } else {
        setAviso(mensajeDeError(err, 'No se pudieron reservar los números.'));
      }
    } finally {
      setReservando(false);
    }
  };

  const pagar = async () => {
    if (!reserva) return;
    setPagando(true);
    setErrorPago(null);
    try {
      setCompra(await ventaRifaApi.comprar(rifaId, reserva.numeros, clave));
      setReserva(null);
      setSeleccion(new Set());
      recargarNumeros();
    } catch (err) {
      const codigo = codigoDeError(err);
      if (codigo === 'RESERVA_VENCIDA' || codigo === 'NUMERO_NO_DISPONIBLE') {
        setReserva(null);
        quitarOcupados(
          codigo === 'NUMERO_NO_DISPONIBLE' ? numerosDelError(err) : [],
          mensajeDeError(err, 'No se pudo completar la compra.')
        );
      } else {
        setErrorPago(mensajeDeError(err, 'No se pudo completar la compra.'));
      }
    } finally {
      setPagando(false);
    }
  };

  const cancelar = async () => {
    setReserva(null);
    try {
      await ventaRifaApi.cancelarReserva(rifaId);
    } catch {
      // Si no se pudo cancelar, la reserva vence sola
    }
    recargarNumeros();
  };

  const volver = (
    <Link to="/rifas" className="rifas-volver">
      ← Volver a las rifas
    </Link>
  );

  if (cargando) {
    return (
      <div className="rifas-page">
        <p className="rifas-vacio">Cargando rifa...</p>
      </div>
    );
  }

  if (error || !rifa) {
    return (
      <div className="rifas-page">
        <div>
          {volver}
          <div className="alerta alerta-peligro" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const venta = estadoDeLaVenta(rifa);
  const elegidos = [...seleccion].sort((a, b) => a - b);
  const monto = elegidos.length * rifa.precioNumero;

  return (
    <div className="rifas-page">
      <header>
        {volver}
        <div className="rifas-titulo-con-chip">
          <h1>{rifa.titulo}</h1>
          <Badge tone={venta.tono}>{venta.texto}</Badge>
        </div>
        {rifa.torneo && (
          <p className="rifas-subtitulo">
            Rifa asociada al torneo{' '}
            {rifa.torneo.slug ? (
              <Link to={`/torneos/${rifa.torneo.slug}`}>{rifa.torneo.nombre}</Link>
            ) : (
              rifa.torneo.nombre
            )}
          </p>
        )}
      </header>

      {/* HU-405: lo recaudado hasta ahora y cómo se reparte */}
      <RecaudadoRifa
        titulo="Monto acumulado"
        reparto={rifa.reparto}
        torneoNombre={rifa.torneo?.nombre ?? null}
        pctDestinadoTorneo={rifa.pctDestinadoTorneo}
      />

      <Card>
        <h2 className="rifas-subtitulo-seccion">Información</h2>
        <dl className="rifas-resumen">
          <div>
            <dt>Precio por número</dt>
            <dd>
              {pesos(rifa.precioNumero)}
              {rifa.pctGastosAdministrativos != null && rifa.pctGastosAdministrativos > 0 && (
                <span className="rifas-celda-secundaria">
                  + {rifa.pctGastosAdministrativos}% de gastos administrativos
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Venta</dt>
            <dd>
              {fechaHora(rifa.ventaDesde)} a {fechaHora(rifa.ventaHasta)}
            </dd>
          </div>
          <div>
            <dt>Sorteo</dt>
            <dd>{fechaHora(rifa.fechaSorteo)}</dd>
          </div>
          <div className="rifas-resumen-ancho">
            <dt>
              {rifa.torneo && rifa.pctDestinadoTorneo > 0 ? 'Destino de lo recaudado' : 'Premios'}
            </dt>
            <dd>
              <ul className="rifas-resumen-premios">
                {rifa.torneo && rifa.pctDestinadoTorneo > 0 && (
                  <li>
                    {rifa.pctDestinadoTorneo}% al pozo del torneo {rifa.torneo.nombre}
                  </li>
                )}
                {rifa.premios.map((p) => (
                  <li key={p.puesto}>
                    {p.puesto}º {p.pct}%{p.descripcion && ` ${p.descripcion}`}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <GrillaNumeros
          numeroDesde={rifa.numeroDesde}
          numeroHasta={rifa.numeroHasta}
          ocupados={ocupados}
          seleccionable={venta.abierta}
          seleccion={seleccion}
          onAlternar={alternar}
        />

        {aviso && (
          <div className="alerta alerta-aviso compra-aviso" role="alert">
            {aviso}
          </div>
        )}

        {venta.abierta && (
          <div className="rifas-pie compra-pie">
            <span>
              {elegidos.length === 0
                ? 'Elegí uno o más números de la grilla.'
                : `${elegidos.length === 1 ? 'Elegiste el' : 'Elegiste los'} ${elegidos.join(', ')} · ${pesos(monto)}`}
            </span>
            <div className="rifas-acciones">
              {elegidos.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setSeleccion(new Set())}
                  disabled={reservando}
                >
                  Limpiar
                </Button>
              )}
              <Button
                onClick={() => void comprar()}
                loading={reservando}
                disabled={elegidos.length === 0}
              >
                Comprar
              </Button>
            </div>
          </div>
        )}
      </Card>

      <PagoRifa
        reserva={reserva}
        compra={compra}
        pagando={pagando}
        error={errorPago}
        onPagar={() => void pagar()}
        onCancelar={() => void cancelar()}
        onCerrar={() => setCompra(null)}
      />
    </div>
  );
};
