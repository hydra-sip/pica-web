import {
  IconoBackoffice,
  IconoEscudoCheck,
  IconoExplorar,
  IconoIngresar,
  IconoPanel,
  IconoPerfil,
  IconoPersonas,
  IconoPronosticos,
  IconoRifas,
  IconoRoles,
  IconoTorneos,
  IconoUsuarios,
} from '../ui/Iconos';

export type Seccion = 'sitio' | 'admin';

export interface ItemNavegacion {
  ruta: string;
  texto: string;
  icono: React.ReactNode;
  // Sin permisos: lo ve cualquiera; con permisos: alcanza con tener uno
  permisos?: string[];
  soloConSesion?: boolean;
  soloSinSesion?: boolean;
  // La ruta activa tiene que ser exactamente esta (para '/' y '/admin')
  exacta?: boolean;
}

export const PERMISOS_BACKOFFICE = ['USUARIO_VER', 'ROL_VER', 'PERSONA_VER'];

/**
 * Ítems de cada sección, en orden. Una pantalla nueva (Rifas, Mis torneos...) suma acá su línea.
 * En el celular la barra inferior muestra hasta 4; en escritorio la sidebar muestra todos.
 */
export const NAVEGACION: Record<Seccion, ItemNavegacion[]> = {
  sitio: [
    { ruta: '/', texto: 'Explorar', icono: <IconoExplorar />, exacta: true },
    // HU-306 / T306-2: Pronósticos y ranking de torneos
    { ruta: '/pronosticos', texto: 'Pronósticos', icono: <IconoPronosticos /> },
    // HU-505 / T505-1: Portal público de verificación de sorteos
    { ruta: '/verificacion', texto: 'Verificación', icono: <IconoEscudoCheck /> },
    // PICA-202: TORNEO_GESTIONAR lo tienen ORGANIZADOR y ADMINISTRADOR
    { ruta: '/mis-torneos', texto: 'Mis torneos', icono: <IconoTorneos />, permisos: ['TORNEO_GESTIONAR'] },
    // PICA-227: RIFA_GESTIONAR lo tienen ORGANIZADOR y ADMINISTRADOR
    { ruta: '/mis-rifas', texto: 'Mis rifas', icono: <IconoRifas />, permisos: ['RIFA_GESTIONAR'] },
    { ruta: '/mi-perfil', texto: 'Perfil', icono: <IconoPerfil />, soloConSesion: true },
    { ruta: '/admin', texto: 'Backoffice', icono: <IconoBackoffice />, permisos: PERMISOS_BACKOFFICE },
    { ruta: '/auth/login', texto: 'Ingresar', icono: <IconoIngresar />, soloSinSesion: true },
  ],
  admin: [
    { ruta: '/admin', texto: 'Panel', icono: <IconoPanel />, exacta: true },
    { ruta: '/admin/usuarios', texto: 'Usuarios', icono: <IconoUsuarios />, permisos: ['USUARIO_VER'] },
    { ruta: '/admin/roles', texto: 'Roles', icono: <IconoRoles />, permisos: ['ROL_VER'] },
    { ruta: '/admin/personas', texto: 'Personas', icono: <IconoPersonas />, permisos: ['PERSONA_VER'] },
  ],
};
