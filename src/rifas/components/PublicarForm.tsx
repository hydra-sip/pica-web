import React, { useEffect, useMemo, useState } from 'react';
import { FaltantePublicacion, rifaApi, RifaDetalle } from '../../api/rifaApi';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import { fechaHora, pesos } from '../../shared/formato';
import { Button } from '../../shared/ui';
import { TERMINOS_RIFA } from '../terminos';

interface PublicarFormProps {
  rifa: RifaDetalle;
  editable: boolean;
  onPublicada: (rifa: RifaDetalle) => void;
  onAnterior: () => void;
  /** Lleva al paso donde se corrige un faltante (0 = datos generales, 1 = premios). */
  onIrAPaso: (indice: number) => void;
}

const FALTANTES: Record<FaltantePublicacion, { texto: (suma: number) => string; paso: number }> = {
  VENTANA: { texto: () => 'Cargá las fechas de inicio y fin de la venta.', paso: 0 },
  VENTA_YA_EMPEZO: {
    texto: () => 'Las fechas de venta quedaron en el pasado: actualizalas.',
    paso: 0,
  },
  FECHA_SORTEO: { texto: () => 'Cargá la fecha del sorteo.', paso: 0 },
  SIN_PREMIOS: { texto: () => 'Cargá al menos un premio.', paso: 1 },
  PREMIOS_NO_SUMAN_100: {
    texto: (suma) => `Los premios suman ${suma}%: tienen que sumar 100%.`,
    paso: 1,
  },
};

const NOMBRE_PASO = ['Datos generales', 'Premios'];

/** Lo mismo que controla el back, para avisar antes de intentar publicar. */
const faltantesDe = (rifa: RifaDetalle): FaltantePublicacion[] => {
  const faltantes: FaltantePublicacion[] = [];
  if (!rifa.ventaDesde || !rifa.ventaHasta) {
    faltantes.push('VENTANA');
  } else if (new Date(rifa.ventaDesde).getTime() < Date.now()) {
    faltantes.push('VENTA_YA_EMPEZO');
  }
  if (!rifa.fechaSorteo) {
    faltantes.push('FECHA_SORTEO');
  }
  const suma = rifa.premios.reduce((total, p) => total + p.pct, 0);
  if (rifa.premios.length === 0) {
    faltantes.push('SIN_PREMIOS');
  } else if (suma !== 100) {
    faltantes.push('PREMIOS_NO_SUMAN_100');
  }
  return faltantes;
};

/**
 * Paso 3 del asistente, "Publicar" (T402-4): resumen, términos con su casilla y la declaración de la
 * autorización de la lotería. POST /rifas/{id}/publicar pasa la rifa a EN_VENTA; si le falta algo,
 * se listan los faltantes con un link al paso donde se corrigen.
 */
export const PublicarForm: React.FC<PublicarFormProps> = ({
  rifa,
  editable,
  onPublicada,
  onAnterior,
  onIrAPaso,
}) => {
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [declaraLoteria, setDeclaraLoteria] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faltantesDelBack, setFaltantesDelBack] = useState<FaltantePublicacion[] | null>(null);

  // Lo que respondió el back vale hasta que se guarda algo en otro paso; ahí se vuelve a calcular
  useEffect(() => setFaltantesDelBack(null), [rifa]);
  const faltantes = useMemo(() => faltantesDelBack ?? faltantesDe(rifa), [rifa, faltantesDelBack]);
  const sumaPremios = rifa.premios.reduce((total, p) => total + p.pct, 0);

  const publicar = async () => {
    setError(null);
    setFaltantesDelBack(null);
    setPublicando(true);
    try {
      onPublicada(await rifaApi.publicar(rifa.id));
    } catch (err) {
      const problema = (err as { problemDetail?: { faltantes?: FaltantePublicacion[] } })
        .problemDetail;
      if (codigoDeError(err) === 'RIFA_INCOMPLETA' && problema?.faltantes) {
        setFaltantesDelBack(problema.faltantes);
      } else {
        setError(mensajeDeError(err, 'No se pudo publicar la rifa.'));
      }
    } finally {
      setPublicando(false);
    }
  };

  if (!editable) {
    return (
      <div className="rifas-form">
        <div className="rifas-tarjeta-titulo">
          <h2>Paso 3: Publicación</h2>
        </div>
        <div className="alerta alerta-exito" role="status">
          La rifa se publicó el {fechaHora(rifa.terminosAceptadosEn)}: el organizador aceptó los
          términos y declaró la autorización de la lotería.
        </div>
        <div className="rifas-pie">
          <span>Paso 3 de 3</span>
          <div className="rifas-acciones">
            <Button variant="ghost" onClick={onAnterior}>
              ← Anterior
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rifas-form">
      <div className="rifas-tarjeta-titulo">
        <h2>Paso 3: Publicar la rifa</h2>
        <span>Una vez publicada no se puede modificar</span>
      </div>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      {faltantes.length > 0 && (
        <div className="alerta alerta-aviso" role={faltantesDelBack ? 'alert' : undefined}>
          <strong>Antes de publicar, completá lo que falta:</strong>
          <ul className="rifas-faltantes">
            {faltantes.map((f) => (
              <li key={f}>
                {FALTANTES[f].texto(sumaPremios)}{' '}
                <button
                  type="button"
                  className="rifas-link"
                  onClick={() => onIrAPaso(FALTANTES[f].paso)}
                >
                  Ir a {NOMBRE_PASO[FALTANTES[f].paso]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="rifas-resumen">
        <div>
          <dt>Números</dt>
          <dd>
            {rifa.numeroDesde} – {rifa.numeroHasta} ({rifa.numeroHasta - rifa.numeroDesde + 1})
          </dd>
        </div>
        <div>
          <dt>Precio por número</dt>
          <dd>{pesos(rifa.precioNumero)}</dd>
        </div>
        <div>
          <dt>Venta</dt>
          <dd>
            {rifa.ventaDesde
              ? `${fechaHora(rifa.ventaDesde)} a ${fechaHora(rifa.ventaHasta)}`
              : '-'}
          </dd>
        </div>
        <div>
          <dt>Sorteo</dt>
          <dd>{fechaHora(rifa.fechaSorteo)}</dd>
        </div>
        {/* A todo el ancho: cada premio en su línea, y una descripción larga sigue abajo al llegar al borde */}
        <div className="rifas-resumen-ancho">
          <dt>Premios</dt>
          <dd>
            {rifa.premios.length === 0 ? (
              '-'
            ) : (
              <ul className="rifas-resumen-premios">
                {rifa.premios.map((p) => (
                  <li key={p.puesto}>
                    {p.puesto}º {p.pct}%{p.descripcion && ` ${p.descripcion}`}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="rifa-terminos-titulo">
        <h3 id="rifa-terminos-titulo" className="rifas-subtitulo-seccion">
          Términos y condiciones
        </h3>
        <div className="rifas-terminos" tabIndex={0}>
          {TERMINOS_RIFA.map((t) => (
            <p key={t.titulo}>
              <strong>{t.titulo}.</strong> {t.texto}
            </p>
          ))}
        </div>
      </section>

      <label className="rifas-casilla">
        <input
          type="checkbox"
          checked={aceptaTerminos}
          onChange={(e) => setAceptaTerminos(e.target.checked)}
          disabled={publicando}
        />
        <span>Leí y acepto los términos y condiciones de la rifa.</span>
      </label>

      <label className="rifas-casilla">
        <input
          type="checkbox"
          checked={declaraLoteria}
          onChange={(e) => setDeclaraLoteria(e.target.checked)}
          disabled={publicando}
        />
        <span>
          Declaro que cuento con la autorización de la Lotería provincial para realizar esta rifa.
        </span>
      </label>

      <div className="rifas-pie">
        <span>Paso 3 de 3</span>
        <div className="rifas-acciones">
          <Button variant="ghost" onClick={onAnterior} disabled={publicando}>
            ← Anterior
          </Button>
          <Button
            onClick={() => void publicar()}
            loading={publicando}
            disabled={!aceptaTerminos || !declaraLoteria || faltantes.length > 0}
          >
            Publicar rifa
          </Button>
        </div>
      </div>
    </div>
  );
};
