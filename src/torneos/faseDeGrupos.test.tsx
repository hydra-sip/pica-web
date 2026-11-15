import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasoCupos } from './components/PasoCupos';
import { aPayload, desdeTorneo, FormTorneo, resumenGrupos, validarBorrador } from './validacion';

const limites = { cupoTope: 64, margenCierreInicioMin: 60 };

const conGrupos = (cambios: Partial<FormTorneo> = {}): FormTorneo => ({
  ...desdeTorneo(null),
  nombre: 'Copa con grupos',
  disciplina: 'Fútbol 5',
  formato: 'GRUPOS_Y_ELIMINACION',
  cupoMaximo: '16',
  cupoMinimo: '12',
  ...cambios,
});

describe('reglas de la fase de grupos en el asistente (CR-02-7)', () => {
  it('arranca con las reglas de Fede y con 16 no hay errores', () => {
    const form = conGrupos();

    expect([
      form.tamanioGrupo,
      form.clasificanPorGrupo,
      form.puntosVictoria,
      form.puntosEmpate,
    ]).toEqual(['4', '2', '3', '1']);
    expect(validarBorrador(form, limites)).toEqual({});
    expect(resumenGrupos(form)).toEqual({ grupos: 4, aLaLlave: 8, necesarios: 12 });
  });

  it('el cupo tiene que ser múltiplo del grupo', () => {
    expect(
      validarBorrador(conGrupos({ cupoMaximo: '10', cupoMinimo: '' }), limites).cupoMaximo
    ).toMatch(/múltiplo de 4/);
  });

  it('los que pasan a la llave tienen que ser potencia de 2', () => {
    // 3 grupos de 4 y pasan 2: 6
    expect(
      validarBorrador(conGrupos({ cupoMaximo: '12', cupoMinimo: '' }), limites).clasificanPorGrupo
    ).toMatch(/pasan 6 a la llave/);
  });

  it('el mínimo deja en cada grupo uno más que los que pasan', () => {
    expect(validarBorrador(conGrupos({ cupoMinimo: '11' }), limites).cupoMinimo).toMatch(
      /al menos 12/
    );
  });

  it('empatar da menos que ganar', () => {
    expect(validarBorrador(conGrupos({ puntosEmpate: '3' }), limites).puntosEmpate).toBeDefined();
    expect(validarBorrador(conGrupos({ tamanioGrupo: '9' }), limites).tamanioGrupo).toBeDefined();
  });

  it('manda las reglas solo con grupos', () => {
    expect(aPayload(conGrupos()).reglasGrupos).toEqual({
      tamanioGrupo: 4,
      clasificanPorGrupo: 2,
      puntosVictoria: 3,
      puntosEmpate: 1,
    });
    expect(aPayload({ ...conGrupos(), formato: 'ELIMINACION_DIRECTA' }).reglasGrupos).toBeNull();
  });

  it('el paso 2 muestra las reglas y cómo queda el torneo solo con grupos', () => {
    const { rerender } = render(
      <PasoCupos
        form={conGrupos()}
        onCambio={() => undefined}
        errores={{}}
        habilitado
        cupoTope={64}
      />
    );

    expect(screen.getByText('Fase de grupos')).toBeInTheDocument();
    expect(screen.getByText(/4 grupos y 8 pasan a la llave/)).toBeInTheDocument();

    rerender(
      <PasoCupos
        form={{ ...conGrupos(), formato: 'ELIMINACION_DIRECTA' }}
        onCambio={() => undefined}
        errores={{}}
        habilitado
        cupoTope={64}
      />
    );
    expect(screen.queryByText('Fase de grupos')).not.toBeInTheDocument();
  });

  it('publicado, las reglas quedan bloqueadas', () => {
    render(
      <PasoCupos
        form={conGrupos()}
        onCambio={() => undefined}
        errores={{}}
        habilitado
        cupoTope={64}
        bloqueados={['formato', 'reglasGrupos']}
      />
    );

    expect(screen.getByLabelText(/Integrantes por grupo/)).toBeDisabled();
  });
});
