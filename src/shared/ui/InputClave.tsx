import React, { useState } from 'react';
import { Input } from './Field';
import { IconoOjo, IconoOjoTachado } from './Iconos';

type InputClaveProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Input de contraseña con el botón para verla, como en el wireframe. Va adentro de un Field. */
export const InputClave = React.forwardRef<HTMLInputElement, InputClaveProps>((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-clave">
      <Input ref={ref} {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="input-clave-ver"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        {visible ? <IconoOjoTachado /> : <IconoOjo />}
      </button>
    </div>
  );
});
InputClave.displayName = 'InputClave';
