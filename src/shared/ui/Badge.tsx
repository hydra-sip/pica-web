import React from 'react';

// neutral, solido y borde son los del UI kit; los de color son para estados que el Figma no distingue
export type BadgeTone = 'neutral' | 'solido' | 'borde' | 'exito' | 'aviso' | 'peligro' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className, ...rest }) => (
  <span className={['badge', tone !== 'neutral' && `badge-${tone}`, className].filter(Boolean).join(' ')} {...rest} />
);
