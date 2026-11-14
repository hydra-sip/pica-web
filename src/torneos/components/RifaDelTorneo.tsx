import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RifaDetalle, rifaApi } from '../../api/rifaApi';
import { RecaudadoRifa } from '../../rifas/components/RecaudadoRifa';
import '../../rifas/rifas.css';

interface RifaDelTorneoProps {
  torneoId: number;
}

/**
 * HU-406: en la consola, las rifas que recaudan para el torneo (CR-06: puede tener varias), cada una con sus vendidos
 * sobre el total y el pozo desglosado. Sin rifas, o sin acceso a las rifas, no se muestra.
 */
export const RifaDelTorneo: React.FC<RifaDelTorneoProps> = ({ torneoId }) => {
  const [rifas, setRifas] = useState<RifaDetalle[]>([]);

  useEffect(() => {
    let vigente = true;
    rifaApi
      .listarMias({ size: 100 })
      .then((p) =>
        Promise.all(
          p.content.filter((r) => r.torneoId === torneoId).map((r) => rifaApi.obtener(r.id))
        )
      )
      .then((detalles) => vigente && setRifas(detalles))
      .catch(() => vigente && setRifas([]));
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  return (
    <>
      {rifas.map((rifa) => (
        <RecaudadoRifa
          key={rifa.id}
          titulo={`Rifa: ${rifa.titulo}`}
          reparto={rifa.reparto}
          torneoNombre={rifa.torneoNombre}
          pctDestinadoTorneo={rifa.pctDestinadoTorneo}
          vendidos={`${rifa.numerosVendidos} de ${rifa.numeroHasta - rifa.numeroDesde + 1}`}
          accion={<Link to={`/rifas/${rifa.id}/editar`}>Ver rifa</Link>}
        />
      ))}
    </>
  );
};
