import React, { useEffect, useState } from 'react';
import { jugadorApi, UsuarioPublico } from '../../api/jugadorApi';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Input } from '../../shared/ui';

/** Mínimo de letras que acepta el back, sin contar los espacios de los costados. */
const MINIMO_LETRAS = 3;
/** Espera después de la última tecla antes de pedir. */
const ESPERA_MS = 300;
const RESULTADOS = 10;

interface BuscadorJugadoresProps {
  /** Ids de los jugadores que ya están en la nómina. */
  enNomina: ReadonlySet<number>;
  /** La nómina ya tiene el máximo de jugadores. */
  lleno: boolean;
  onSumar: (jugador: UsuarioPublico) => void;
  disabled?: boolean;
}

/** La consulta como la entiende el back: sin espacios de los costados ni la @ del usuario. */
const consulta = (texto: string) => texto.trim().replace(/^@+/, '').trim();

/** Búsqueda de jugadores por @usuario o nombre (GET /usuarios?q=), con espera y mínimo de letras. */
export const BuscadorJugadores: React.FC<BuscadorJugadoresProps> = ({
  enNomina,
  lleno,
  onSumar,
  disabled,
}) => {
  const [texto, setTexto] = useState('');
  const [encontrados, setEncontrados] = useState<UsuarioPublico[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = consulta(texto);
  const corto = texto.trim() !== '' && q.length < MINIMO_LETRAS;

  useEffect(() => {
    setError(null);
    if (q.length < MINIMO_LETRAS) {
      setEncontrados(null);
      setBuscando(false);
      return;
    }
    let vigente = true;
    setBuscando(true);
    const espera = setTimeout(() => {
      jugadorApi
        .buscar(q, { size: RESULTADOS })
        .then((pagina) => vigente && setEncontrados(pagina.content))
        .catch((err) => {
          if (!vigente) return;
          setEncontrados(null);
          setError(mensajeDeError(err, 'No se pudo buscar jugadores.'));
        })
        .finally(() => vigente && setBuscando(false));
    }, ESPERA_MS);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [q]);

  return (
    <div className="buscador">
      <div className="buscador-campo">
        <Input
          type="search"
          aria-label="Buscar jugador"
          placeholder="Buscar jugador registrado..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
      </div>

      {corto && <p className="inscripcion-ayuda">Escribí al menos 3 letras para buscar.</p>}
      {buscando && (
        <p className="inscripcion-ayuda" role="status">
          Buscando...
        </p>
      )}
      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}
      {!buscando && encontrados?.length === 0 && (
        <p className="inscripcion-ayuda">No encontramos jugadores con esa búsqueda.</p>
      )}

      {encontrados && encontrados.length > 0 && (
        <ul className="nomina-lista">
          {encontrados.map((j) => {
            const nombre = `${j.nombres} ${j.apellidos}`;
            const yaEsta = enNomina.has(j.id);
            return (
              <li key={j.id} className="nomina-fila" aria-label={`${nombre} (@${j.username})`}>
                <span className="nomina-datos">
                  <strong>{nombre}</strong>
                  <small>@{j.username}</small>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onSumar(j)}
                  disabled={disabled || yaEsta || lleno}
                  aria-label={`Sumar a ${nombre}`}
                >
                  {yaEsta ? 'En la nómina' : 'Sumar'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
