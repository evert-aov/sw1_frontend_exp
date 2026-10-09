# EXPERIENCIA — Frontend Web (Angular)

Aplicación Web desarrollada en **Angular 22** con **Tailwind CSS**, orientada a anfitriones, establecimientos y moderadores de eventos en vivo.

---

## 🏛️ Arquitectura del Proyecto

El código fuente en `src/app/` sigue una estructura modular limpia en capas y alineada con los paquetes del Backend:

```text
src/app/
├── core/                                 # Capa central compartida
│   ├── models/models.ts                  # Interfaces TypeScript alineadas a los DTOs del Backend
│   ├── services/                         # Servicios con firmas Observable (Auth, Experience, Booking, Matching, Live)
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
├── shared/                               # Componentes y pipes reutilizables
└── app.routes.ts                         # Configuración de enrutamiento con Lazy Loading
```

---

## 🗺️ Rutas de Navegación Configuradas

| Ruta | Componente | Descripción |
| :--- | :--- | :--- |
| `/catalog` | `CatalogComponent` | Catálogo interactivo de experiencias |
| `/experiences/create` | `CreateExperienceComponent` | Formulario de publicación |
| `/experiences/:id` | `ExperienceDetailComponent` | Vista detallada de la experiencia |
| `/auth/login` | `LoginComponent` | Autenticación de usuarios |
| `/auth/register` | `RegisterComponent` | Registro de cuentas |
| `/profile` | `ProfileComponent` | Perfil y preferencias de usuario |
| `/checkout/:id` | `CheckoutComponent` | Pasarela de reserva y pago |
| `/my-tickets` | `MyTicketsComponent` | Historial y tickets con QR |
| `/saas-plans` | `SaasPlansComponent` | Planes de suscripción Pro |
| `/matching/:id` | `MatchingGroupsComponent` | Postulación a grupos dinámicos |
| `/demand-insights` | `DemandDashboardComponent` | Panel de tendencias para negocios |
| `/live/:sessionId` | `LiveHostDashboardComponent` | Dashboard en vivo con cámara y telemetría |
| `/live/:sessionId/assistant`| `DjMcAssistantComponent` | Asistente de dinámicas MC y DJ Virtual |
| `/reports/:sessionId` | `PostEventReportComponent` | Curvas de engagement post-evento |

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

# Compilación para producción
npm run build
```
