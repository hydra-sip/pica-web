import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  // Texto para lectores de pantalla; la tabla no muestra caption visible
  caption?: string;
}

/** Tabla con su caja: si no entra a lo ancho, scrollea la caja y no la página (RNF-USA-01). */
export const Table: React.FC<TableProps> = ({ caption, className, children, ...rest }) => (
  <div className="table-wrap">
    <table className={['table', className].filter(Boolean).join(' ')} {...rest}>
      {caption && <caption style={{ position: 'absolute', left: '-9999px' }}>{caption}</caption>}
      {children}
    </table>
  </div>
);
