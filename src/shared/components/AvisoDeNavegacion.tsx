import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Lo que se pasa al navegar para que la página de destino lo muestre arriba, una sola vez. */
export interface EstadoConAviso {
  aviso: string;
}

/**
 * Muestra el `aviso` que trae la navegación (`navigate(ruta, { state: { aviso } })`), por ejemplo "guardaste el
 * borrador" al volver a la ficha. Lo saca del historial en cuanto lo lee, así no vuelve a salir al recargar, y
 * deja de mostrarlo al ir a otra página.
 */
export const AvisoDeNavegacion: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [aviso, setAviso] = useState<{ texto: string; pathname: string } | null>(null);

  const texto = (location.state as Partial<EstadoConAviso> | null)?.aviso;
  useEffect(() => {
    if (!texto) return;
    setAviso({ texto, pathname: location.pathname });
    navigate(location.pathname + location.search + location.hash, { replace: true, state: null });
  }, [texto, location.pathname, location.search, location.hash, navigate]);

  if (!aviso || aviso.pathname !== location.pathname) return null;
  return (
    <div className="alerta alerta-exito aviso-navegacion" role="status">
      {aviso.texto}
    </div>
  );
};
