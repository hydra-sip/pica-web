import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Cada página nueva arranca desde arriba (CE4-4): el router no lo hace solo y, sin esto, al entrar a una
 * página desde un botón de abajo de otra se quedaba con el scroll de la anterior.
 */
export const ScrollAlInicio: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};
