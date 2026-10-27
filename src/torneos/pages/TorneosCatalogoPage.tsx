import React from 'react';
import { TorneosCatalogo } from '../components/TorneosCatalogo';

export const TorneosCatalogoPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', width: '100%' }}>
      <TorneosCatalogo pageSize={9} />
    </div>
  );
};
