import React, { useEffect, useState } from 'react';
import { custodiaApi, FormatoLiquidacion, PanelFinanciero } from '../../api/custodiaApi';
import { fechaHora, pesos } from '../../shared/formato';
import { mensajeDeError } from '../../shared/mensajesError';
import { Badge, Button, Card } from '../../shared/ui';
import { IconoDescargar } from '../../shared/ui/Iconos';
import './pagoConSaldo.css';
import './panelFinanciero.css';

interface PanelFinancieroDelTorneoProps {
  torneoId: number;
}

/**
 * HU-608 (T608-3), wireframe «Dashboard Contable y Liquidación»: los indicadores del torneo en vivo, con la cuenta de
 * la liquidación, y la descarga de la liquidación final en CSV o PDF, que recién se habilita cuando el torneo se
 * liquidó. Lo que se le reintegra al organizador son sus gastos: el pozo va entero a los premios.
 */
export const PanelFinancieroDelTorneo: React.FC<PanelFinancieroDelTorneoProps> = ({ torneoId }) => {
  const [panel, setPanel] = useState<PanelFinanciero | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bajando, setBajando] = useState<FormatoLiquidacion | null>(null);

  useEffect(() => {
    let vigente = true;
    custodiaApi
      .panelFinanciero(torneoId)
      .then((p) => vigente && setPanel(p))
      .catch(
        (err) => vigente && setError(mensajeDeError(err, 'No se pudo cargar el panel financiero.'))
      );
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  const descargar = async (formato: FormatoLiquidacion) => {
    setBajando(formato);
    setError(null);
    try {
      const url = URL.createObjectURL(await custodiaApi.liquidacionFinal(torneoId, formato));
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `liquidacion-torneo-${torneoId}.${formato}`;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo descargar la liquidación.'));
    } finally {
      setBajando(null);
    }
  };

  if (!panel) {
    return error ? (
      <div className="alerta alerta-peligro" role="alert">
        {error}
      </div>
    ) : (
      <p>Cargando...</p>
    );
  }

  return (
    <Card as="section" className="panel-financiero" aria-label="Panel financiero">
      <div className="panel-financiero-encabezado">
        <div>
          <h2>Panel financiero</h2>
          <p className="resumen-pago-detalle">
            {panel.liquidado ? (
              <>
                <Badge tone="exito">Liquidado</Badge>
                {panel.liquidadoEn && ` • ${fechaHora(panel.liquidadoEn)}`}
              </>
            ) : (
              <>
                <Badge tone="aviso">Estimado en vivo</Badge> • Con lo que hay en custodia hasta
                ahora
              </>
            )}
          </p>
        </div>
        <div className="panel-financiero-descargas">
          {(['csv', 'pdf'] as const).map((formato) => (
            <Button
              key={formato}
              size="sm"
              variant={formato === 'pdf' ? 'primary' : 'secondary'}
              disabled={!panel.liquidado || bajando !== null}
              loading={bajando === formato}
              onClick={() => void descargar(formato)}
            >
              <IconoDescargar size={16} /> Liquidación final ({formato.toUpperCase()})
            </Button>
          ))}
        </div>
      </div>

      {!panel.liquidado && (
        <p className="panel-financiero-aviso" role="note">
          La liquidación final se emite cuando el torneo termina y se liquida: ahí se habilita la
          descarga.
        </p>
      )}
      {error && (
        <div className="alerta alerta-peligro" role="alert">
          {error}
        </div>
      )}

      <div className="reparto-tarjetas">
        <div className="reparto-tarjeta">
          <span>Total recaudado</span>
          <strong>{pesos(panel.recaudado)}</strong>
          <small>
            {panel.pagos === 1 ? '1 inscripción paga' : `${panel.pagos} inscripciones pagas`}
          </small>
        </div>
        <div className="reparto-tarjeta">
          <span>Reintegro de gastos al organizador</span>
          <strong>{pesos(panel.reintegroOrganizador)}</strong>
          <small>
            {panel.reintegroOrganizador < panel.gastos
              ? `Gastos ${pesos(panel.gastos)}: se reintegra hasta lo recaudado`
              : 'Los gastos del torneo'}
          </small>
        </div>
        <div className="reparto-tarjeta">
          <span>Gastos administrativos</span>
          <strong>{pesos(panel.gastosAdministrativos)}</strong>
          <small>Los paga cada inscripto aparte; van a la plataforma</small>
        </div>
        <div className="reparto-tarjeta panel-financiero-destacada">
          <span>{panel.liquidado ? 'Premios acreditados' : 'Comprometido en premios'}</span>
          <strong>{pesos(panel.comprometidoEnPremios)}</strong>
          <small>
            {panel.pozoAlOrganizador > 0
              ? `Nadie quedó en un puesto con premio: el pozo (${pesos(panel.pozoAlOrganizador)}) fue al organizador`
              : panel.aporteRifa > 0
                ? `Incluye ${pesos(panel.aporteRifa)} que aporta la rifa`
                : panel.liquidado
                  ? 'Acreditado a los ganadores'
                  : 'Lo recaudado menos el reintegro de gastos'}
          </small>
        </div>
      </div>
    </Card>
  );
};
