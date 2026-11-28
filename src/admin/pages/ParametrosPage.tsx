import React, { useEffect, useState } from 'react';
import {
  ClaveParametro,
  parametroApi,
  ParametroDetalle,
  UnidadParametro,
} from '../../api/parametroApi';
import { fechaHora } from '../../shared/formato';
import { mensajeDeError, mensajesDelBackPorCampo } from '../../shared/mensajesError';
import { Button, Card, Field, Input } from '../../shared/ui';
import { IconoAlerta } from '../../shared/ui/Iconos';
import './ParametrosPage.css';

/** Cómo se agrupan y se llaman en la pantalla; el orden de cada grupo sigue al del back. */
const GRUPOS: { titulo: string; ayuda: string; claves: ClaveParametro[] }[] = [
  {
    titulo: 'Gastos administrativos',
    ayuda:
      'Lo que paga aparte quien se inscribe en un torneo o compra un número de rifa. Un torneo o una rifa publicados conservan el % con el que se publicaron.',
    claves: ['GASTOS_ADMINISTRATIVOS', 'GASTOS_ADMINISTRATIVOS_TOPE'],
  },
  {
    titulo: 'Plazos',
    ayuda: 'Se validan cuando el organizador guarda las fechas o configura el check-in.',
    claves: ['MARGEN_CIERRE_INICIO_MIN', 'CHECKIN_DURACION_MAX_MIN'],
  },
  {
    titulo: 'Retiros',
    ayuda: 'Los topes de cada retiro de la billetera a una cuenta propia.',
    claves: ['RETIRO_MINIMO', 'RETIRO_MAXIMO'],
  },
  {
    titulo: 'Fair play',
    ayuda:
      'El índice de cada jugador (HU-802). Un cambio rige desde que se guarda: lo que ya pasó no se recalcula.',
    claves: [
      'FAIR_PLAY_INICIAL',
      'FAIR_PLAY_MAXIMO',
      'FAIR_PLAY_CHECKIN',
      'FAIR_PLAY_AUSENCIA',
      'FAIR_PLAY_SANCION_LEVE',
      'FAIR_PLAY_SANCION_MEDIA',
      'FAIR_PLAY_SANCION_GRAVE',
    ],
  },
  {
    titulo: 'Detección de fraude',
    ayuda:
      'Umbrales y ventanas temporales de las reglas automáticas que generan alertas para soporte (HU-705).',
    claves: [
      'FRAUDE_RIFA_NUMEROS_MAX',
      'FRAUDE_RIFA_VENTANA_MIN',
      'FRAUDE_CARRUSEL_OPERACIONES_MIN',
      'FRAUDE_CARRUSEL_VENTANA_MIN',
      'FRAUDE_CANCELACIONES_MIN',
      'FRAUDE_OBJECIONES_MIN',
      'FRAUDE_CUENTAS_USUARIOS_MIN',
    ],
  },
];

const ETIQUETA: Record<ClaveParametro, string> = {
  GASTOS_ADMINISTRATIVOS: 'Gastos administrativos vigentes',
  GASTOS_ADMINISTRATIVOS_TOPE: 'Tope de los gastos administrativos',
  MARGEN_CIERRE_INICIO_MIN: 'Margen entre el cierre de la inscripción y el inicio',
  CHECKIN_DURACION_MAX_MIN: 'Duración máxima de la ventana de check-in',
  RETIRO_MINIMO: 'Retiro mínimo',
  RETIRO_MAXIMO: 'Retiro máximo',
  FAIR_PLAY_INICIAL: 'Índice inicial',
  FAIR_PLAY_MAXIMO: 'Índice máximo',
  FAIR_PLAY_CHECKIN: 'Suma por check-in cumplido',
  FAIR_PLAY_AUSENCIA: 'Resta por ausencia sin aviso',
  FAIR_PLAY_SANCION_LEVE: 'Resta por sanción leve',
  FAIR_PLAY_SANCION_MEDIA: 'Resta por sanción media',
  FAIR_PLAY_SANCION_GRAVE: 'Resta por sanción grave',
  FRAUDE_RIFA_NUMEROS_MAX: 'Máximo de números comprados en rifa sin alertar',
  FRAUDE_RIFA_VENTANA_MIN: 'Ventana para compra masiva en rifa',
  FRAUDE_CARRUSEL_OPERACIONES_MIN: 'Mínimo de operaciones para alertar carrusel carga/retiro',
  FRAUDE_CARRUSEL_VENTANA_MIN: 'Ventana para carrusel carga/retiro',
  FRAUDE_CANCELACIONES_MIN: 'Mínimo de torneos cancelados para alertar',
  FRAUDE_OBJECIONES_MIN: 'Mínimo de objeciones para alertar',
  FRAUDE_CUENTAS_USUARIOS_MIN: 'Mínimo de usuarios con cuenta compartida para alertar',
};

const UNIDAD: Record<UnidadParametro, { sufijo: string; paso: string }> = {
  PORCENTAJE: { sufijo: '%', paso: '0.01' },
  MINUTOS: { sufijo: 'min', paso: '1' },
  PESOS: { sufijo: '$', paso: '0.01' },
  PUNTOS: { sufijo: 'puntos', paso: '1' },
  CANTIDAD: { sufijo: 'cantidad', paso: '1' },
};

/**
 * Los parámetros de la plataforma (HU-702, PICA-282): el admin los cambia sin tocar el código y rigen desde que se
 * guardan. Se mandan solo los que cambiaron; si alguno no valida, el back no guarda ninguno y el error va en su campo.
 * No hay wireframe de esta pantalla: sigue el diseño de Roles y Personas.
 */
export const ParametrosPage: React.FC = () => {
  const [parametros, setParametros] = useState<ParametroDetalle[]>([]);
  const [valores, setValores] = useState<Partial<Record<ClaveParametro, string>>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const mostrar = (lista: ParametroDetalle[]) => {
    setParametros(lista);
    setValores(Object.fromEntries(lista.map((p) => [p.clave, String(p.valor)])));
  };

  useEffect(() => {
    let vigente = true;
    parametroApi
      .listar()
      .then((lista) => vigente && mostrar(lista))
      .catch(
        (err) =>
          vigente &&
          setMensaje({
            tipo: 'error',
            texto: mensajeDeError(err, 'No se pudieron cargar los parámetros.'),
          })
      )
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, []);

  const porClave = new Map(parametros.map((p) => [p.clave, p]));
  const cambiados = parametros.filter(
    (p) => valores[p.clave] !== undefined && Number(valores[p.clave]) !== p.valor
  );
  const vacios = parametros.filter((p) => (valores[p.clave] ?? '').trim() === '');

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    if (vacios.length) {
      setErrores(Object.fromEntries(vacios.map((p) => [p.clave, 'Completá el valor.'])));
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      const guardados = await parametroApi.actualizar(
        Object.fromEntries(cambiados.map((p) => [p.clave, Number(valores[p.clave])]))
      );
      mostrar(guardados);
      setMensaje({ tipo: 'exito', texto: 'Parámetros guardados. Rigen desde ahora.' });
    } catch (err) {
      // Cada regla tiene su texto ("No puede superar el tope"), así que va el mensaje del back.
      const deCampo = mensajesDelBackPorCampo(err);
      setErrores(deCampo);
      setMensaje({
        tipo: 'error',
        texto:
          Object.keys(deCampo).length > 0
            ? 'No se guardó ningún cambio: revisá los campos marcados.'
            : mensajeDeError(err, 'No se pudieron guardar los parámetros.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  const descartar = () => {
    mostrar(parametros);
    setErrores({});
    setMensaje(null);
  };

  return (
    <div className="parametros-page">
      <div>
        <h1>Parámetros</h1>
        <p className="parametros-subtitulo">
          Las reglas de la plataforma que se ajustan sin tocar el código. Cada cambio queda en la
          auditoría.
        </p>
      </div>

      {mensaje && (
        <div
          role={mensaje.tipo === 'error' ? 'alert' : 'status'}
          className={`parametros-mensaje parametros-mensaje-${mensaje.tipo}`}
        >
          {mensaje.tipo === 'error' && <IconoAlerta size={18} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {cargando ? (
        <p className="parametros-subtitulo">Cargando los parámetros...</p>
      ) : (
        parametros.length > 0 && (
          <form onSubmit={(e) => void guardar(e)} noValidate className="parametros-form">
            {GRUPOS.map((grupo) => (
              <Card as="section" key={grupo.titulo} className="parametros-grupo">
                <h2>{grupo.titulo}</h2>
                <p className="parametros-subtitulo">{grupo.ayuda}</p>
                <div className="parametros-grilla">
                  {grupo.claves.map((clave) => {
                    const p = porClave.get(clave);
                    if (!p) return null;
                    const unidad = UNIDAD[p.unidad];
                    return (
                      <Field
                        key={clave}
                        label={`${ETIQUETA[clave]} (${unidad.sufijo})`}
                        required
                        error={errores[clave]}
                        hint={
                          <>
                            {p.descripcion}.{' '}
                            {p.modificadoPor === 'SISTEMA'
                              ? 'Valor inicial.'
                              : `Último cambio: ${fechaHora(p.modificadoEn)}, por ${p.modificadoPor}.`}
                          </>
                        }
                      >
                        <Input
                          type="number"
                          inputMode="decimal"
                          step={unidad.paso}
                          min={0}
                          value={valores[clave] ?? ''}
                          onChange={(e) => setValores({ ...valores, [clave]: e.target.value })}
                          disabled={guardando}
                        />
                      </Field>
                    );
                  })}
                </div>
              </Card>
            ))}
            <div className="parametros-acciones">
              <Button
                type="button"
                variant="secondary"
                onClick={descartar}
                disabled={guardando || cambiados.length === 0}
              >
                Descartar
              </Button>
              <Button type="submit" disabled={guardando || cambiados.length === 0}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        )
      )}
    </div>
  );
};
