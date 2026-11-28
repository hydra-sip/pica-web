import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EVENTO_NOTIFICACIONES_LEIDAS, Notificacion, notificacionApi } from '../../api/notificacionApi';
import { websocketService } from '../../realtime/websocketService';
import { Badge, Button } from '../../shared/ui';
import { IconoFlechaIzquierda } from '../../shared/ui/Iconos';
import { accion, hace, IconoNotificacion } from '../formato';
import '../notificaciones.css';

const POR_PAGINA = 20;

type Pestana = 'todas' | 'no-leidas' | 'leidas';

const PESTANAS: ReadonlyArray<[Pestana, string]> = [
  ['todas', 'Todas'],
  ['no-leidas', 'No leídas'],
  ['leidas', 'Leídas'],
];

// el filtro de GET /me/notificaciones: sin leida, todas
const FILTRO: Record<Pestana, boolean | undefined> = { todas: undefined, 'no-leidas': false, leidas: true };

const VACIO: Record<Pestana, string> = {
  todas: 'Todavía no tenés notificaciones. Acá te avisamos de tus rivales, el check-in y tus reclamos.',
  'no-leidas': 'No tenés notificaciones sin leer.',
  leidas: 'Todavía no leíste ninguna notificación.',
};

const avisarLeidas = () => window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES_LEIDAS));

/**
 * Centro de notificaciones (HU-808, T808-3), basado en el wireframe: de la más nueva a la más vieja, con pestañas para
 * ver todas, las no leídas o las leídas; la no leída lleva la etiqueta "Nueva". Una pasa a leída solo al tocarla (y
 * lleva a su enlace) o con "Marcar todas como leídas". Las que llegan en vivo aparecen arriba sin recargar.
 */
export const NotificacionesPage: React.FC = () => {
  const navigate = useNavigate();
  const [pestana, setPestana] = useState<Pestana>('todas');
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = async (numero: number, de: Pestana) => {
    setCargando(true);
    try {
      const respuesta = await notificacionApi.listar(FILTRO[de], numero, POR_PAGINA);
      setNotificaciones((anteriores) => (numero === 0 ? respuesta.content : [...anteriores, ...respuesta.content]));
      setPagina(numero);
      setHayMas(numero + 1 < respuesta.page.totalPages);
      setError(null);
    } catch {
      setError('No se pudieron cargar las notificaciones.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    setNotificaciones([]);
    void cargar(0, pestana);
    if (pestana === 'leidas') return;
    // la que llega en vivo todavía no se leyó: va arriba en Todas y en No leídas
    return websocketService.subscribeToNotificaciones((nueva) => {
      setNotificaciones((anteriores) =>
        anteriores.some((n) => n.id === nueva.id) ? anteriores : [nueva, ...anteriores]
      );
    });
  }, [pestana]);

  const abrir = async (notificacion: Notificacion) => {
    if (!notificacion.leidaEn) {
      try {
        await notificacionApi.marcarLeida(notificacion.id);
        avisarLeidas();
        // por si no lleva a otra pantalla: en No leídas sale de la lista, en Todas pierde la etiqueta
        const ahora = new Date().toISOString();
        setNotificaciones((anteriores) =>
          pestana === 'no-leidas'
            ? anteriores.filter((n) => n.id !== notificacion.id)
            : anteriores.map((n) => (n.id === notificacion.id ? { ...n, leidaEn: ahora } : n))
        );
      } catch {
        // Si no se pudo marcar, la próxima vez vuelve a aparecer sin leer: no corta la navegación.
      }
    }
    if (notificacion.enlace) navigate(notificacion.enlace);
  };

  const marcarTodas = async () => {
    try {
      await notificacionApi.marcarTodas();
      avisarLeidas();
      if (pestana === 'no-leidas') {
        setNotificaciones([]);
        setHayMas(false);
      } else {
        const ahora = new Date().toISOString();
        setNotificaciones((anteriores) => anteriores.map((n) => ({ ...n, leidaEn: n.leidaEn ?? ahora })));
      }
    } catch {
      setError('No se pudieron marcar como leídas. Probá de nuevo.');
    }
  };

  const haySinLeer = notificaciones.some((n) => !n.leidaEn);

  return (
    <div className="notificaciones">
      <header className="notificaciones-cabecera">
        <button type="button" className="app-boton-icono" onClick={() => navigate(-1)} aria-label="Volver">
          <IconoFlechaIzquierda />
        </button>
        <h1>Notificaciones</h1>
      </header>

      <div className="notificaciones-pestanas" role="tablist" aria-label="Qué notificaciones ver">
        {PESTANAS.map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={pestana === valor}
            className={`notificaciones-pestana${pestana === valor ? ' activa' : ''}`}
            onClick={() => setPestana(valor)}
          >
            {texto}
          </button>
        ))}
      </div>

      {haySinLeer && (
        <Button variant="secondary" size="sm" onClick={marcarTodas} className="notificaciones-marcar-todas">
          Marcar todas como leídas
        </Button>
      )}

      {error && (
        <p className="notificaciones-error" role="alert">
          {error}
        </p>
      )}

      {!cargando && notificaciones.length === 0 && !error && <p className="notificaciones-vacio">{VACIO[pestana]}</p>}

      <ul className="notificaciones-lista">
        {notificaciones.map((notificacion) => (
          <li key={notificacion.id}>
            <button
              type="button"
              className="notificacion-tarjeta"
              onClick={() => abrir(notificacion)}
              aria-label={`${notificacion.leidaEn ? '' : 'Nueva: '}${notificacion.titulo}`}
            >
              <span className="notificacion-icono" aria-hidden="true">
                <IconoNotificacion notificacion={notificacion} />
              </span>
              <span className="notificacion-contenido">
                <span className="notificacion-titulo">
                  <strong>{notificacion.titulo}</strong>
                  {!notificacion.leidaEn && <Badge tone="exito">Nueva</Badge>}
                </span>
                <span className="notificacion-texto">{notificacion.cuerpo}</span>
                <small>
                  {hace(notificacion.creadaEn)} · {accion(notificacion)}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {hayMas && (
        <Button variant="secondary" onClick={() => cargar(pagina + 1, pestana)} loading={cargando} block>
          Ver más
        </Button>
      )}
    </div>
  );
};
