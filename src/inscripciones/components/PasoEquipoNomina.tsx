import React, { useState } from 'react';
import {
  InscripcionDetalle,
  InscripcionEquipoPayload,
  inscripcionApi,
} from '../../api/inscripcionApi';
import { useNavigate } from 'react-router-dom';
import { UsuarioPublico } from '../../api/jugadorApi';
import { TorneoDetalle } from '../../torneos/types/torneo';
import { useAuth } from '../../auth/hooks/useAuth';
import { pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { EstadoConAviso } from '../../shared/components/AvisoDeNavegacion';
import {
  MENSAJES_PASO_1,
  MENSAJES_REPARTO,
  mensajeJugadorYaInscripto,
} from '../mensajesInscripcion';
import { leerReparto, mismoReparto, partesIguales, textosDe } from '../reparto';
import { Button, Card } from '../../shared/ui';
import { useEquiposDelTorneo } from '../hooks/useEquiposDelTorneo';
import { BuscadorJugadores } from './BuscadorJugadores';
import { CampoPct, TotalDelReparto } from './CamposDelReparto';
import { EQUIPO_NUEVO, SelectorEquipo } from './SelectorEquipo';
import { VolverAlTorneo } from './VolverAlTorneo';
import '../inscripciones.css';

export interface PasoEquipoNominaProps {
  torneo: TorneoDetalle;
  /**
   * El borrador que se retoma. Sin él es el alta: todavía no se llamó a la API y el borrador se crea
   * al guardar. Tiene que estar en BORRADOR; quien lo renderiza se ocupa de redirigir las demás.
   */
  inscripcion?: InscripcionDetalle | null;
}

const cantidad = (n: number) => `${n} ${n === 1 ? 'jugador' : 'jugadores'}`;

/** Falló el PUT del reparto, que va después de guardar la nómina: el borrador ya quedó guardado. */
class ErrorDelReparto {
  constructor(readonly causa: unknown) {}
}

/** El mensaje de un error al guardar: el del reparto tiene sus propios textos. */
const mensajeAlGuardar = (err: unknown, capitanId: number, porDefecto: string) =>
  err instanceof ErrorDelReparto
    ? mensajeDeError(err.causa, 'No se pudo guardar el reparto.', MENSAJES_REPARTO)
    : (mensajeJugadorYaInscripto(err, capitanId) ??
      mensajeDeError(err, porDefecto, MENSAJES_PASO_1));

/**
 * Paso 1 de la inscripción (HU-204): equipo, nómina y reglamento. Sirve para el alta y para retomar
 * un borrador, y guarda y navega solo (al paso 2, o a la ficha del torneo al guardar el borrador).
 *
 * En la de equipo, cada integrante tiene su % del premio (CR-05): arranca en partes iguales, vuelve a partes
 * iguales cuando cambia la nómina (como en el back) y, si el capitán lo cambió, se manda con `PUT /reparto`
 * después de guardar la nómina. Sin sumar 100 no se puede guardar.
 */
export const PasoEquipoNomina: React.FC<PasoEquipoNominaProps> = ({ torneo, inscripcion }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // El torneo individual se reduce al reglamento: no hay equipo ni nómina.
  const individual = torneo.tipoParticipante === 'INDIVIDUAL';
  const minimo = torneo.tamanioEquipo ?? 1;
  // Con suplentes (CE4-4). Sin él no se limita acá: igual lo valida el back al confirmar (NOMINA_INVALIDA).
  // un back sin CE4-4 no manda el campo: undefined cuenta como sin máximo
  const maximo = torneo.nominaMaxima ?? null;

  const {
    equipos,
    error: errorEquipos,
    agregar,
  } = useEquiposDelTorneo(torneo.id, inscripcion?.id, !individual);
  const [equipoElegido, setEquipoElegido] = useState(
    inscripcion?.equipo ? String(inscripcion.equipo.id) : ''
  );
  const [nombreNuevo, setNombreNuevo] = useState('');

  const capitanId = Number(user?.id);
  // El capitán va aparte (fijo y primero): acá quedan los demás jugadores.
  const [jugadores, setJugadores] = useState<UsuarioPublico[]>(
    () => inscripcion?.nomina?.filter((j) => j.id !== capitanId) ?? []
  );
  const idsNomina = [capitanId, ...jugadores.map((j) => j.id)];
  // Lo que dicen los campos de %: el reparto del borrador que se retoma o partes iguales.
  const [textosPct, setTextosPct] = useState<Record<number, string>>(() =>
    textosDe(inscripcion?.reparto ?? partesIguales(idsNomina, capitanId))
  );
  const reparto = leerReparto(idsNomina, textosPct);
  const cambiarNomina = (nuevos: UsuarioPublico[]) => {
    setJugadores(nuevos);
    setTextosPct(textosDe(partesIguales([capitanId, ...nuevos.map((j) => j.id)], capitanId)));
  };
  const total = jugadores.length + 1;
  const lleno = maximo !== null && total >= maximo;
  const sumar = (j: UsuarioPublico) => {
    if (maximo !== null && jugadores.length + 1 >= maximo) return;
    cambiarNomina([...jugadores, j]);
  };
  const sacar = (id: number) => cambiarNomina(jugadores.filter((j) => j.id !== id));
  const campoPct = (id: number, nombre: string) => (
    <CampoPct
      nombre={nombre}
      valor={textosPct[id] ?? ''}
      onValor={(valor) => setTextosPct((prev) => ({ ...prev, [id]: valor }))}
    />
  );

  const [reglamentoAceptado, setReglamentoAceptado] = useState(false);

  const gratis = torneo.valorInscripcion === 0;
  const creaNuevo = equipos?.length === 0 || equipoElegido === EQUIPO_NUEVO;
  const equipoListo = individual || (creaNuevo ? nombreNuevo.trim() !== '' : equipoElegido !== '');
  // un borrador viejo puede tener de más: se sacan jugadores hasta entrar en el máximo
  const nominaValida = individual || (total >= minimo && (maximo === null || total <= maximo));
  const repartoValido = individual || reparto.valido;
  const puedeContinuar = reglamentoAceptado && equipoListo && nominaValida && repartoValido;

  // El borrador que ya existe en la API: el que se retoma o el que este paso guardó.
  const [borrador, setBorrador] = useState<InscripcionDetalle | null>(inscripcion ?? null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Crea el borrador o edita el que ya hay con el equipo y la nómina de la pantalla (la individual, solo lo crea). */
  const guardar = async (): Promise<InscripcionDetalle> => {
    // La individual no lleva cuerpo: si ya hay borrador no hay nada que guardar.
    if (individual) {
      const guardada = borrador ?? (await inscripcionApi.crear(torneo.id));
      setBorrador(guardada);
      return guardada;
    }
    const payload: InscripcionEquipoPayload = {
      ...(creaNuevo
        ? { nombreEquipoNuevo: nombreNuevo.trim() }
        : { equipoId: Number(equipoElegido) }),
      nomina: jugadores.map((j) => j.id),
    };
    let guardada = borrador
      ? await inscripcionApi.editar(borrador.id, payload)
      : await inscripcionApi.crear(torneo.id, payload);
    setBorrador(guardada);
    // Si se creó un equipo por nombre, desde acá se lo elige como a cualquier otro: reintentar no crea otro.
    if (creaNuevo && guardada.equipo) {
      agregar(guardada.equipo);
      setEquipoElegido(String(guardada.equipo.id));
      setNombreNuevo('');
    }
    // Guardar la nómina deja el reparto en partes iguales: si el capitán lo cambió, va aparte.
    if (!mismoReparto(guardada.reparto, reparto.reparto)) {
      try {
        guardada = await inscripcionApi.repartir(guardada.id, reparto.reparto);
      } catch (err) {
        throw new ErrorDelReparto(err);
      }
      setBorrador(guardada);
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
      const mensaje = mensajeAlGuardar(err, capitanId, 'No se pudo guardar la inscripción.');
      const quedoGuardado = guardada || err instanceof ErrorDelReparto;
      setError(quedoGuardado ? `${mensaje} Tu borrador quedó guardado.` : mensaje);
    } finally {
      setOcupado(false);
    }
  };

  const guardarYSalir = async () => {
    setOcupado(true);
    setError(null);
    try {
      await guardar();
      const estado: EstadoConAviso = {
        aviso: 'Guardaste el borrador de tu inscripción: la retomás cuando vuelvas a inscribirte en este torneo.',
      };
      navigate(`/torneos/${torneo.slug}`, { state: estado });
    } catch (err) {
      setError(mensajeAlGuardar(err, capitanId, 'No se pudo guardar el borrador.'));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="inscripcion-page">
      <VolverAlTorneo slug={torneo.slug} />
      <header className="inscripcion-encabezado">
        <h1>{individual ? 'Inscripción individual' : 'Inscripción de Equipo'}</h1>
        {!gratis && <span className="inscripcion-paso">Paso 1/2</span>}
      </header>

      <Card className="inscripcion-torneo">
        <strong>{torneo.nombre}</strong>
        {!individual && (
          <span>
            {maximo !== null
              ? `Nómina de ${minimo} a ${maximo} jugadores`
              : `Nómina de al menos ${minimo} jugadores`}
          </span>
        )}
      </Card>

      {!individual && (
        <>
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
              onSumar={sumar}
              bloqueo={lleno ? `Llegaste al máximo de ${maximo} jugadores.` : null}
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
                {campoPct(capitanId, user?.name || user?.username || 'el capitán')}
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
                  {campoPct(j.id, `${j.nombres} ${j.apellidos}`)}
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
              {maximo !== null
                ? `${total} de ${maximo} (mínimo ${minimo})`
                : `${cantidad(total)} (mínimo ${minimo})`}
            </p>
            <TotalDelReparto escrito={reparto} />
          </section>
        </>
      )}

      <Card className="reglamento">
        {/* PICA-450: se lee antes de aceptarlo; sin texto (solo el PDF) no va el recuadro */}
        {torneo.reglamentoTexto && (
          <div
            className="reglamento-texto"
            role="region"
            aria-label="Reglamento del torneo"
            tabIndex={0}
          >
            {torneo.reglamentoTexto}
          </div>
        )}
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
            : `Continuar al pago (${pesos(torneo.totalAPagar)})`}
        </Button>
        <Button
          block
          variant="secondary"
          disabled={!equipoListo || !repartoValido || ocupado}
          onClick={guardarYSalir}
        >
          Guardar como borrador y salir
        </Button>
      </div>
    </div>
  );
};
