import React from 'react';
import { validatePasswordRequirements } from '../../shared/validators';
import { IconoCheck } from '../../shared/ui/Iconos';
import '../auth.css';

interface PasswordRequirementsProps {
  password: string;
}

/** Los requisitos de la contraseña, que se van tildando mientras se escribe (registro y Mi perfil). */
export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const result = validatePasswordRequirements(password);

  const requirements = [
    { label: '8 caracteres o más', met: result.hasMinLength },
    { label: 'Una letra mayúscula', met: result.hasUppercase },
    { label: 'Un número', met: result.hasNumber },
  ];

  return (
    <div className="requisitos-clave">
      <span className="requisitos-clave-titulo">Requisitos de la contraseña:</span>
      <ul>
        {requirements.map((req) => (
          <li key={req.label} className={req.met ? 'cumplido' : undefined}>
            <span className="requisitos-clave-marca" aria-hidden="true">
              {req.met ? <IconoCheck size={10} /> : '•'}
            </span>
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
