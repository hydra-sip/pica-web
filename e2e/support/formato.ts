/** Un monto como lo muestra la app ($ 1.100,00), como expresión regular: el espacio puede ser uno sin corte. */
export const pesos = (monto: number) => {
  const [entero, decimales] = monto.toFixed(2).split('.');
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return new RegExp(`\\$\\s${conMiles.replace(/\./g, '\\.')},${decimales}`);
};
