import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { NumeroOcupado, rifaPublicaApi, RifaPublicaDetalle } from '../../api/rifaApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { fechaHora, pesos } from '../../shared/formato';
import { Badge, BadgeTone, Card } from '../../shared/ui';
import { GrillaNumeros } from '../components/GrillaNumeros';
import '../rifas.css';

const estadoDeLaVenta = (rifa: RifaPublicaDetalle): { texto: string; tono: BadgeTone } => {
  const ahora = Date.now();
  if (rifa.estado !== 'EN_VENTA' || new Date(rifa.ventaHasta).getTime() <= ahora) {
    return { texto: 'Venta cerrada', tono: 'neutral' };
  }
  if (new Date(rifa.ventaDesde).getTime() > ahora) {
    return { texto: 'Próximamente', tono: 'aviso' };
  }
  return { texto: 'En venta', tono: 'exito' };
};

/** GET /rifas/publicas/{id} y su grilla (PICA-221): la rifa como la ve quien compra, sin login. */
export const RifaPublicaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [rifa, setRifa] = useState<RifaPublicaDetalle | null>(null);
  const [ocupados, setOcupados] = useState<NumeroOcupado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    Promise.all([rifaPublicaApi.obtener(Number(id)), rifaPublicaApi.numerosOcupados(Number(id))])
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
  }, [id]);

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

      <Card>
        {rifa.descripcion && <p className="rifa-descripcion">{rifa.descripcion}</p>}
        <dl className="rifas-resumen">
          <div>
            <dt>Precio por número</dt>
            <dd>{pesos(rifa.precioNumero)}</dd>
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
        />
      </Card>
    </div>
  );
};
