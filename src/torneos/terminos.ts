/**
 * Términos de custodia de fondos que acepta el organizador al publicar un torneo (PICA-449), con la misma forma que
 * TERMINOS_RIFA. Describen las reglas que ya aplica la plataforma.
 *
 * TEXTO PROVISORIO: falta la versión definitiva del equipo. Por ahora va fijo en el front y el back recibe solo
 * `aceptaTerminos` al publicar, sin versión.
 */
export const TERMINOS_TORNEO: { titulo: string; texto: string }[] = [
  {
    titulo: '1. Objeto',
    texto:
      'El organizador publica en PICA un torneo y cobra la inscripción a través de la plataforma. Estos términos regulan cómo se guardan y se reparten esos fondos.',
  },
  {
    titulo: '2. Custodia de fondos',
    texto:
      'Todo lo que pagan los inscriptos (el valor de la inscripción y los gastos administrativos) queda en custodia de la plataforma hasta la liquidación o la cancelación del torneo. Mientras tanto nadie puede retirarlo, tampoco el organizador.',
  },
  {
    titulo: '3. Esquema económico y comisión',
    texto:
      'Al publicar se sellan el valor de la inscripción, los porcentajes de los premios por puesto, los gastos previstos y el porcentaje de gastos administrativos vigente, que paga aparte quien se inscribe y queda para la plataforma. Después de publicar el esquema no se puede cambiar.',
  },
  {
    titulo: '4. Gastos y comprobantes',
    texto:
      'Los gastos previstos se descuentan del pozo, hasta lo recaudado. Un gasto común se registra con su comprobante de pago. Un honorario arbitral solo es deducible si el organizador lo deposita en la custodia del torneo: al liquidar se le acredita al árbitro.',
  },
  {
    titulo: '5. Cancelación y reintegros',
    texto:
      'Si el torneo se cancela sin gastos, cada inscripto recupera todo lo que pagó. Si el organizador declara gastos, con sus comprobantes y hasta el tope que fija la plataforma sobre el pozo, la cancelación queda en revisión de soporte: si los aprueba, a cada uno se le descuenta su parte; si los rechaza, cada uno recupera el 100 %. Si la inscripción cierra sin las inscripciones confirmadas que hacen falta para jugar, el torneo se cancela solo con estas mismas reglas.',
  },
  {
    titulo: '6. Liquidación y reparto',
    texto:
      'Cuando el torneo termina, la plataforma liquida la custodia: los gastos administrativos van a la plataforma, el organizador cobra los gastos del torneo, cada árbitro sus honorarios depositados, y el resto del pozo se reparte entre los ganadores con los porcentajes sellados. Si nadie termina en un puesto con premio, ese premio va al organizador.',
  },
  {
    titulo: '7. Reclamos',
    texto:
      'Cada resultado cargado se puede objetar dentro del plazo de objeción, y la objeción la resuelve un árbitro designado. Antes de liquidar, la plataforma controla que lo repartido coincida exactamente con lo que está en custodia.',
  },
];
