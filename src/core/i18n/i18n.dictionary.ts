import type { Language } from '../auth/auth.types';

export type TranslationKey = keyof typeof dictionary;

export const dictionary = {
  // Navigation
  'nav.exercises':        { en: 'Exercises',        es: 'Ejercicios' },
  'nav.plans':            { en: 'Training Plans',   es: 'Planes de Entrenamiento' },
  'nav.clients':          { en: 'Clients',           es: 'Clientes' },
  'nav.workout':          { en: "Today's Workout",  es: 'Entrenamiento de Hoy' },
  'nav.profile':          { en: 'Profile',           es: 'Perfil' },
  'nav.signout':          { en: 'Sign out',          es: 'Cerrar Sesión' },

  // Common actions
  'common.loading':       { en: 'Loading…',          es: 'Cargando…' },
  'common.save':          { en: 'Save Changes',      es: 'Guardar Cambios' },
  'common.saving':        { en: 'Saving…',           es: 'Guardando…' },
  'common.cancel':        { en: 'Cancel',            es: 'Cancelar' },
  'common.delete':        { en: 'Delete',            es: 'Eliminar' },
  'common.edit':          { en: 'Edit',              es: 'Editar' },
  'common.confirm':       { en: 'Confirm',           es: 'Confirmar' },
  'common.copy':          { en: 'Copy ID',           es: 'Copiar ID' },
  'common.copied':        { en: 'Copied!',           es: '¡Copiado!' },
  'common.global':        { en: 'Global',            es: 'Global' },
  'common.active':        { en: 'Active',            es: 'Activo' },
  'common.inactive':      { en: 'Inactive',          es: 'Inactivo' },

  // Exercises
  'exercises.title':         { en: 'Exercises',                                   es: 'Ejercicios' },
  'exercises.new':           { en: '+ New Exercise',                              es: '+ Nuevo Ejercicio' },
  'exercises.library':       { en: 'Your Library',                               es: 'Tu Biblioteca' },
  'exercises.global':        { en: 'Global Defaults',                            es: 'Predeterminados Globales' },
  'exercises.empty':         { en: 'No exercises yet.',                           es: 'Aún no hay ejercicios.' },
  'exercises.empty.hint':    { en: 'Create your first exercise to get started.', es: 'Crea tu primer ejercicio para comenzar.' },

  // Planning
  'planning.title':          { en: 'Training Plans',                                       es: 'Planes de Entrenamiento' },
  'planning.new':            { en: '+ New Plan',                                           es: '+ Nuevo Plan' },
  'planning.empty':          { en: 'No training plans yet.',                               es: 'Aún no hay planes de entrenamiento.' },
  'planning.empty.hint':     { en: 'Create your first plan to assign to clients.',        es: 'Crea tu primer plan para asignar a clientes.' },
  'planning.autorm':         { en: 'Auto 1RM enabled',                                    es: '1RM automático activado' },
  'planning.fixed':          { en: 'Fixed weights',                                       es: 'Pesos fijos' },
  'planning.created':        { en: 'Created',                                             es: 'Creado' },
  'planning.share':          { en: 'Share',                                               es: 'Compartir' },
  'planning.share.hint':     { en: 'Anyone with this ID can connect to this plan.',       es: 'Quien tenga este ID puede conectarse a este plan.' },
  'planning.share.enable':   { en: 'Enable sharing',                                     es: 'Activar compartición' },

  // Clients
  'clients.title':           { en: 'Clients',               es: 'Clientes' },
  'clients.active':          { en: 'active',                es: 'activos' },
  'clients.inactive':        { en: 'Inactive clients',      es: 'Clientes inactivos' },
  'clients.empty':           { en: 'No active clients yet.', es: 'Aún no hay clientes activos.' },
  'clients.col.plan':        { en: 'Plan',                  es: 'Plan' },
  'clients.col.joined':      { en: 'Joined',                es: 'Ingresó' },
  'clients.col.status':      { en: 'Status',                es: 'Estado' },

  // Client detail sheet
  'client.sheet.title':      { en: 'Client Details',               es: 'Detalle del Cliente' },
  'client.sheet.name':       { en: 'Name',                         es: 'Nombre' },
  'client.sheet.email':      { en: 'Email',                        es: 'Correo Electrónico' },
  'client.sheet.role':       { en: 'Role',                         es: 'Rol' },
  'client.sheet.since':      { en: 'Member since',                 es: 'Miembro desde' },
  'client.sheet.plan':       { en: 'Assigned Training Plan',       es: 'Plan de Entrenamiento Asignado' },
  'client.sheet.noplan':     { en: '— No plan —',                  es: '— Sin plan —' },
  'client.sheet.active':     { en: 'Active account',               es: 'Cuenta activa' },
  'client.sheet.active.hint': { en: 'Inactive clients are hidden from the main roster', es: 'Los clientes inactivos se ocultan del panel principal' },

  // Workout dashboard
  'dashboard.day':           { en: 'Day',                    es: 'Día' },
  'dashboard.suggested':     { en: 'Suggested',              es: 'Sugerido' },
  'dashboard.weight':        { en: 'Weight (kg)',            es: 'Peso (kg)' },
  'dashboard.reps':          { en: 'Reps',                   es: 'Reps' },
  'dashboard.round':         { en: 'Round',                  es: 'Serie' },
  'dashboard.complete':      { en: 'Mark complete',          es: 'Marcar completado' },
  'dashboard.completed':     { en: 'Completed',              es: 'Completado' },
  'dashboard.finish':        { en: 'Finish Workout',         es: 'Finalizar Entrenamiento' },
  'dashboard.session.how':   { en: 'How did this session feel?', es: '¿Cómo se sintió esta sesión?' },
  'dashboard.noplan.title':  { en: 'No plan assigned yet',  es: 'Sin plan asignado' },
  'dashboard.noplan.body':   { en: 'Contact your trainer to get a personalised training plan assigned to your account.', es: 'Contacta a tu entrenador para que te asigne un plan de entrenamiento personalizado.' },
  'dashboard.connect.title': { en: 'Have a plan ID?',       es: '¿Tienes un ID de plan?' },
  'dashboard.connect.hint':  { en: 'Paste the ID shared by your trainer to connect directly.', es: 'Pega el ID compartido por tu entrenador para conectarte directamente.' },
  'dashboard.connect.placeholder': { en: 'Paste plan ID…', es: 'Pega el ID del plan…' },
  'dashboard.connect.button': { en: 'Connect',              es: 'Conectar' },
  'dashboard.connect.connecting': { en: 'Connecting…',     es: 'Conectando…' },
  'dashboard.connect.err.format': { en: 'Invalid plan ID format.', es: 'Formato de ID inválido.' },
  'dashboard.connect.err.notfound': { en: 'Plan not found or sharing is disabled.', es: 'Plan no encontrado o sin compartición activa.' },
  'dashboard.session.finish': { en: 'Finish Workout', es: 'Finalizar Entrenamiento' },

  // Profile
  'profile.title':           { en: 'Profile',               es: 'Perfil' },
  'profile.name':            { en: 'Name',                  es: 'Nombre' },
  'profile.email':           { en: 'Email',                 es: 'Correo Electrónico' },
  'profile.role':            { en: 'Role',                  es: 'Rol' },
  'profile.since':           { en: 'Member since',          es: 'Miembro desde' },
  'profile.gym':             { en: 'Gym / Trainer',         es: 'Gimnasio / Entrenador' },
  'profile.language':        { en: 'Language',              es: 'Idioma' },

  // Trainer branding panel
  'branding.title':          { en: 'Gym Branding',          es: 'Imagen del Gimnasio' },
  'branding.unlock':         { en: 'Edit Branding',         es: 'Editar Imagen' },
  'branding.gymname':        { en: 'Gym Name',              es: 'Nombre del Gimnasio' },
  'branding.color':          { en: 'Primary Color',         es: 'Color Principal' },
  'branding.color.hint':     { en: 'Hex value, e.g. #EF4444', es: 'Valor hex, ej. #EF4444' },
  'branding.logo':           { en: 'Logo SVG',              es: 'Logo SVG' },
  'branding.logo.hint':      { en: 'Paste raw SVG markup (max 64 KB)', es: 'Pega el SVG directamente (máx 64 KB)' },
  'branding.color.invalid':  { en: 'Enter a valid hex color (e.g. #EF4444)', es: 'Ingresa un color hex válido (ej. #EF4444)' },
} satisfies Record<string, Record<Language, string>>;

export function translate(key: string, lang: Language): string {
  const entry = dictionary[key as TranslationKey];
  return entry ? entry[lang] : key;
}
