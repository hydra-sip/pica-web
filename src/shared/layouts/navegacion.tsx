import {
  IconoAlerta,
  IconoBackoffice,
  IconoBilletera,
  IconoConfiguracion,
  IconoDocumento,
  IconoEscudo,
  IconoEscudoCheck,
  IconoExplorar,
  IconoIngresar,
  IconoPanel,
  IconoPerfil,
  IconoPersonas,
  IconoPronosticos,
  IconoRifas,
  IconoRoles,
  IconoTicket,
  IconoTorneos,
  IconoTrofeo,
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
  // Solo a quien tiene designaciones de árbitro (HU-807): no hay un permiso propio del árbitro
  soloConDesignaciones?: boolean;
  // La ruta activa tiene que ser exactamente esta (para '/' y '/admin')
  exacta?: boolean;
}

export const PERMISOS_BACKOFFICE = [
  'USUARIO_VER',
  'ROL_VER',
  'PERSONA_VER',
  'PARAMETRO_ADMINISTRAR',
  'CANCELACION_REVISAR',
  'RECLAMO_RESOLVER',
  // HU-704: el libro de auditoría
  'AUDITORIA_VER',
];

/**
 * Ítems de cada sección, en orden. Una pantalla nueva (Rifas, Mis torneos...) suma acá su línea.
 * En el celular la barra inferior muestra hasta 5; en escritorio la sidebar muestra todos.
 */
export const NAVEGACION: Record<Seccion, ItemNavegacion[]> = {
  sitio: [
    { ruta: '/', texto: 'Explorar', icono: <IconoExplorar />, exacta: true },
    // HU-306 / T306-2: Pronósticos y ranking de torneos
    { ruta: '/pronosticos', texto: 'Pronósticos', icono: <IconoPronosticos /> },
    // PICA-221: las rifas en venta, para cualquiera
    { ruta: '/rifas', texto: 'Rifas', icono: <IconoRifas />, exacta: true },
    // HU-602 / T602-3: Mi billetera con saldos, movimientos y cargas
    { ruta: '/billetera', texto: 'Billetera', icono: <IconoBilletera />, soloConSesion: true },
    // HU-404: los tickets que compró el usuario
    { ruta: '/mis-tickets', texto: 'Mis tickets', icono: <IconoTicket />, soloConSesion: true },
    // HU-505 / T505-1: Portal público de verificación de sorteos
    { ruta: '/verificacion', texto: 'Verificación', icono: <IconoEscudoCheck /> },
    // HU-209: las inscripciones propias y las de las nóminas donde figuro. Va después de los cinco que entran
    // en la barra de abajo del celular, para no desplazar ninguno; ahí se llega desde Perfil
    {
      ruta: '/mis-inscripciones',
      texto: 'Mis inscripciones',
      icono: <IconoTrofeo />,
      soloConSesion: true,
    },
    // PICA-202: TORNEO_GESTIONAR lo tienen ORGANIZADOR y ADMINISTRADOR
    {
      ruta: '/mis-torneos',
      texto: 'Mis torneos',
      icono: <IconoTorneos />,
      permisos: ['TORNEO_GESTIONAR'],
    },
    // HU-807: las designaciones del árbitro, con cuántas esperan respuesta
    {
      ruta: '/mis-designaciones',
      texto: 'Designaciones',
      icono: <IconoEscudo />,
      soloConDesignaciones: true,
    },
    // PICA-227: RIFA_GESTIONAR lo tienen ORGANIZADOR y ADMINISTRADOR
    { ruta: '/mis-rifas', texto: 'Mis rifas', icono: <IconoRifas />, permisos: ['RIFA_GESTIONAR'] },
    { ruta: '/mi-perfil', texto: 'Perfil', icono: <IconoPerfil />, soloConSesion: true },
    {
      ruta: '/admin',
      texto: 'Backoffice',
      icono: <IconoBackoffice />,
      permisos: PERMISOS_BACKOFFICE,
    },
    { ruta: '/auth/login', texto: 'Ingresar', icono: <IconoIngresar />, soloSinSesion: true },
  ],
  admin: [
    { ruta: '/admin', texto: 'Panel', icono: <IconoPanel />, exacta: true },
    {
      ruta: '/admin/usuarios',
      texto: 'Usuarios',
      icono: <IconoUsuarios />,
      permisos: ['USUARIO_VER'],
    },
    { ruta: '/admin/roles', texto: 'Roles', icono: <IconoRoles />, permisos: ['ROL_VER'] },
    {
      ruta: '/admin/personas',
      texto: 'Personas',
      icono: <IconoPersonas />,
      permisos: ['PERSONA_VER'],
    },
    {
      ruta: '/admin/cancelaciones',
      texto: 'Cancelaciones',
      icono: <IconoDocumento />,
      permisos: ['CANCELACION_REVISAR'],
    },
    {
      ruta: '/admin/parametros',
      texto: 'Parámetros',
      icono: <IconoConfiguracion />,
      permisos: ['PARAMETRO_ADMINISTRAR'],
    },
    {
      ruta: '/admin/reclamos',
      texto: 'Reclamos',
      icono: <IconoAlerta />,
      permisos: ['RECLAMO_RESOLVER'],
    },
    {
      ruta: '/admin/auditoria',
      texto: 'Auditoría',
      icono: <IconoEscudoCheck />,
      permisos: ['AUDITORIA_VER'],
    },
  ],
};
