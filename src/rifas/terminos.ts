/**
 * Términos y condiciones que acepta el organizador al publicar una rifa (PICA-219 / T402-4).
 *
 * TEXTO PROVISORIO: falta la versión definitiva del equipo. Por ahora va fijo en el front y el back
 * guarda solo la fecha en que se aceptó (terminosAceptadosEn), sin versión.
 */
export const TERMINOS_RIFA: { titulo: string; texto: string }[] = [
  {
    titulo: '1. Objeto',
    texto:
      'El organizador publica en PICA una rifa con fines de recaudación. Los participantes compran números dentro del rango y en las fechas de venta indicadas.',
  },
  {
    titulo: '2. Autorización',
    texto:
      'El organizador declara que cuenta con la autorización de la Lotería provincial que corresponda para realizar la rifa, y se hace responsable de mantenerla vigente durante toda la venta y hasta la entrega de los premios.',
  },
  {
    titulo: '3. Pozo y premios',
    texto:
      'El pozo de la rifa es lo recaudado por la venta de números. Se reparte entre los premios según los porcentajes publicados, que suman el 100%. Los gastos de servicio los paga el comprador aparte y no se descuentan del pozo.',
  },
  {
    titulo: '4. Sorteo',
    texto:
      'El sorteo se realiza de forma automática en la fecha publicada, con un procedimiento verificable. Una vez publicada, la rifa no se puede modificar.',
  },
  {
    titulo: '5. Reclamos',
    texto:
      'Publicado el resultado, los participantes tienen 48 horas para presentar un reclamo. Mientras haya reclamos pendientes no se liquidan los premios.',
  },
];
