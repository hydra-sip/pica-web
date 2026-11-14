import React, { useEffect, useState } from 'react';
import { mensajeDeError } from '../../shared/mensajesError';
import { Button, Input } from '../../shared/ui';

/** Mínimo de letras antes de buscar, como el buscador de jugadores. */
const MINIMO_LETRAS = 3;
/** Espera después de la última tecla antes de pedir. */
const ESPERA_MS = 300;

export interface OpcionFiltro {
  id: number;
  texto: string;
}

interface BuscadorFiltroProps {
  label: string;
  placeholder: string;
  buscar: (q: string) => Promise<OpcionFiltro[]>;
  elegido: OpcionFiltro | null;
  onElegir: (opcion: OpcionFiltro | null) => void;
}

/** Un filtro que se elige buscando: se escribe, se elige un resultado y queda hasta que se quita. */
export const BuscadorFiltro: React.FC<BuscadorFiltroProps> = ({
  label,
  placeholder,
  buscar,
  elegido,
  onElegir,
}) => {
  const [texto, setTexto] = useState('');
  const [encontrados, setEncontrados] = useState<OpcionFiltro[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = texto.trim();

  useEffect(() => {
    setError(null);
    if (q.length < MINIMO_LETRAS) {
      setEncontrados(null);
      return;
    }
    let vigente = true;
    const espera = setTimeout(() => {
      buscar(q)
        .then((opciones) => vigente && setEncontrados(opciones))
        .catch((err) => vigente && setError(mensajeDeError(err, 'No se pudo buscar.')));
    }, ESPERA_MS);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [q, buscar]);

  const elegir = (opcion: OpcionFiltro | null) => {
    onElegir(opcion);
    setTexto('');
    setEncontrados(null);
  };

  return (
    <div className="buscador-filtro">
      <span className="buscador-filtro-label">{label}</span>
      {elegido ? (
        <div className="buscador-filtro-elegido">
          <span>{elegido.texto}</span>
          <Button size="sm" variant="ghost" aria-label={`Quitar ${label.toLowerCase()}`} onClick={() => elegir(null)}>
            Quitar
          </Button>
        </div>
      ) : (
        <Input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
        />
      )}
      {error && (
        <p className="buscador-filtro-ayuda" role="alert">
          {error}
        </p>
      )}
      {encontrados?.length === 0 && <p className="buscador-filtro-ayuda">Sin resultados.</p>}
      {encontrados && encontrados.length > 0 && (
        <ul className="buscador-filtro-resultados" aria-label={`Resultados de ${label.toLowerCase()}`}>
          {encontrados.map((opcion) => (
            <li key={opcion.id}>
              <button type="button" onClick={() => elegir(opcion)}>
                {opcion.texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
