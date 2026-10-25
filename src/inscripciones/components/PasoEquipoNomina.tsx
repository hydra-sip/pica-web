import React, { useState } from 'react';
import {
  InscripcionDetalle,
  InscripcionEquipoPayload,
  inscripcionApi,
} from '../../api/inscripcionApi';
import { useNavigate } from 'react-router-dom';
import { UsuarioPublico } from '../../api/jugadorApi';
import { Torneo } from '../../api/torneoApi';
import { useAuth } from '../../auth/hooks/useAuth';
import { pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Card } from '../../shared/ui';
import { useEquiposDelTorneo } from '../hooks/useEquiposDelTorneo';
import { BuscadorJugadores } from './BuscadorJugadores';
import { EQUIPO_NUEVO, SelectorEquipo } from './SelectorEquipo';
import '../inscripciones.css';

export interface PasoEquipoNominaProps {
  torneo: Torneo;
  /**
   * El borrador que se retoma. Sin él es el alta: todavía no se llamó a la API y el borrador se crea
   * al guardar. Tiene que estar en BORRADOR; quien lo renderiza se ocupa de redirigir las demás.
   */
  inscripcion?: InscripcionDetalle | null;
}

const cantidad = (n: number) => `${n} ${n === 1 ? 'jugador' : 'jugadores'}`;

/**
 * Paso 1 de la inscripción (HU-204): equipo, nómina y reglamento. Sirve para el alta y para retomar
 * un borrador, y guarda y navega solo (al paso 2 o al inicio).
 */
export const PasoEquipoNomina: React.FC<PasoEquipoNominaProps> = ({ torneo, inscripcion }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const minimo = torneo.tamanioEquipo ?? 1;
  const maximo = torneo.nominaMaxima;

  const {
    equipos,
    error: errorEquipos,
    agregar,
  } = useEquiposDelTorneo(torneo.id, inscripcion?.id, true);
  const [equipoElegido, setEquipoElegido] = useState(
    inscripcion?.equipo ? String(inscripcion.equipo.id) : ''
  );
  const [nombreNuevo, setNombreNuevo] = useState('');

  const capitanId = Number(user?.id);
  // El capitán va aparte (fijo y primero): acá quedan los demás jugadores.
  const [jugadores, setJugadores] = useState<UsuarioPublico[]>(
    () => inscripcion?.nomina?.filter((j) => j.id !== capitanId) ?? []
  );
  const total = jugadores.length + 1;
  const lleno = maximo !== null && total >= maximo;
  const sumar = (j: UsuarioPublico) => setJugadores((prev) => [...prev, j]);
  const sacar = (id: number) => setJugadores((prev) => prev.filter((j) => j.id !== id));

  const [reglamentoAceptado, setReglamentoAceptado] = useState(false);

  const gratis = torneo.valorInscripcion === 0;
  const creaNuevo = equipos?.length === 0 || equipoElegido === EQUIPO_NUEVO;
  const equipoListo = creaNuevo ? nombreNuevo.trim() !== '' : equipoElegido !== '';
  const nominaValida = total >= minimo && (maximo === null || total <= maximo);
  const puedeContinuar = reglamentoAceptado && equipoListo && nominaValida;

  // El borrador que ya existe en la API: el que se retoma o el que este paso guardó.
  const [borrador, setBorrador] = useState<InscripcionDetalle | null>(inscripcion ?? null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Crea el borrador o reemplaza el que ya hay con el equipo y la nómina de la pantalla. */
  const guardar = async (): Promise<InscripcionDetalle> => {
    const payload: InscripcionEquipoPayload = {
      ...(creaNuevo
        ? { nombreEquipoNuevo: nombreNuevo.trim() }
        : { equipoId: Number(equipoElegido) }),
      nomina: jugadores.map((j) => j.id),
    };
    const guardada = borrador
      ? await inscripcionApi.reemplazar(borrador.id, payload)
      : await inscripcionApi.crear(torneo.id, payload);
    setBorrador(guardada);
    // Si se creó un equipo por nombre, desde acá se lo elige como a cualquier otro: reintentar no crea otro.
    if (creaNuevo && guardada.equipo) {
      agregar(guardada.equipo);
      setEquipoElegido(String(guardada.equipo.id));
      setNombreNuevo('');
    }
    return guardada;
  };

  const continuar = async () => {
    setOcupado(true);
    setError(null);
    let guardada: InscripcionDetalle | null = null;
    try {
      guardada = await guardar();
      await inscripcionApi.confirmar(guardada.id, true);
      navigate(`/inscripciones/${guardada.id}/pago`);
    } catch (err) {
      const mensaje = mensajeDeError(err, 'No se pudo guardar la inscripción.');
      setError(guardada ? `${mensaje} Tu borrador quedó guardado.` : mensaje);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="inscripcion-page">
      <header className="inscripcion-encabezado">
        <h1>Inscripción de Equipo</h1>
        {!gratis && <span className="inscripcion-paso">Paso 1/2</span>}
      </header>

      <Card className="inscripcion-torneo">
        <strong>{torneo.nombre}</strong>
        <span>
          Nómina de {minimo} a {maximo} jugadores
        </span>
      </Card>

      {errorEquipos && (
        <div className="alerta alerta-peligro" role="alert">
          {errorEquipos}
        </div>
      )}

      <SelectorEquipo
        equipos={equipos}
        valor={equipoElegido}
        onValor={setEquipoElegido}
        nombreNuevo={nombreNuevo}
        onNombreNuevo={setNombreNuevo}
      />

      <section aria-labelledby="nomina-titulo" className="inscripcion-bloque">
        <h2 id="nomina-titulo" className="inscripcion-etiqueta">
          Armado de Nómina (Buscar por @usuario o nombre)
        </h2>
        <BuscadorJugadores
          enNomina={new Set([capitanId, ...jugadores.map((j) => j.id)])}
          lleno={lleno}
          onSumar={sumar}
        />
        <ul className="nomina-lista" aria-label="Nómina">
          <li className="nomina-fila">
            <span className="nomina-avatar nomina-avatar-capitan" aria-hidden="true">
              C
            </span>
            <span className="nomina-datos">
              <strong>{user?.name || user?.username} (Capitán)</strong>
              <small>@{user?.username}</small>
            </span>
          </li>
          {jugadores.map((j, i) => (
            <li key={j.id} className="nomina-fila">
              <span className="nomina-avatar" aria-hidden="true">
                {i + 2}
              </span>
              <span className="nomina-datos">
                <strong>
                  {j.nombres} {j.apellidos}
                </strong>
                <small>@{j.username}</small>
              </span>
              <button
                type="button"
                className="nomina-sacar"
                onClick={() => sacar(j.id)}
                aria-label={`Sacar a ${j.nombres} ${j.apellidos}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <p className="inscripcion-contador">
          {cantidad(total)} (mínimo {minimo}, máximo {maximo})
        </p>
      </section>

      <Card className="reglamento">
        <label className="reglamento-casilla">
          <input
            type="checkbox"
            checked={reglamentoAceptado}
            onChange={(e) => setReglamentoAceptado(e.target.checked)}
          />
          <strong>Acepto el Reglamento y Código de Conducta</strong>
        </label>
        <p className="inscripcion-ayuda">
          He leído las bases del {torneo.nombre} y acepto las penalidades por W.O. y conducta
          antideportiva.
        </p>
        {torneo.reglamentoUrl && (
          <a href={torneo.reglamentoUrl} target="_blank" rel="noopener noreferrer">
            Ver reglamento oficial en PDF
          </a>
        )}
      </Card>

      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      <div className="inscripcion-acciones">
        <Button block disabled={!puedeContinuar} loading={ocupado} onClick={continuar}>
          {gratis
            ? 'Confirmar inscripción'
            : `Continuar al pago (${pesos(torneo.valorInscripcion)})`}
        </Button>
        <Button block variant="secondary" disabled={!equipoListo || ocupado}>
          Guardar como borrador y salir
        </Button>
      </div>
    </div>
  );
};
