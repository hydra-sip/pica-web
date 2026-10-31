import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RifaDetalle, rifaApi } from '../../api/rifaApi';
import { RecaudadoRifa } from '../../rifas/components/RecaudadoRifa';
import '../../rifas/rifas.css';

interface RifaDelTorneoProps {
  torneoId: number;
}

/**
 * HU-406: en la consola, la rifa que recauda para el torneo con sus vendidos sobre el total y el pozo desglosado.
 * Sin rifa, o sin acceso a las rifas, no se muestra.
 */
export const RifaDelTorneo: React.FC<RifaDelTorneoProps> = ({ torneoId }) => {
  const [rifa, setRifa] = useState<RifaDetalle | null>(null);

  useEffect(() => {
    let vigente = true;
    rifaApi
      .listarMias({ size: 100 })
      .then((p) => {
        const delTorneo = p.content.find((r) => r.torneoId === torneoId);
        return delTorneo ? rifaApi.obtener(delTorneo.id) : null;
      })
      .then((detalle) => vigente && setRifa(detalle))
      .catch(() => vigente && setRifa(null));
    return () => {
      vigente = false;
    };
  }, [torneoId]);

  if (!rifa) return null;

  return (
    <RecaudadoRifa
      titulo={`Rifa: ${rifa.titulo}`}
      reparto={rifa.reparto}
      torneoNombre={rifa.torneoNombre}
      pctDestinadoTorneo={rifa.pctDestinadoTorneo}
      vendidos={`${rifa.numerosVendidos} de ${rifa.numeroHasta - rifa.numeroDesde + 1}`}
      accion={<Link to={`/rifas/${rifa.id}/editar`}>Ver rifa</Link>}
    />
  );
};
