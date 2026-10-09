// Diccionarios de traducción para internacionalización (Inglés y Español)

export type Language = 'en' | 'es';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.brand': 'EXPERIENCIA',
    'nav.catalog': 'Catalog',
    'nav.createExperience': 'Publish Event',
    'nav.matching': 'Matching',
    'nav.demandInsights': 'Demand Insights',
    'nav.liveHost': 'Live Dashboard',
    'nav.myTickets': 'My Tickets',
    'nav.profile': 'Profile',
    'nav.login': 'Log In',
    'nav.register': 'Sign Up',
    'nav.logout': 'Log Out',

    // Theme & Lang
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'lang.english': 'English',
    'lang.spanish': 'Spanish',

    // Common
    'common.search': 'Search...',
    'common.filter': 'Filter',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.price': 'Price',
    'common.quorum': 'Quorum',
    'common.status': 'Status',

    // Modules
    'module.auth.title': 'Authentication & Security',
    'module.experience.title': 'Experience Catalog',
    'module.booking.title': 'Bookings & Digital Tickets',
    'module.matching.title': 'Smart Matching & Quorum',
    'module.live.title': 'Live Computer Vision & Smart Host',
  },
  es: {
    // Navegación
    'nav.brand': 'EXPERIENCIA',
    'nav.catalog': 'Catálogo',
    'nav.createExperience': 'Publicar Evento',
    'nav.matching': 'Matching',
    'nav.demandInsights': 'Prospección Demanda',
    'nav.liveHost': 'Panel en Vivo',
    'nav.myTickets': 'Mis Entradas',
    'nav.profile': 'Mi Perfil',
    'nav.login': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    'nav.logout': 'Cerrar Sesión',

    // Tema e Idioma
    'theme.light': 'Claro',
    'theme.dark': 'Oscuro',
    'lang.english': 'Inglés',
    'lang.spanish': 'Español',

    // Comunes
    'common.search': 'Buscar...',
    'common.filter': 'Filtrar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'common.price': 'Precio',
    'common.quorum': 'Quórum',
    'common.status': 'Estado',

    // Módulos
    'module.auth.title': 'Autenticación y Seguridad',
    'module.experience.title': 'Catálogo de Experiencias',
    'module.booking.title': 'Reservas y Entradas Digitales',
    'module.matching.title': 'Matching Inteligente y Quórum',
    'module.live.title': 'Visión Artificial en Vivo y Smart Host',
  },
};
