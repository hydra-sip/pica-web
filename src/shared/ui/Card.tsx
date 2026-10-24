import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
}

export const Card: React.FC<CardProps> = ({ as: Tag = 'div', className, ...rest }) => (
  <Tag className={['card', className].filter(Boolean).join(' ')} {...rest} />
);
