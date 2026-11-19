import React, { useState } from 'react';
import { InscripcionDetalle, inscripcionApi } from '../../api/inscripcionApi';
import { UsuarioPublico } from '../../api/jugadorApi';
import { codigoDeError, mensajeDeError } from '../../shared/mensajesError';
import { Button } from '../../shared/ui';
import { MENSAJES_REPARTO } from '../mensajesInscripcion';
import { leerReparto, mismoReparto, textoPct, textosDe } from '../reparto';
import { CampoPct, TotalDelReparto } from './CamposDelReparto';

interface RepartoDelPremioProps {
  inscripcion: InscripcionDetalle;
  capitanId: number;
  /** El capitán, con la inscripción del torneo abierta: el cupo no importa. */
  puedeEditar: boolean;
  /** La inscripción con el reparto que devolvió el back. */
  onGuardado: (inscripcion: InscripcionDetalle) => void;
  /** El back avisó que la inscripción del torneo cerró mientras tanto. */
  onCerrada: () => void;
  /** El back avisó que la inscripción ya no se puede modificar: hay que volver a cargarla. */
  onNoEditable: (mensaje: string) => void;
}

const nombre = (j: UsuarioPublico) => `${j.nombres} ${j.apellidos}`;

/**
 * El reparto del premio del equipo (CR-05): el % de cada integrante, que ven el capitán, la nómina y el
 * organizador. El capitán lo cambia mientras el torneo tenga la inscripción abierta, aunque ya haya pagado.
 * Una inscripción sin reparto (de un torneo que cerró la inscripción antes del cambio) la cobra el capitán.
 */
export const RepartoDelPremio: React.FC<RepartoDelPremioProps> = ({
  inscripcion,
  capitanId,
  puedeEditar,
  onGuardado,
  onCerrada,
  onNoEditable,
}) => {
  const [textos, setTextos] = useState<Record<number, string> | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'aviso'; texto: string } | null>(null);

  const guardado = inscripcion.reparto;
  if (!guardado) {
    return (
      <section aria-labelledby="reparto-titulo" className="inscripcion-bloque">
        <h2 id="reparto-titulo" className="inscripcion-etiqueta">
          Reparto del premio
        </h2>
        <p className="inscripcion-ayuda">El premio de este equipo lo cobra entero el capitán.</p>
      </section>
    );
  }

  const nomina = [...(inscripcion.nomina ?? [])].sort(
    (a, b) => Number(b.id === capitanId) - Number(a.id === capitanId)
  );
  const pctDe = new Map(guardado.map((r) => [r.usuarioId, r.pct]));
  const editando = puedeEditar && textos !== null;
  const escrito =
    textos &&
    leerReparto(
      nomina.map((j) => j.id),
      textos
    );

  const editar = () => {
    setTextos(textosDe(guardado));
    setError(null);
    setAviso(null);
  };

  const cerrar = () => {
    setTextos(null);
    setError(null);
  };

  const guardar = async () => {
    if (!escrito?.valido) return;
    if (mismoReparto(guardado, escrito.reparto)) {
      cerrar();
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      onGuardado(await inscripcionApi.repartir(inscripcion.id, escrito.reparto));
      setAviso({ tono: 'exito', texto: 'Guardaste el reparto del premio.' });
      cerrar();
    } catch (err) {
      const mensaje = mensajeDeError(err, 'No se pudo guardar el reparto.', MENSAJES_REPARTO);
      const codigo = codigoDeError(err);
      if (codigo === 'INSCRIPCION_NO_ABIERTA') {
        cerrar();
        setAviso({ tono: 'aviso', texto: mensaje });
        onCerrada();
      } else if (codigo === 'INSCRIPCION_NO_EDITABLE') {
        cerrar();
        onNoEditable(mensaje);
      } else {
        setError(mensaje);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section aria-labelledby="reparto-titulo" className="inscripcion-bloque">
      <h2 id="reparto-titulo" className="inscripcion-etiqueta">
        Reparto del premio
      </h2>
      {aviso && (
        <div className={`alerta alerta-${aviso.tono}`} role="status">
          {aviso.texto}
        </div>
      )}
      <ul className="nomina-lista" aria-label="Reparto del premio">
        {nomina.map((j) => (
          <li key={j.id} className="nomina-fila">
            <span className="nomina-datos">
              <strong>
                {nombre(j)}
                {j.id === capitanId && ' (Capitán)'}
              </strong>
              <small>@{j.username}</small>
            </span>
            {editando ? (
              <CampoPct
                nombre={nombre(j)}
                valor={textos[j.id] ?? ''}
                onValor={(valor) => setTextos((prev) => ({ ...prev, [j.id]: valor }))}
                disabled={enviando}
              />
            ) : (
              <span className="reparto-pct">{textoPct(pctDe.get(j.id) ?? 0)} %</span>
            )}
          </li>
        ))}
      </ul>
      {editando && escrito ? (
        <>
          <TotalDelReparto escrito={escrito} />
          {error && (
            <div className="alerta alerta-peligro" role="alert">
              {error}
            </div>
          )}
          <div className="inscripcion-acciones">
            <Button onClick={guardar} disabled={!escrito.valido} loading={enviando}>
              Guardar el reparto
            </Button>
            <Button variant="secondary" onClick={cerrar} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        puedeEditar && (
          <Button size="sm" variant="secondary" onClick={editar}>
            Cambiar el reparto
          </Button>
        )
      )}
    </section>
  );
};
