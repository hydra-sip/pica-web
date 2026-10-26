import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { rifaApi, RifaDetalle } from '../../api/rifaApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Card } from '../../shared/ui';
import { PasosAsistente } from '../../shared/components/PasosAsistente';
import { DatosGeneralesForm } from '../components/DatosGeneralesForm';
import { PremiosForm } from '../components/PremiosForm';
import { PublicarForm } from '../components/PublicarForm';
import { PasoGuardable } from '../components/pasoGuardable';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../formato';
import '../rifas.css';

// Cada paso tiene su valor en ?paso= para poder recargar o compartir la URL; el primero va sin parámetro
const PASOS_URL = ['', 'premios', 'publicar'];

const SIN_BORRADOR = 'Se habilita al guardar el borrador';

/**
 * Alta, edición y publicación de una rifa sin torneo (PICA-227, T402-4), como asistente en tres pasos
 * con el formato de "Crear Nueva Competencia". Los dos primeros se guardan por separado, también al
 * cambiar de paso (si tienen errores no se cambia); el tercero la publica. Fuera de BORRADOR todo es
 * de solo lectura.
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
  const datosRef = useRef<PasoGuardable>(null);
  const premiosRef = useRef<PasoGuardable>(null);

  const pedido = Math.max(0, PASOS_URL.indexOf(searchParams.get('paso') ?? ''));
  const paso = rifa ? pedido : 0;
  const editable = !rifa || rifa.estado === 'BORRADOR';
  const estado = rifa?.estado ?? 'BORRADOR';

  useEffect(() => {
    if (!id) {
      setRifa(null);
      return;
    }
    let vigente = true;
    setCargando(true);
    setError(null);
    rifaApi
      .obtener(Number(id))
      .then((r) => vigente && setRifa(r))
      .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar la rifa.')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [id]);

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
        <p className="rifas-subtitulo">
          Rifa sin torneo asociado: el pozo se reparte entre sus premios.
        </p>
      </header>

      {recienPublicada ? (
        <div className="alerta alerta-exito" role="status">
          ¡Listo! La rifa quedó publicada y en venta.
        </div>
      ) : (
        !editable && (
          <div className="alerta alerta-info" role="status">
            La rifa ya está publicada, no se pueden realizar cambios.
          </div>
        )
      )}

      <PasosAsistente
        actual={paso}
        onIr={(indice) => void irAPaso(indice)}
        pasos={[
          { titulo: 'Datos generales', subtitulo: 'Números, precio y fechas de venta y sorteo' },
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
