import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { rifaApi, RifaDetalle } from '../../api/rifaApi';
import { useRifaRealtime } from '../../realtime/useRifaRealtime';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card, Modal } from '../../shared/ui';
import { PasosAsistente } from '../../shared/components/PasosAsistente';
import { DatosGeneralesForm } from '../components/DatosGeneralesForm';
import { PremiosForm } from '../components/PremiosForm';
import { PublicarForm } from '../components/PublicarForm';
import { ListaSellada } from '../components/ListaSellada';
import { RecaudadoRifa } from '../components/RecaudadoRifa';
import { PasoGuardable } from '../components/pasoGuardable';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../formato';
import '../rifas.css';

// Cada paso tiene su valor en ?paso= para poder recargar o compartir la URL; el primero va sin parámetro
const PASOS_URL = ['', 'premios', 'publicar'];

const SIN_BORRADOR = 'Se habilita al guardar el borrador';

// Lo que pide confirmación antes de hacerse: volver a borrador y eliminar (PICA-288), cerrar la venta (HU-407)
const ACCIONES = {
  borrador: {
    titulo: 'Volver a borrador',
    boton: 'Volver a borrador',
    variante: 'primary',
    texto:
      'La rifa deja de estar en venta hasta que la vuelvas a publicar, y vas a tener que aceptar de nuevo los términos.',
  },
  eliminar: {
    titulo: 'Eliminar la rifa',
    boton: 'Eliminar',
    variante: 'danger',
    texto: 'La rifa deja de aparecer en tus rifas y en las rifas en venta. No se puede deshacer.',
  },
  cerrar: {
    titulo: 'Cerrar la venta',
    boton: 'Cerrar venta',
    variante: 'primary',
    texto:
      'Nadie más va a poder comprar números y la lista de vendidos queda sellada para el sorteo. No se puede deshacer.',
  },
} as const;

/**
 * Alta, edición y publicación de una rifa, con o sin torneo (PICA-227, T402-4, PICA-220), como asistente
 * en tres pasos con el formato de "Crear Nueva Competencia". Los dos primeros se guardan por separado,
 * también al cambiar de paso (si tienen errores no se cambia); el tercero la publica. Fuera de BORRADOR
 * todo es de solo lectura; publicada y sin compras, se puede volver a borrador o eliminar (PICA-288).
 * Desde Mis torneos se llega con ?torneo= y el torneo ya elegido.
 */
export const RifaFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [rifa, setRifa] = useState<RifaDetalle | null>(null);
  const [cargando, setCargando] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [recienPublicada, setRecienPublicada] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [confirmar, setConfirmar] = useState<keyof typeof ACCIONES | null>(null);
  const [accionando, setAccionando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const datosRef = useRef<PasoGuardable>(null);
  const premiosRef = useRef<PasoGuardable>(null);

  const torneoInicial = Number(searchParams.get('torneo')) || undefined;
  const pedido = Math.max(0, PASOS_URL.indexOf(searchParams.get('paso') ?? ''));
  const paso = rifa ? pedido : 0;
  const editable = !rifa || rifa.estado === 'BORRADOR';
  const estado = rifa?.estado ?? 'BORRADOR';

  const recargarRifa = useCallback(() => {
    if (!id) {
      setRifa(null);
      return;
    }
    rifaApi
      .obtener(Number(id))
      .then(setRifa)
      .catch((err) => setError(mensajeDeError(err, 'No se pudo cargar la rifa.')))
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    if (!id) {
      setRifa(null);
      return;
    }
    setCargando(true);
    setError(null);
    recargarRifa();
  }, [id, recargarRifa]);

  useRifaRealtime(id ? Number(id) : null, {
    onRifaChange: (nuevaRifa) => {
      setRifa(nuevaRifa);
    },
    onEstadoChange: (nuevoEstado) => {
      setRifa((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
    },
    onActualizar: (data) => {
      if (data.rifa) {
        setRifa(data.rifa);
      } else if (data.estado) {
        setRifa((prev) => (prev ? { ...prev, estado: data.estado! } : prev));
      } else {
        recargarRifa();
      }
    },
    onReconnect: () => {
      recargarRifa();
    },
  });

  const urlDePaso = (rifaId: number, indice: number) =>
    `/rifas/${rifaId}/editar${indice > 0 ? `?paso=${PASOS_URL[indice]}` : ''}`;

  /**
   * Todos los cambios de paso (Siguiente, Anterior y la barra de pasos) pasan por acá: el paso actual
   * valida y guarda primero, y si tiene errores no se cambia de pantalla.
   */
  const irAPaso = async (indice: number) => {
    if (indice === paso || cambiando) {
      return;
    }
    setCambiando(true);
    try {
      const actual = paso === 0 ? datosRef.current : paso === 1 ? premiosRef.current : null;
      const guardada = actual ? await actual.guardar() : rifa;
      if (guardada) {
        setSearchParams(indice > 0 ? { paso: PASOS_URL[indice] } : {}, { replace: true });
      }
    } finally {
      setCambiando(false);
    }
  };

  const alGuardarDatos = (guardada: RifaDetalle) => {
    setRifa(guardada);
    // Al crear el borrador pasa a la URL de edición, que es la que se puede recargar o compartir
    if (!id) {
      navigate(urlDePaso(guardada.id, 0), { replace: true });
    }
  };

  const alPublicar = (publicada: RifaDetalle) => {
    setRifa(publicada);
    setRecienPublicada(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Volver a borrador o eliminar (PICA-288): solo mientras nadie compró; el back también lo controla
  const sinCompras = rifa?.estado === 'EN_VENTA' && rifa.numerosVendidos === 0;

  const confirmarAccion = async () => {
    if (!rifa || !confirmar) return;
    setAccionando(true);
    setErrorAccion(null);
    try {
      if (confirmar === 'eliminar') {
        await rifaApi.eliminar(rifa.id);
        navigate('/mis-rifas', { replace: true });
        return;
      }
      setRifa(
        confirmar === 'cerrar'
          ? await rifaApi.cerrarVenta(rifa.id)
          : await rifaApi.volverABorrador(rifa.id)
      );
      setRecienPublicada(false);
      setConfirmar(null);
      setSearchParams({}, { replace: true });
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo completar la acción.'));
    } finally {
      setAccionando(false);
    }
  };

  const volver = (
    <Link to="/mis-rifas" className="rifas-volver">
      ← Volver a mis rifas
    </Link>
  );

  if (cargando) {
    return (
      <div className="rifas-page">
        <p className="rifas-vacio">Cargando rifa...</p>
      </div>
    );
  }

  if (error) {
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

  return (
    <div className="rifas-page">
      <header>
        {volver}
        <div className="rifas-titulo-con-chip">
          <h1>{rifa ? rifa.titulo : 'Crear nueva rifa'}</h1>
          <Badge tone={TONO_ESTADO_RIFA[estado]}>{ESTADO_RIFA_UI[estado]}</Badge>
        </div>
        {rifa && (
          <p className="rifas-subtitulo">
            {rifa.torneoNombre
              ? `Rifa asociada al torneo ${rifa.torneoNombre}`
              : 'Rifa sin torneo asociado: el pozo se reparte entre sus premios.'}
          </p>
        )}
      </header>

      {recienPublicada && (
        <div className="alerta alerta-exito" role="status">
          ¡Listo! La rifa quedó publicada y en venta.
        </div>
      )}
      {rifa && !editable && !sinCompras && (
        <div className="alerta alerta-info" role="status">
          {rifa.listaSelladaEn
            ? 'La venta está cerrada y la lista de números vendidos quedó sellada.'
            : rifa.numerosVendidos > 0
              ? `La rifa ya tiene ${rifa.numerosVendidos} ${rifa.numerosVendidos === 1 ? 'número vendido' : 'números vendidos'}: no se pueden realizar cambios.`
              : 'La rifa ya está publicada, no se pueden realizar cambios.'}
        </div>
      )}
      {rifa?.estado === 'EN_VENTA' && (
        <div className="rifas-acciones">
          {sinCompras && (
            <>
              <Button variant="secondary" onClick={() => setConfirmar('borrador')}>
                Volver a borrador
              </Button>
              <Button variant="danger" onClick={() => setConfirmar('eliminar')}>
                Eliminar rifa
              </Button>
            </>
          )}
          {/* HU-407: antes de la fecha; al llegar ventaHasta la cierra sola el back */}
          <Button variant="secondary" onClick={() => setConfirmar('cerrar')}>
            Cerrar venta
          </Button>
        </div>
      )}
      {rifa && editable && (
        <div className="rifas-acciones">
          <Button variant="ghost" onClick={() => setConfirmar('eliminar')}>
            Eliminar rifa
          </Button>
        </div>
      )}

      <Modal
        isOpen={confirmar !== null}
        title={confirmar ? ACCIONES[confirmar].titulo : ''}
        onClose={() => setConfirmar(null)}
        closeDisabled={accionando}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmar(null)} disabled={accionando}>
              Cancelar
            </Button>
            <Button
              variant={confirmar ? ACCIONES[confirmar].variante : 'primary'}
              loading={accionando}
              onClick={() => void confirmarAccion()}
            >
              {confirmar && ACCIONES[confirmar].boton}
            </Button>
          </>
        }
      >
        {errorAccion && (
          <div className="alerta alerta-peligro" role="alert">
            {errorAccion}
          </div>
        )}
        <p>{confirmar && ACCIONES[confirmar].texto}</p>
      </Modal>

      {/* HU-405: desde que se publica, lo vendido y cómo se reparte */}
      {rifa && rifa.estado !== 'BORRADOR' && (
        <RecaudadoRifa
          titulo="Lo recaudado"
          reparto={rifa.reparto}
          torneoNombre={rifa.torneoNombre}
          pctDestinadoTorneo={rifa.pctDestinadoTorneo}
          vendidos={`${rifa.numerosVendidos} de ${rifa.numeroHasta - rifa.numeroDesde + 1}`}
        />
      )}
      {rifa?.listaHash && rifa.listaSelladaEn && (
        <ListaSellada listaHash={rifa.listaHash} listaSelladaEn={rifa.listaSelladaEn} />
      )}

      <PasosAsistente
        actual={paso}
        onIr={(indice) => void irAPaso(indice)}
        pasos={[
          { titulo: 'Datos generales', subtitulo: 'Torneo, números, precio y fechas' },
          {
            titulo: 'Premios',
            subtitulo: rifa ? 'Porcentaje del pozo por puesto' : SIN_BORRADOR,
            bloqueado: !rifa,
          },
          {
            titulo: 'Publicar',
            subtitulo: rifa ? 'Términos y declaración de la lotería' : SIN_BORRADOR,
            bloqueado: !rifa,
          },
        ]}
      />

      <Card>
        {/* Los pasos quedan montados para no perder lo que no se guardó al ir y volver. */}
        <div hidden={paso !== 0}>
          <DatosGeneralesForm
            ref={datosRef}
            rifa={rifa}
            torneoInicial={torneoInicial}
            editable={editable}
            onGuardada={alGuardarDatos}
            onSiguiente={() => void irAPaso(1)}
          />
        </div>
        {rifa && (
          <>
            <div hidden={paso !== 1}>
              <PremiosForm
                ref={premiosRef}
                rifa={rifa}
                editable={editable}
                onGuardada={setRifa}
                onAnterior={() => void irAPaso(0)}
                onSiguiente={() => void irAPaso(2)}
              />
            </div>
            <div hidden={paso !== 2}>
              <PublicarForm
                rifa={rifa}
                editable={editable}
                onPublicada={alPublicar}
                onAnterior={() => void irAPaso(1)}
                onIrAPaso={(indice) => void irAPaso(indice)}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
