import { HeroIconName } from '../icon/icon.component';
import { Language } from '../../../core/i18n/translations';
import { RoleMode } from '../../../core/services/auth.service';

export interface GuideQuickAction {
  label: string;
  query?: string;
  route?: string;
  icon?: HeroIconName;
}

export interface GuideMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
  codeSnippet?: string;
  codeLanguage?: string;
  quickActions?: GuideQuickAction[];
}

export interface GuideTourStep {
  id: string;
  badge: string;
  title: string;
  description: string;
  details: string[];
  tips: string;
  route?: string;
  routeLabel?: string;
  routeIcon?: HeroIconName;
}

export interface GuideTopic {
  icon: HeroIconName;
  label: string;
  query: string;
}

export interface GuideResolution {
  text: string;
  codeSnippet?: string;
  codeLanguage?: string;
  quickActions?: GuideQuickAction[];
  navigateTo?: string;
}

export const GUIDE_TOUR_STEPS: Record<Language, GuideTourStep[]> = {
  es: [
    {
      id: 'catalog',
      badge: 'Paso 1 de 7',
      title: 'Explorar Experiencias y Filtros Inteligentes',
      description:
        'El catálogo reúne experiencias presenciales, virtuales e híbridas organizadas por anfitriones verificados de tu ciudad.',
      details: [
        'Filtra por categoría temática, modalidad (Presencial, Virtual, Híbrido) o disponibilidad de cupos abiertos.',
        'Cada tarjeta muestra en tiempo real la barra de progreso del quórum mínimo necesario para confirmar el evento.',
        'Haz clic en cualquier experiencia para revisar su agenda, ubicación, aforo y opciones de reserva.',
      ],
      tips: 'Consejo: Si buscas algo que todavía no existe en tu ciudad, el sistema detecta esa demanda insatisfecha para que los anfitriones creen nuevos eventos.',
      route: '/catalog',
      routeLabel: 'Ir al Catálogo',
      routeIcon: 'magnifying-glass',
    },
    {
      id: 'booking-quorum',
      badge: 'Paso 2 de 7',
      title: 'Reservas, Quórum Mínimo y Tickets QR',
      description:
        'En EXPERIENCIA los eventos se confirman colectivamente: cuando se alcanza el quórum mínimo viable, el evento queda garantizado.',
      details: [
        'Al reservar tu cupo recibes un ticket digital con código QR único en la sección Mis Entradas y en la App Móvil.',
        'El pago se procesa de forma segura y el estado de tu entrada cambia automáticamente al confirmarse el quórum.',
        'Recibirás notificaciones instantáneas (Web y Push Móvil) al reservar, al confirmarse el quórum o cuando el evento esté por iniciar.',
      ],
      tips: 'Consejo: Guarda tu código QR en la App Móvil de Asistentes para ingresar rápidamente en puerta incluso sin señal.',
      route: '/my-tickets',
      routeLabel: 'Ver Mis Entradas',
      routeIcon: 'ticket',
    },
    {
      id: 'matching',
      badge: 'Paso 3 de 7',
      title: 'Matching Grupal por Afinidad',
      description:
        '¿Quieres asistir con personas afines a tus intereses? El motor de Matching agrupa asistentes antes del evento para romper el hielo.',
      details: [
        'Desde el detalle de una experiencia puedes postular al Quórum Grupal o ingresar a la sala de Matching.',
        'El algoritmo empareja perfiles según intereses configurados en tu perfil y compatibilidad temática.',
        'Cuando tu grupo se completa, todos reciben una alerta push para confirmar su asistencia juntos.',
      ],
      tips: 'Consejo: Mantén actualizados tus intereses en Mi Perfil para mejorar la precisión de tus emparejamientos.',
      route: '/profile',
      routeLabel: 'Configurar Mi Perfil',
      routeIcon: 'user',
    },
    {
      id: 'host-publish',
      badge: 'Paso 4 de 7',
      title: 'Panel de Anfitrión, Locales y Publicación',
      description:
        'Si organizas experiencias, el Panel de Anfitrión centraliza tus eventos, locales físicos y proyecciones de rentabilidad.',
      details: [
        'Registra primero tus establecimientos en Mis Locales para reutilizar direcciones, aforos y coordenadas.',
        'Publica nuevas experiencias en 3 pasos: ficha básica, logística (fecha/lugar) y economía de quórum.',
        'La calculadora de rentabilidad estima automáticamente tus ingresos netos según el escalón de comisión (10%, 8% o 5%).',
      ],
      tips: 'Consejo: Desde tu Panel de Anfitrión puedes editar eventos, abrir la Consola en Vivo o revisar reportes post-evento.',
      route: '/host',
      routeLabel: 'Abrir Panel de Anfitrión',
      routeIcon: 'building-office',
    },
    {
      id: 'live-console',
      badge: 'Paso 5 de 7',
      title: 'Consola en Vivo y Visión Artificial Efímera (GDPR)',
      description:
        'Cuando llega la hora del evento, inicia la sesión desde la Consola en Vivo para monitorear la energía del público en tiempo real.',
      details: [
        'Pulsa "Iniciar Evento" para activar la cámara, el Maestro de Ceremonias IA, el DJ Virtual y notificar a todos los asistentes.',
        'Puedes usar la cámara del navegador o vincular un teléfono móvil escaneando el QR de cámara.',
        'Privacidad GDPR estricta: los fotogramas se procesan en memoria RAM para calcular el pulso de energía (semáforo Verde/Ámbar/Rojo) y se descartan al instante sin guardar fotos ni videos.',
      ],
      tips: 'Consejo: Si la energía cae a Rojo o Ámbar, la consola alerta automáticamente al Maestro de Ceremonias y al DJ para reactivar el ambiente.',
      route: '/host',
      routeLabel: 'Ir a Mis Eventos',
      routeIcon: 'video-camera',
    },
    {
      id: 'mc-ai',
      badge: 'Paso 6 de 7',
      title: 'Maestro de Ceremonias IA con Voz en Vivo',
      description:
        'Tu co-anfitrión inteligente integrado en el panel lateral derecho de la Consola en Vivo, impulsado por Gemini 3.8 Flash (Vertex AI) con respaldo local Qwen 3.8.',
      details: [
        'Al iniciar el evento, puede redactar y locutar automáticamente un discurso de bienvenida con voz neural natural (Edge TTS).',
        'Cada minuto analiza la energía de la sala y propone dinámicas rompehielos autónomas para el público.',
        'Mantiene memoria conversacional por evento: puedes pedirle guiones, juegos o anuncios personalizados por texto o voz.',
      ],
      tips: 'Consejo: Activa el modo de voz automática para que el MC hable por los parlantes mientras la música del DJ baja suavemente (ducking).',
      route: '/host',
      routeLabel: 'Abrir desde Panel Anfitrión',
      routeIcon: 'sparkles',
    },
    {
      id: 'dj-analytics',
      badge: 'Paso 7 de 7',
      title: 'DJ Virtual Autónomo, Demanda y Notificaciones Push',
      description:
        'Completa la experiencia con ambientación musical inteligente, alertas en tiempo real y analítica de oportunidades.',
      details: [
        'El DJ Virtual Autónomo mezcla YouTube en vivo, un motor de Groove BPM configurable y tus archivos MP3/WAV locales.',
        'Cuando el Maestro de Ceremonias habla, el DJ aplica ducking automático bajando el volumen para que la voz se escuche nítida.',
        'Explora Analítica de Demanda para descubrir qué eventos pide la comunidad y revisa el Centro de Avisos para no perderte ninguna alerta.',
      ],
      tips: 'Consejo: Activa las notificaciones del navegador y de la App Móvil para recibir alertas de inicio de evento, reservas y quórum.',
      route: '/demand-insights',
      routeLabel: 'Ver Analítica de Demanda',
      routeIcon: 'chart-bar',
    },
  ],
  en: [
    {
      id: 'catalog',
      badge: 'Step 1 of 7',
      title: 'Explore Experiences & Smart Filters',
      description:
        'The catalog brings together in-person, virtual, and hybrid experiences curated by verified hosts in your city.',
      details: [
        'Filter by topic category, modality (In-Person, Virtual, Hybrid), or open spots availability.',
        'Every card displays a real-time progress bar showing how close the experience is to its minimum quorum.',
        'Click any experience to inspect its agenda, venue, capacity, and booking options.',
      ],
      tips: 'Tip: Searching for experiences that do not exist yet feeds our Unmet Demand Analytics so hosts can create them.',
      route: '/catalog',
      routeLabel: 'Go to Catalog',
      routeIcon: 'magnifying-glass',
    },
    {
      id: 'booking-quorum',
      badge: 'Step 2 of 7',
      title: 'Bookings, Minimum Quorum & QR Tickets',
      description:
        'On EXPERIENCIA, events confirm collectively: once the minimum viable quorum is reached, the experience is guaranteed.',
      details: [
        'Booking a spot generates a digital ticket with a unique QR code in My Bookings and the Attendee Mobile App.',
        'Payments are processed securely and your ticket status automatically confirms as soon as quorum is met.',
        'You receive instant Web and Mobile Push alerts upon booking, quorum confirmation, and event start.',
      ],
      tips: 'Tip: Keep your QR ticket handy in the Attendee Mobile App for fast door check-in even without cell signal.',
      route: '/my-tickets',
      routeLabel: 'View My Bookings',
      routeIcon: 'ticket',
    },
    {
      id: 'matching',
      badge: 'Step 3 of 7',
      title: 'Affinity Group Matching',
      description:
        'Want to attend alongside like-minded people? Our Matching engine groups attendees before the event to break the ice.',
      details: [
        'From any experience detail page, join Group Quorum Matching to find compatible tablemates.',
        'The engine matches profiles using the interests configured in your user profile.',
        'Once your group forms, everyone receives a push alert to confirm together.',
      ],
      tips: 'Tip: Keep your interests up to date in Profile to improve matching accuracy.',
      route: '/profile',
      routeLabel: 'Update My Profile',
      routeIcon: 'user',
    },
    {
      id: 'host-publish',
      badge: 'Step 4 of 7',
      title: 'Host Dashboard, Venues & Publishing',
      description:
        'If you organize events, the Host Dashboard centralizes your experiences, physical venues, and revenue projections.',
      details: [
        'Register your spaces under My Venues to reuse addresses, capacities, and coordinates.',
        'Publish experiences in a 3-step wizard: basic details, logistics (date/location), and quorum pricing.',
        'The built-in profitability calculator estimates your net payout across commission tiers (10%, 8%, or 5%).',
      ],
      tips: 'Tip: From the Host Dashboard you can edit events, launch the Live Console, or view post-event reports.',
      route: '/host',
      routeLabel: 'Open Host Dashboard',
      routeIcon: 'building-office',
    },
    {
      id: 'live-console',
      badge: 'Step 5 of 7',
      title: 'Live Console & Ephemeral Vision AI (GDPR)',
      description:
        'When showtime arrives, launch the Live Console to monitor room energy in real time.',
      details: [
        'Click "Start Event" to unlock the camera, AI Master of Ceremonies, Virtual DJ, and notify registered attendees.',
        'Use your browser webcam or pair a smartphone camera via QR code.',
        'Strict GDPR privacy: frames are analyzed in RAM to compute the energy pulse (Green/Amber/Red traffic light) and immediately discarded—zero photos or videos stored.',
      ],
      tips: 'Tip: If room energy drops to Amber or Red, the console notifies both the AI MC and DJ to re-energize the crowd.',
      route: '/host',
      routeLabel: 'Go to My Events',
      routeIcon: 'video-camera',
    },
    {
      id: 'mc-ai',
      badge: 'Step 6 of 7',
      title: 'Voice-Enabled AI Master of Ceremonies',
      description:
        'Your intelligent co-host docked on the right side of the Live Console, powered by Gemini 3.8 Flash (Vertex AI) with Qwen 3.8 fallback.',
      details: [
        'When the event starts, it can craft and speak an automatic welcome speech using natural neural voice (Edge TTS).',
        'Every minute it reads the live room energy and proposes autonomous icebreaker dynamics.',
        'Per-event conversational memory lets you ask for scripts, games, or announcements anytime.',
      ],
      tips: 'Tip: Enable auto-voice mode so the MC speaks through venue speakers while the DJ smoothly ducks the music.',
      route: '/host',
      routeLabel: 'Open from Host Dashboard',
      routeIcon: 'sparkles',
    },
    {
      id: 'dj-analytics',
      badge: 'Step 7 of 7',
      title: 'Autonomous Virtual DJ, Demand & Push Alerts',
      description:
        'Round out the experience with adaptive music, real-time notifications, and community demand insights.',
      details: [
        'The Autonomous Virtual DJ blends live YouTube playback, a configurable BPM Groove engine, and local MP3/WAV uploads.',
        'Whenever the AI MC speaks, automatic audio ducking lowers the music volume for crystal-clear voice delivery.',
        'Check Demand Insights to spot high-interest topics in your city and visit Notifications for all real-time alerts.',
      ],
      tips: 'Tip: Enable browser and mobile push notifications so you never miss event start, booking, or quorum alerts.',
      route: '/demand-insights',
      routeLabel: 'View Demand Insights',
      routeIcon: 'chart-bar',
    },
  ],
};

export const GUIDE_TOPICS: Record<Language, GuideTopic[]> = {
  es: [
    { icon: 'sparkles', label: 'Tour Guiado', query: 'iniciar tour' },
    { icon: 'map-pin', label: '¿Qué hago aquí?', query: 'que puedo hacer en esta pantalla' },
    { icon: 'magnifying-glass', label: 'Catálogo', query: 'como funciona el catalogo' },
    { icon: 'ticket', label: 'Reservas y QR', query: 'como reservar y tickets qr' },
    { icon: 'users', label: 'Matching', query: 'como funciona el matching grupal' },
    { icon: 'plus', label: 'Publicar Evento', query: 'como publicar una experiencia' },
    { icon: 'video-camera', label: 'Consola en Vivo', query: 'como usar la consola en vivo' },
    { icon: 'bolt', label: 'MC IA y DJ', query: 'como funciona el maestro de ceremonias y dj' },
    { icon: 'bell', label: 'Notificaciones', query: 'que notificaciones envia la plataforma' },
    { icon: 'chart-bar', label: 'Demanda', query: 'analitica de demanda insatisfecha' },
  ],
  en: [
    { icon: 'sparkles', label: 'Guided Tour', query: 'start tour' },
    { icon: 'map-pin', label: 'This Page', query: 'what can i do on this page' },
    { icon: 'magnifying-glass', label: 'Catalog', query: 'how does the catalog work' },
    { icon: 'ticket', label: 'Bookings & QR', query: 'how to book and qr tickets' },
    { icon: 'users', label: 'Matching', query: 'how does group matching work' },
    { icon: 'plus', label: 'Publish Event', query: 'how to publish an experience' },
    { icon: 'video-camera', label: 'Live Console', query: 'how to use the live console' },
    { icon: 'bolt', label: 'AI MC & DJ', query: 'how do the ai mc and virtual dj work' },
    { icon: 'bell', label: 'Notifications', query: 'what notifications are sent' },
    { icon: 'chart-bar', label: 'Demand', query: 'unmet demand analytics' },
  ],
};

export function getWelcomeMessage(lang: Language, role: RoleMode, userName: string): GuideMessage {
  const greeting = userName
    ? lang === 'en'
      ? `Hi **${userName}**!`
      : `¡Hola, **${userName}**!`
    : lang === 'en'
      ? 'Welcome to **EXPERIENCIA**!'
      : '¡Bienvenido a **EXPERIENCIA**!';

  if (lang === 'en') {
    const roleHint =
      role === 'HOST'
        ? 'I see you are in **Host Mode**. I can guide you through publishing experiences, managing venues, and running the **Live Console** with our **AI MC & Virtual DJ**.'
        : role === 'ADMIN'
          ? 'I see you are in **Admin Mode**. I can help you navigate platform oversight, demand insights, and event workflows.'
          : role === 'ATTENDEE'
            ? 'I see you are in **Attendee Mode**. I can help you discover experiences, book spots, use **Group Matching**, and manage your **QR tickets**.'
            : 'I can explain how the platform works, run a step-by-step **Guided Tour**, or navigate directly to any section for you.';

    const actions: GuideQuickAction[] =
      role === 'HOST'
        ? [
            { label: 'Start 7-Step Tour', query: 'start tour', icon: 'sparkles' },
            { label: 'Go to Host Dashboard', route: '/host', icon: 'building-office' },
            { label: 'Publish Experience', route: '/experiences/create', icon: 'plus' },
            { label: 'AI MC & Virtual DJ', query: 'how do the ai mc and virtual dj work', icon: 'bolt' },
          ]
        : [
            { label: 'Start 7-Step Tour', query: 'start tour', icon: 'sparkles' },
            { label: 'Explore Catalog', route: '/catalog', icon: 'magnifying-glass' },
            { label: 'My Bookings & QR', route: '/my-tickets', icon: 'ticket' },
            { label: 'What can I do here?', query: 'what can i do on this page', icon: 'map-pin' },
          ];

    return {
      id: 'welcome-' + Date.now(),
      sender: 'bot',
      text: `${greeting}\n\nI am your **Agentic User Guide**. ${roleHint}\n\nAsk me anything or pick a quick action below:`,
      timestamp: new Date(),
      quickActions: actions,
    };
  }

  const roleHint =
    role === 'HOST'
      ? 'Veo que estás en **Modo Anfitrión**. Puedo guiarte para publicar experiencias, gestionar locales y operar la **Consola en Vivo** con el **Maestro de Ceremonias IA y DJ Virtual**.'
      : role === 'ADMIN'
        ? 'Veo que estás en **Modo Administrador**. Puedo ayudarte a recorrer los paneles de supervisión, analítica de demanda y flujos operativos.'
        : role === 'ATTENDEE'
          ? 'Veo que estás en **Modo Asistente**. Puedo ayudarte a explorar eventos, reservar cupos, usar el **Matching Grupal** y gestionar tus **Tickets QR**.'
          : 'Puedo explicarte cómo funciona cada módulo, guiarte con un **Tour Paso a Paso** o llevarte directamente a la sección que necesites.';

  const actions: GuideQuickAction[] =
    role === 'HOST'
      ? [
          { label: 'Iniciar Tour (7 pasos)', query: 'iniciar tour', icon: 'sparkles' },
          { label: 'Ir al Panel Anfitrión', route: '/host', icon: 'building-office' },
          { label: 'Publicar Experiencia', route: '/experiences/create', icon: 'plus' },
          { label: 'MC IA y DJ Virtual', query: 'como funciona el maestro de ceremonias y dj', icon: 'bolt' },
        ]
      : [
          { label: 'Iniciar Tour (7 pasos)', query: 'iniciar tour', icon: 'sparkles' },
          { label: 'Explorar Catálogo', route: '/catalog', icon: 'magnifying-glass' },
          { label: 'Mis Entradas y QR', route: '/my-tickets', icon: 'ticket' },
          { label: '¿Qué puedo hacer aquí?', query: 'que puedo hacer en esta pantalla', icon: 'map-pin' },
        ];

  return {
    id: 'welcome-' + Date.now(),
    sender: 'bot',
    text: `${greeting}\n\nSoy tu **Manual Agéntico Interactivo**. ${roleHint}\n\nEscríbeme tu consulta o elige un acceso rápido:`,
    timestamp: new Date(),
    quickActions: actions,
  };
}

function getContextHelp(lang: Language, currentUrl: string): GuideResolution {
  const path = currentUrl.split('?')[0].split('#')[0];
  const isEn = lang === 'en';

  if (path.startsWith('/live')) {
    return {
      text: isEn
        ? '### You are in the **Live Monitoring Console**\n\nHere you orchestrate the live experience in real time:\n- **Start / Finish Event**: Unlocks the live session and sends push notifications to registered attendees.\n- **Ephemeral Vision Camera**: Analyzes room energy in RAM (Green/Amber/Red) without storing any photos or video.\n- **Right Panel (AI MC)**: Chat with your AI Master of Ceremonies, trigger welcome speeches, and hear autonomous 1-minute suggestions with neural voice.\n- **Autonomous Virtual DJ**: Play curated YouTube sets, BPM Groove, or local MP3/WAV tracks with automatic voice ducking.'
        : '### Estás en la **Consola de Monitoreo en Vivo**\n\nDesde aquí diriges tu experiencia en tiempo real:\n- **Iniciar / Finalizar Evento**: Activa la sesión en vivo y envía notificaciones push a todos los asistentes inscritos.\n- **Cámara Efímera (GDPR)**: Analiza la energía de la sala en memoria RAM (semáforo Verde/Ámbar/Rojo) sin guardar fotos ni videos.\n- **Panel Derecho (Maestro de Ceremonias IA)**: Conversa con el MC, genera discursos de bienvenida y escucha sugerencias autónomas cada 1 minuto con voz neural.\n- **DJ Virtual Autónomo**: Combina YouTube, motor Groove BPM o pistas MP3/WAV locales con bajada automática de volumen (ducking) cuando habla el MC.',
      quickActions: isEn
        ? [
            { label: 'AI MC & Voice details', query: 'how does the ai mc work', icon: 'sparkles' },
            { label: 'Virtual DJ details', query: 'how does the virtual dj work', icon: 'bolt' },
            { label: 'Camera & GDPR privacy', query: 'camera privacy gdpr', icon: 'shield-check' },
          ]
        : [
            { label: 'Detalles del MC IA', query: 'como funciona el maestro de ceremonias', icon: 'sparkles' },
            { label: 'Detalles del DJ Virtual', query: 'como funciona el dj virtual', icon: 'bolt' },
            { label: 'Privacidad GDPR cámara', query: 'privacidad gdpr camara', icon: 'shield-check' },
          ],
    };
  }

  if (path.startsWith('/catalog') || path.startsWith('/experiences/')) {
    return {
      text: isEn
        ? '### You are in the **Experiences Catalog**\n\n- Use the search bar, category chips, and modality filters to find plans.\n- Check the **Quorum Bar** on each card to see how many spots remain to confirm the event.\n- Open an experience to reserve your spot or join **Group Matching**.'
        : '### Estás en el **Catálogo de Experiencias**\n\n- Usa el buscador, las categorías y los filtros de modalidad (Presencial, Virtual, Híbrido) para encontrar tu próximo plan.\n- Revisa la **barra de quórum** en cada tarjeta para ver cuántos cupos faltan para confirmar el evento.\n- Abre cualquier experiencia para reservar tu cupo o postular al **Matching Grupal**.',
      quickActions: isEn
        ? [
            { label: 'How Quorum works', query: 'how does quorum work', icon: 'check-circle' },
            { label: 'My Bookings', route: '/my-tickets', icon: 'ticket' },
          ]
        : [
            { label: '¿Cómo funciona el Quórum?', query: 'como funciona el quorum', icon: 'check-circle' },
            { label: 'Ir a Mis Entradas', route: '/my-tickets', icon: 'ticket' },
          ],
    };
  }

  if (path.startsWith('/host')) {
    return {
      text: isEn
        ? '### You are in the **Host Workspace**\n\n- Manage your published experiences, check quorum progress, and launch the **Live Console**.\n- Register physical spaces in **My Venues** so you can reuse them when publishing.\n- View post-event analytics and energy reports after finishing a session.'
        : '### Estás en el **Espacio de Anfitrión**\n\n- Administra tus experiencias publicadas, revisa el avance de quórum y abre la **Consola en Vivo**.\n- Registra tus locales físicos en **Mis Locales** para reutilizarlos en nuevas publicaciones.\n- Consulta el reporte de energía y asistencia al finalizar cada evento.',
      quickActions: isEn
        ? [
            { label: 'Publish New Experience', route: '/experiences/create', icon: 'plus' },
            { label: 'Manage Venues', route: '/host/venues', icon: 'map-pin' },
            { label: 'Demand Insights', route: '/demand-insights', icon: 'chart-bar' },
          ]
        : [
            { label: 'Publicar Experiencia', route: '/experiences/create', icon: 'plus' },
            { label: 'Gestionar Locales', route: '/host/venues', icon: 'map-pin' },
            { label: 'Ver Analítica de Demanda', route: '/demand-insights', icon: 'chart-bar' },
          ],
    };
  }

  if (path.startsWith('/my-tickets')) {
    return {
      text: isEn
        ? '### You are in **My Bookings & Tickets**\n\n- Review all your reserved experiences, payment status, and quorum confirmation.\n- Display your **QR Code** at the venue entrance for quick check-in.\n- If you have the **Mobile App**, your tickets sync automatically for offline access.'
        : '### Estás en **Mis Entradas y Reservas**\n\n- Consulta todas tus experiencias reservadas, estado de pago y confirmación de quórum.\n- Presenta tu **Código QR** en puerta para un ingreso ágil.\n- Con la **App Móvil**, tus tickets se sincronizan para acceso rápido y alertas push.',
      quickActions: isEn
        ? [
            { label: 'Explore more events', route: '/catalog', icon: 'magnifying-glass' },
            { label: 'Mobile App info', route: '/attendee-app', icon: 'device-phone-mobile' },
          ]
        : [
            { label: 'Explorar más eventos', route: '/catalog', icon: 'magnifying-glass' },
            { label: 'Ver App Móvil', route: '/attendee-app', icon: 'device-phone-mobile' },
          ],
    };
  }

  if (path.startsWith('/demand-insights')) {
    return {
      text: isEn
        ? '### You are in **Unmet Demand Insights**\n\n- Discover what categories, neighborhoods, and price ranges users are searching for without enough supply.\n- Use these insights as a Host to design high-conversion experiences that reach quorum faster.'
        : '### Estás en **Analítica de Demanda Insatisfecha**\n\n- Descubre qué categorías, zonas y rangos de precio están buscando los usuarios sin encontrar oferta suficiente.\n- Como Anfitrión, usa estos datos para diseñar experiencias con alta probabilidad de llenar el quórum rápidamente.',
      quickActions: isEn
        ? [{ label: 'Publish Experience', route: '/experiences/create', icon: 'plus' }]
        : [{ label: 'Publicar Experiencia', route: '/experiences/create', icon: 'plus' }],
    };
  }

  return {
    text: isEn
      ? `### Current view: \`${path || '/'}\`\n\nFrom here you can jump directly to any module of **EXPERIENCIA** or start the **7-Step Guided Tour** to learn the entire platform.`
      : `### Vista actual: \`${path || '/'}\`\n\nDesde aquí puedes navegar directamente a cualquier módulo de **EXPERIENCIA** o iniciar el **Tour Guiado de 7 pasos** para conocer todo el flujo.`,
    quickActions: isEn
      ? [
          { label: 'Start Guided Tour', query: 'start tour', icon: 'sparkles' },
          { label: 'Explore Catalog', route: '/catalog', icon: 'magnifying-glass' },
          { label: 'Notifications', route: '/notifications', icon: 'bell' },
        ]
      : [
          { label: 'Iniciar Tour Guiado', query: 'iniciar tour', icon: 'sparkles' },
          { label: 'Explorar Catálogo', route: '/catalog', icon: 'magnifying-glass' },
          { label: 'Centro de Avisos', route: '/notifications', icon: 'bell' },
        ],
  };
}

export function resolveGuideQuery(
  rawInput: string,
  lang: Language,
  role: RoleMode,
  currentUrl: string,
): GuideResolution | 'START_TOUR' {
  const text = rawInput
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const isEn = lang === 'en';

  // 1. Iniciar tour
  if (
    text.includes('iniciar tour') ||
    text.includes('comenzar tour') ||
    text.includes('start tour') ||
    text.includes('tour guiado') ||
    text.includes('guided tour') ||
    text === 'tour' ||
    text.includes('paso a paso') ||
    text.includes('step by step') ||
    text.includes('tutorial')
  ) {
    return 'START_TOUR';
  }

  // 2. Ayuda contextual de la pantalla actual
  if (
    text.includes('esta pantalla') ||
    text.includes('donde estoy') ||
    text.includes('aqui') ||
    text.includes('this page') ||
    text.includes('where am i') ||
    text.includes('current page')
  ) {
    return getContextHelp(lang, currentUrl);
  }

  // 3. Navegación agéntica explícita ("llévame a...", "ir a...", "go to...", "open...")
  const wantsNavigation =
    text.includes('llevame') ||
    text.includes('ir a ') ||
    text.includes('abrir ') ||
    text.includes('go to ') ||
    text.includes('take me') ||
    text.includes('open ');

  if (wantsNavigation) {
    if (text.includes('catalogo') || text.includes('catalog') || text.includes('explorar')) {
      return {
        text: isEn
          ? 'Taking you to the **Experiences Catalog** right now.'
          : 'Te llevo ahora mismo al **Catálogo de Experiencias**.',
        navigateTo: '/catalog',
      };
    }
    if (text.includes('publicar') || text.includes('crear') || text.includes('publish') || text.includes('create')) {
      return {
        text: isEn
          ? 'Opening the **Publish Experience** 3-step wizard.'
          : 'Abriendo el asistente de **Publicar Experiencia** en 3 pasos.',
        navigateTo: '/experiences/create',
      };
    }
    if (text.includes('local') || text.includes('venue')) {
      return {
        text: isEn ? 'Opening **My Venues**.' : 'Abriendo la gestión de **Mis Locales**.',
        navigateTo: '/host/venues',
      };
    }
    if (text.includes('anfitrion') || text.includes('host')) {
      return {
        text: isEn ? 'Opening the **Host Dashboard**.' : 'Abriendo tu **Panel de Anfitrión**.',
        navigateTo: '/host',
      };
    }
    if (text.includes('entrada') || text.includes('ticket') || text.includes('reserva') || text.includes('booking')) {
      return {
        text: isEn ? 'Opening **My Bookings & QR Tickets**.' : 'Abriendo **Mis Entradas y Tickets QR**.',
        navigateTo: '/my-tickets',
      };
    }
    if (text.includes('notificacion') || text.includes('aviso') || text.includes('notification')) {
      return {
        text: isEn ? 'Opening the **Notification Center**.' : 'Abriendo el **Centro de Notificaciones**.',
        navigateTo: '/notifications',
      };
    }
    if (text.includes('demanda') || text.includes('demand') || text.includes('analitica')) {
      return {
        text: isEn ? 'Opening **Unmet Demand Insights**.' : 'Abriendo **Analítica de Demanda Insatisfecha**.',
        navigateTo: '/demand-insights',
      };
    }
    if (text.includes('perfil') || text.includes('profile')) {
      return {
        text: isEn ? 'Opening your **User Profile**.' : 'Abriendo tu **Perfil de Usuario**.',
        navigateTo: '/profile',
      };
    }
    if (text.includes('movil') || text.includes('mobile') || text.includes('app')) {
      return {
        text: isEn ? 'Opening the **Attendee Mobile App** page.' : 'Abriendo la sección de la **App Móvil para Asistentes**.',
        navigateTo: '/attendee-app',
      };
    }
  }

  // 4. Maestro de Ceremonias IA y/o DJ Virtual
  if (
    text.includes('maestro') ||
    text.includes('ceremonia') ||
    text.includes('mc') ||
    text.includes('dj') ||
    text.includes('musica') ||
    text.includes('music') ||
    text.includes('youtube') ||
    text.includes('gemini') ||
    text.includes('qwen') ||
    text.includes('voz') ||
    text.includes('voice') ||
    text.includes('ducking')
  ) {
    return {
      text: isEn
        ? '### AI Master of Ceremonies & Autonomous Virtual DJ\n\nBoth assistants live inside the **Live Console** (`/live/:id`) and activate when the Host clicks **Start Event**:\n\n1. **AI Master of Ceremonies (Right Panel)**\n   - Powered by **Vertex AI (Gemini 3.8 Flash)** with automatic fallback to local **Ollama (Qwen 3.8)**.\n   - Speaks with natural neural voice (**Edge TTS**) and keeps per-event conversational memory.\n   - Generates an automatic **welcome speech** at event start and proposes **autonomous dynamics every 1 minute** based on room energy.\n\n2. **Autonomous Virtual DJ**\n   - Streams curated **YouTube** tracks, runs a **BPM Groove synthesizer**, and supports **local MP3/WAV** files.\n   - **Smart Ducking**: automatically lowers music volume while the AI MC is speaking.'
        : '### Maestro de Ceremonias IA y DJ Virtual Autónomo\n\nAmbos asistentes operan dentro de la **Consola en Vivo** (`/live/:id`) y se activan cuando el Anfitrión pulsa **Iniciar Evento**:\n\n1. **Maestro de Ceremonias IA (Panel Derecho)**\n   - Impulsado por **Vertex AI (Gemini 3.8 Flash)** con respaldo automático local en **Ollama (Qwen 3.8)**.\n   - Locuta con voz neural natural (**Edge TTS**) y guarda memoria conversacional por evento.\n   - Genera un **discurso de bienvenida** al iniciar y propone **dinámicas autónomas cada 1 minuto** según la energía de la sala.\n\n2. **DJ Virtual Autónomo**\n   - Reproduce temas de **YouTube** en vivo, incluye un sintetizador **Groove BPM** y permite subir pistas **MP3/WAV locales**.\n   - **Ducking inteligente**: baja suavemente el volumen de la música mientras el MC está hablando.',
      quickActions: isEn
        ? [
            { label: 'Go to Host Dashboard', route: '/host', icon: 'building-office' },
            { label: 'Camera & GDPR privacy', query: 'camera privacy gdpr', icon: 'shield-check' },
          ]
        : [
            { label: 'Ir al Panel Anfitrión', route: '/host', icon: 'building-office' },
            { label: 'Privacidad GDPR cámara', query: 'privacidad gdpr camara', icon: 'shield-check' },
          ],
    };
  }

  // 5. Consola en Vivo, Cámara y Privacidad GDPR
  if (
    text.includes('en vivo') ||
    text.includes('live') ||
    text.includes('camara') ||
    text.includes('camera') ||
    text.includes('gdpr') ||
    text.includes('privacidad') ||
    text.includes('privacy') ||
    text.includes('semaforo') ||
    text.includes('pulso') ||
    text.includes('iniciar evento') ||
    text.includes('finalizar evento')
  ) {
    return {
      text: isEn
        ? '### Live Monitoring Console & Ephemeral Vision (GDPR)\n\n- **Event Lifecycle**: Click **Start Event** to begin the live session (this unlocks the camera, AI MC, DJ, and notifies registered attendees). Click **Finish Event** when done to generate the post-event report.\n- **Camera Modes**: Use your laptop webcam or pair a smartphone camera via QR code.\n- **Privacy by Design**: Video frames are processed strictly in RAM to compute the room energy index (**Green / Amber / Red**) and immediately discarded. Zero images or recordings are saved.'
        : '### Consola en Vivo y Visión Efímera (GDPR)\n\n- **Ciclo de Vida del Evento**: Pulsa **Iniciar Evento** para habilitar la cámara, el Maestro de Ceremonias IA, el DJ Virtual y notificar a los asistentes. Al terminar, pulsa **Finalizar Evento** para cerrar y generar el reporte.\n- **Modos de Cámara**: Usa la cámara web del equipo o vincula un celular escaneando el código QR de cámara.\n- **Privacidad por Diseño**: Los fotogramas se procesan únicamente en memoria RAM para calcular el pulso de energía (**Verde / Ámbar / Rojo**) y se descartan al instante. Nunca se guardan fotos ni videos.',
      quickActions: isEn
        ? [
            { label: 'AI MC & Virtual DJ', query: 'how do the ai mc and virtual dj work', icon: 'sparkles' },
            { label: 'Open Host Dashboard', route: '/host', icon: 'video-camera' },
          ]
        : [
            { label: 'Ver MC IA y DJ Virtual', query: 'como funciona el maestro de ceremonias y dj', icon: 'sparkles' },
            { label: 'Abrir Panel Anfitrión', route: '/host', icon: 'video-camera' },
          ],
    };
  }

  // 6. Reservas, Quórum, Pagos y Tickets QR
  if (
    text.includes('reserv') ||
    text.includes('book') ||
    text.includes('ticket') ||
    text.includes('entrada') ||
    text.includes('qr') ||
    text.includes('quorum') ||
    text.includes('pago') ||
    text.includes('stripe') ||
    text.includes('pay')
  ) {
    return {
      text: isEn
        ? '### Bookings, Minimum Quorum & QR Tickets\n\n- **How Quorum Works**: Each experience defines a minimum number of attendees required to be viable. When that threshold is reached, the event status changes to **Confirmed** and everyone receives an alert.\n- **Booking & Payment**: Select an experience in the catalog, click **Book spot now**, and complete checkout.\n- **QR Access**: Your digital ticket with a unique QR code appears immediately in **My Bookings** (`/my-tickets`) and syncs with the **Attendee Mobile App**.'
        : '### Reservas, Quórum Mínimo y Tickets QR\n\n- **¿Cómo funciona el Quórum?**: Cada experiencia define un mínimo de asistentes para ser viable. Al alcanzar esa meta, el evento pasa a **Confirmado** y todos los inscritos reciben un aviso instantáneo.\n- **Reserva y Pago**: Abre una experiencia en el catálogo, pulsa **Reservar cupo ahora** y completa el proceso de reserva.\n- **Acceso con QR**: Tu ticket digital con código QR único aparece en **Mis Entradas** (`/my-tickets`) y se sincroniza automáticamente con la **App Móvil**.',
      quickActions: isEn
        ? [
            { label: 'Explore Catalog', route: '/catalog', icon: 'magnifying-glass' },
            { label: 'View My Bookings', route: '/my-tickets', icon: 'ticket' },
          ]
        : [
            { label: 'Explorar Catálogo', route: '/catalog', icon: 'magnifying-glass' },
            { label: 'Ir a Mis Entradas', route: '/my-tickets', icon: 'ticket' },
          ],
    };
  }

  // 7. Matching Grupal
  if (text.includes('matching') || text.includes('grupo') || text.includes('group') || text.includes('afinidad')) {
    return {
      text: isEn
        ? '### Affinity Group Matching\n\nDon’t want to go alone? **Group Matching** pairs you with compatible attendees before the experience:\n- Open any experience and click **Join Group Matching**.\n- The platform matches participants based on profile interests and event category.\n- Once your affinity group reaches the target size, everyone is notified via Web and Mobile Push.'
        : '### Matching Grupal por Afinidad\n\n¿Prefieres asistir en compañía de personas con intereses similares? El **Matching Grupal** te empareja antes del evento:\n- Ingresa al detalle de una experiencia y selecciona **Postular al Quórum Grupal**.\n- El motor agrupa participantes según los intereses configurados en tu perfil.\n- Cuando tu grupo se completa, todos reciben una notificación push para confirmar juntos.',
      quickActions: isEn
        ? [
            { label: 'Update Profile Interests', route: '/profile', icon: 'user' },
            { label: 'Explore Catalog', route: '/catalog', icon: 'magnifying-glass' },
          ]
        : [
            { label: 'Editar mis intereses', route: '/profile', icon: 'user' },
            { label: 'Explorar Catálogo', route: '/catalog', icon: 'magnifying-glass' },
          ],
    };
  }

  // 8. Publicar Experiencia, Locales y Rentabilidad
  if (
    text.includes('publicar') ||
    text.includes('publish') ||
    text.includes('crear') ||
    text.includes('create') ||
    text.includes('anfitrion') ||
    text.includes('host') ||
    text.includes('local') ||
    text.includes('venue') ||
    text.includes('comision') ||
    text.includes('rentabilidad') ||
    text.includes('revenue')
  ) {
    return {
      text: isEn
        ? '### Publishing Experiences & Host Profitability\n\n1. **Register a Venue** (optional for virtual events): Save your venue name, address, and capacity in **My Venues** (`/host/venues`).\n2. **3-Step Wizard** (`/experiences/create`): Fill in basic details, date/modality, and quorum pricing.\n3. **Commission Tiers**:\n   - Tier 1 (`< Bs 100`): **10%** platform fee\n   - Tier 2 (`Bs 100 – 300`): **8%** platform fee\n   - Tier 3 (`> Bs 300`): **5%** preferential fee\n\n*Note: Publishing requires a **Host** role. Attendees can switch roles from their Profile.*'
        : '### Publicar Experiencias y Rentabilidad del Anfitrión\n\n1. **Registra tu Local** (opcional para eventos virtuales): Guarda nombre, zona y aforo en **Mis Locales** (`/host/venues`).\n2. **Asistente en 3 Pasos** (`/experiences/create`): Completa ficha básica, fecha/modalidad y economía de quórum.\n3. **Escalones de Comisión**:\n   - Escalón 1 (`< Bs 100`): **10%** de comisión\n   - Escalón 2 (`Bs 100 – 300`): **8%** de comisión\n   - Escalón 3 (`> Bs 300`): **5%** comisión preferencial\n\n*Nota: Publicar requiere rol **Anfitrión**. Si eres Asistente, puedes cambiar de rol desde tu Perfil.*',
      quickActions: isEn
        ? [
            { label: 'Publish Experience', route: '/experiences/create', icon: 'plus' },
            { label: 'Manage Venues', route: '/host/venues', icon: 'map-pin' },
            { label: 'Host Dashboard', route: '/host', icon: 'building-office' },
          ]
        : [
            { label: 'Publicar Experiencia', route: '/experiences/create', icon: 'plus' },
            { label: 'Gestionar Locales', route: '/host/venues', icon: 'map-pin' },
            { label: 'Panel de Anfitrión', route: '/host', icon: 'building-office' },
          ],
    };
  }

  // 9. Notificaciones Push y Web
  if (
    text.includes('notificacion') ||
    text.includes('notification') ||
    text.includes('push') ||
    text.includes('alerta') ||
    text.includes('aviso') ||
    text.includes('firebase') ||
    text.includes('fcm')
  ) {
    return {
      text: isEn
        ? '### Real-Time Notifications (Web & Mobile Push)\n\nEXPERIENCIA sends automatic notifications via the **Notification Center**, browser alerts, and **Firebase Cloud Messaging (FCM)** on the Flutter Mobile App:\n- **Booking Confirmed**: Instant confirmation to attendee + new reservation alert to host.\n- **Quorum Reached**: Alerts all attendees and the host when the event is officially confirmed.\n- **Event Started / Finished**: Notifies registered attendees the moment the host starts or concludes the live session.\n- **Group Matching Formed**: Alerts members when their affinity group is ready.\n- **Live Energy Alerts**: Warns the host if room energy drops during a live event.'
        : '### Notificaciones en Tiempo Real (Web y Push Móvil)\n\nEXPERIENCIA envía alertas automáticas al **Centro de Avisos**, notificaciones nativas del navegador y **Push FCM** en la App Móvil Flutter:\n- **Reserva Confirmada**: Confirmación inmediata al asistente + aviso de nuevo inscrito al anfitrión.\n- **Quórum Alcanzado**: Avisa a todos los asistentes y al anfitrión cuando el evento queda confirmado.\n- **Inicio y Cierre de Evento**: Notifica a los inscritos en el instante en que el anfitrión inicia o finaliza la sesión en vivo.\n- **Grupo de Matching Listo**: Avisa a los miembros cuando su grupo de afinidad se completa.\n- **Alertas de Energía en Vivo**: Avisa al anfitrión si la energía de la sala cae durante el evento.',
      quickActions: isEn
        ? [
            { label: 'Open Notifications', route: '/notifications', icon: 'bell' },
            { label: 'Mobile App Info', route: '/attendee-app', icon: 'device-phone-mobile' },
          ]
        : [
            { label: 'Ver Centro de Avisos', route: '/notifications', icon: 'bell' },
            { label: 'Ver App Móvil', route: '/attendee-app', icon: 'device-phone-mobile' },
          ],
    };
  }

  // 10. Analítica de Demanda
  if (text.includes('demanda') || text.includes('demand') || text.includes('analitica') || text.includes('insight')) {
    return {
      text: isEn
        ? '### Unmet Demand Analytics\n\nTracks what attendees search for across categories and zones when no matching experience is available yet. Hosts use this dashboard to launch high-demand events with much faster quorum conversion.'
        : '### Analítica de Demanda Insatisfecha\n\nRegistra qué categorías, zonas y horarios buscan los usuarios cuando todavía no existe una experiencia disponible. Los anfitriones usan este panel para crear eventos con alta demanda y alcanzar el quórum más rápido.',
      quickActions: isEn
        ? [{ label: 'Open Demand Insights', route: '/demand-insights', icon: 'chart-bar' }]
        : [{ label: 'Abrir Analítica de Demanda', route: '/demand-insights', icon: 'chart-bar' }],
    };
  }

  // 11. Catálogo
  if (text.includes('catalogo') || text.includes('catalog') || text.includes('explorar') || text.includes('filtro')) {
    return {
      text: isEn
        ? '### Experiences Catalog\n\nBrowse curated local and virtual experiences:\n- Filter by **Category**, **Modality** (In-Person, Virtual, Hybrid), and **Open Spots**.\n- Track live **Quorum Progress** directly on each card.\n- Click any experience to inspect full details, venue map, and booking options.'
        : '### Catálogo de Experiencias\n\nExplora experiencias presenciales, virtuales e híbridas en tu ciudad:\n- Filtra por **Categoría**, **Modalidad** (Presencial, Virtual, Híbrido) y **Solo con cupos abiertos**.\n- Observa el **progreso del quórum** en tiempo real directamente en cada tarjeta.\n- Ingresa al detalle para ver agenda, ubicación y reservar tu cupo.',
      quickActions: isEn
        ? [{ label: 'Explore Catalog', route: '/catalog', icon: 'magnifying-glass' }]
        : [{ label: 'Ir al Catálogo', route: '/catalog', icon: 'magnifying-glass' }],
    };
  }

  // 12. Roles y Perfil
  if (text.includes('rol') || text.includes('role') || text.includes('perfil') || text.includes('profile') || text.includes('cuenta')) {
    return {
      text: isEn
        ? `### Roles & Account Profile\n\nYour current mode is **${role}**.\n- **Attendee**: Explore catalog, book spots, use Group Matching, and carry QR tickets.\n- **Host**: Publish experiences, manage venues, access Unmet Demand Insights, and operate the Live Console with AI MC & Virtual DJ.\n- You can update your interests or switch between Attendee and Host roles in **Profile** (\`/profile\`).`
        : `### Roles y Perfil de Cuenta\n\nTu modo actual es **${role}**.\n- **Asistente**: Explora el catálogo, reserva cupos, participa en Matching Grupal y lleva tus Tickets QR.\n- **Anfitrión**: Publica experiencias, gestiona locales, consulta Analítica de Demanda y opera la Consola en Vivo con MC IA y DJ Virtual.\n- Puedes editar tus intereses o cambiar entre rol Asistente y Anfitrión desde **Mi Perfil** (\`/profile\`).`,
      quickActions: isEn
        ? [{ label: 'Go to Profile', route: '/profile', icon: 'user' }]
        : [{ label: 'Ir a Mi Perfil', route: '/profile', icon: 'user' }],
    };
  }

  // Fallback
  return {
    text: isEn
      ? `I didn't find an exact match for **"${rawInput}"**, but I can help you with any area of **EXPERIENCIA**:\n- **Explore & Book**: Catalog, minimum quorum, QR tickets, and Group Matching.\n- **Host Tools**: Publishing experiences, venues, profitability, and Demand Insights.\n- **Live Console**: Ephemeral GDPR camera, AI Master of Ceremonies with voice, and Autonomous Virtual DJ.\n- **Navigation**: Tell me *"take me to catalog"* or *"open host dashboard"* and I will navigate for you.`
      : `No encontré una coincidencia exacta para **"${rawInput}"**, pero puedo ayudarte con cualquier módulo de **EXPERIENCIA**:\n- **Explorar y Reservar**: Catálogo, quórum mínimo, tickets QR y Matching Grupal.\n- **Herramientas de Anfitrión**: Publicar experiencias, locales, rentabilidad y Analítica de Demanda.\n- **Consola en Vivo**: Cámara efímera GDPR, Maestro de Ceremonias IA con voz y DJ Virtual Autónomo.\n- **Navegación Agéntica**: Escríbeme *"llévame al catálogo"* o *"abrir mis entradas"* y te llevo directo.`,
    quickActions: isEn
      ? [
          { label: 'Start 7-Step Tour', query: 'start tour', icon: 'sparkles' },
          { label: 'What can I do here?', query: 'what can i do on this page', icon: 'map-pin' },
          { label: 'AI MC & Virtual DJ', query: 'how do the ai mc and virtual dj work', icon: 'bolt' },
        ]
      : [
          { label: 'Iniciar Tour (7 pasos)', query: 'iniciar tour', icon: 'sparkles' },
          { label: '¿Qué puedo hacer aquí?', query: 'que puedo hacer en esta pantalla', icon: 'map-pin' },
          { label: 'MC IA y DJ Virtual', query: 'como funciona el maestro de ceremonias y dj', icon: 'bolt' },
        ],
  };
}
