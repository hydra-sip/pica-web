import React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../shared/ui';
import { ObjecionesTorneo } from '../components/ObjecionesTorneo';
import '../partidos.css';

/**
 * Las objeciones del torneo para el árbitro (HU-303, PICA-247), que no entra a la consola: llega desde el partido
 * que le avisaron por mail. El organizador las ve también en la consola.
 */
export const ObjecionesTorneoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="partido-page">
      <header>
        <div className="partido-titulo">
          <h1>Objeciones del torneo</h1>
        </div>
        <p className="partido-ayuda">
          Primero las pendientes. En cada partido se comparan las dos versiones con su evidencia.
        </p>
      </header>
      <Card>
        <ObjecionesTorneo torneoId={Number(id)} />
      </Card>
    </div>
  );
};
