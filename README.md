# EXPERIENCIA — Frontend Web (Angular)

Aplicación Web desarrollada en **Angular 22** con **Tailwind CSS**, orientada a anfitriones, establecimientos y moderadores de eventos en vivo.

---

## 🎨 Características UI/UX Incorporadas

- **Tailwind CSS v4** integrado con utilidades modernas.
- **Temas Claro y Oscuro (Light & Dark Mode)**:
  - Gestionado a través de `ThemeService` con persistencia en `localStorage`.
  - Soporte de variante `@custom-variant dark (&:where(.dark, .dark *))` para adaptación dinámica de clases (`dark:bg-...`, `dark:text-...`).
- **Internacionalización (i18n)**:
  - Soporte bilingüe en **Inglés y Español** mediante `I18nService`, diccionarios en `translations.ts` y pipe reactivo `TranslatePipe`.
- **Barra de Navegación (`NavbarComponent`)**:
  - Selector de idioma dinámico (🇪🇸 ES / 🇺🇸 EN).
  - Selector de tema con icono de sol/luna (☀️ / 🌙).
  - Enlaces a los módulos principales del ecosistema.

---

## 🏛️ Arquitectura del Proyecto

El código fuente en `src/app/` sigue una estructura modular limpia en capas y alineada con los paquetes del Backend:

```text
src/app/
├── core/                                 # Capa central compartida
│   ├── i18n/translations.ts              # Diccionarios de traducción (English & Spanish)
│   ├── models/models.ts                  # Interfaces TypeScript alineadas a los DTOs del Backend
│   ├── services/                         # Servicios (ThemeService, I18nService, AuthService, ExperienceService, etc.)
│   └── guards/                           # Guards de autenticación y roles
│
├── features/                             # Módulos de funcionalidad por paquete
│   ├── auth/                             # Seguridad y Perfiles (CU-01, CU-02)
│   │   ├── login/                        # Inicio de sesión con JWT
│   │   ├── register/                     # Registro de usuarios
│   │   └── profile/                      # Perfil y preferencias
│   │
│   ├── experience/                       # Catálogo y Publicación (CU-03, CU-04)
│   │   ├── catalog/                      # Exploración y filtros geográficos
│   │   ├── experience-detail/            # Detalle del evento y quórum
│   │   └── create-experience/            # Publicación con aforo mínimo y precios
│   │
│   ├── booking/                          # Reservas y Pagos (CU-05, CU-06, CU-14)
│   │   ├── checkout/                     # Integración con Stripe Checkout
│   │   ├── my-tickets/                   # Historial de entradas con visualización de QR
│   │   └── saas-plans/                   # Planes Pro para anfitriones
│   │
│   ├── matching/                         # Inteligencia y Demanda Urbana (CU-07, CU-08)
│   │   ├── matching-groups/              # Consolidación de quórum grupal
│   │   └── demand-dashboard/             # Panel y mapa de calor de demanda desatendida
│   │
│   └── live/                             # Live Experience & Smart Host (CU-09..CU-13)
│       ├── live-host-dashboard/          # Canvas HTML5 (muestreo 2-3 s) y semáforos de energía
│       ├── dj-mc-assistant/              # Tarjetas interactivas de dinámicas y control de BPM
│       └── post-event-report/            # Gráficas analíticas de atención y descarga en PDF
│
├── shared/                               # Componentes y pipes compartidos
│   ├── components/navbar/                # Navbar con toggle de tema e idioma
│   └── pipes/translate.pipe.ts           # Pipe para traducir textos en plantillas
│
└── app.routes.ts                         # Configuración de enrutamiento con Lazy Loading
```

---

## 🚀 Puesta en Marcha

### 1. Requisitos Previos
- Node.js 18+
- Angular CLI 22 (`npm install -g @angular/cli`)

### 2. Instalación y Servidor de Desarrollo
```bash
# Instalar dependencias
npm install

# Iniciar servidor local
npm start
# o: ng serve --open
```

Disponible en `http://localhost:4200/`.

### 3. Verificación de Tipos y Compilación
```bash
# Chequeo estricto de tipos de TypeScript
npx tsc --noEmit

# Compilación para producción con Tailwind y Chunks optimizados
npm run build
```
