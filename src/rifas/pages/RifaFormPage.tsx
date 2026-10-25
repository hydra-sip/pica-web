import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { rifaApi, RifaDetalle } from '../../api/rifaApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Card } from '../../shared/ui';
import { PasosAsistente } from '../../shared/components/PasosAsistente';
import { DatosGeneralesForm } from '../components/DatosGeneralesForm';
import { PremiosForm } from '../components/PremiosForm';
import { ESTADO_RIFA_UI, TONO_ESTADO_RIFA } from '../formato';
import '../rifas.css';

/**
 * Alta y edición de una rifa sin torneo (PICA-227), como asistente en dos pasos con el formato de
 * "Crear Nueva Competencia". Cada paso se guarda por separado; el de premios se habilita cuando la
 * rifa ya existe, y fuera de BORRADOR todo queda de solo lectura.
 */
export const RifaFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [rifa, setRifa] = useState<RifaDetalle | null>(null);
  const [cargando, setCargando] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const paso = searchParams.get('paso') === 'premios' && rifa ? 1 : 0;
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

  const irAPaso = (indice: number) => {
    setSearchParams(indice === 1 ? { paso: 'premios' } : {}, { replace: true });
  };

  const alGuardarDatos = (guardada: RifaDetalle, seguir: boolean) => {
    setRifa(guardada);
    if (!id) {
      // Recién creada: pasa a la URL de edición, que es la que se puede recargar o compartir.
      navigate(`/rifas/${guardada.id}/editar${seguir ? '?paso=premios' : ''}`, { replace: true });
    } else if (seguir) {
      irAPaso(1);
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
        <p className="rifas-subtitulo">
          Rifa sin torneo asociado: el pozo se reparte entre sus premios.
        </p>
      </header>

      {!editable && (
        <div className="alerta alerta-info" role="status">
          La rifa ya no está en borrador: se muestra de solo lectura.
        </div>
      )}

      <PasosAsistente
        actual={paso}
        onIr={irAPaso}
        pasos={[
          { titulo: 'Datos generales', subtitulo: 'Título, números, precio y fechas de venta' },
          {
            titulo: 'Premios',
            subtitulo: rifa ? 'Porcentaje del pozo por puesto' : 'Se habilita al guardar el paso 1',
            bloqueado: !rifa,
          },
        ]}
      />

      <Card>
        {/* Los dos pasos quedan montados para no perder lo que no se guardó al ir y volver. */}
        <div hidden={paso !== 0}>
          <DatosGeneralesForm
            rifa={rifa}
            editable={editable}
            onGuardada={alGuardarDatos}
            onSiguiente={() => irAPaso(1)}
          />
        </div>
        {rifa && (
          <div hidden={paso !== 1}>
            <PremiosForm
              rifa={rifa}
              editable={editable}
              onGuardada={setRifa}
              onAnterior={() => irAPaso(0)}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
