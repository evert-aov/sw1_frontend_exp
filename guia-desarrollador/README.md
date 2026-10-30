# Guía del desarrollador — Angular 22

Cliente web de EXPERIENCIA para catálogo, perfiles, publicación y paneles de negocio. Usa componentes standalone, servicios por dominio, Signals y Tailwind CSS v4. Su estructura corresponde a funcionalidades; no utiliza el microkernel del editor UML de `parcial_1`.

| Capítulo | Contenido |
| --- | --- |
| [00 — Arquitectura y configuración](00-ARQUITECTURA-Y-CONFIGURACION.md) | Angular, Node, arranque y URL de API |
| [01 — Sesión, servicios y contratos](01-SESION-SERVICIOS-Y-CONTRATOS.md) | Estado de usuario, HTTP, guards y roles |
| [02 — Catálogo y publicación](02-CATALOGO-Y-PUBLICACION.md) | Formularios, modelos y pendientes de integración |
| [03 — Reservas, matching y demanda](03-RESERVAS-MATCHING-Y-DEMANDA.md) | Compra, QR, grupos, avisos y tablero |
| [04 — UI, temas e idioma](04-UI-TEMAS-E-IDIOMA.md) | Componentes compartidos, i18n y estilos |
| [05 — Pruebas y operación](05-PRUEBAS-Y-OPERACION.md) | Comandos, cobertura real y diagnóstico |
| [06 — Directorios y flujos](06-MAPA-DE-DIRECTORIOS-Y-FLUJOS.md) | Mapa y recorridos principales |
| [07 — Roles y paneles](07-ROLES-Y-PANELES.md) | HOST propietario, ATTENDEE y administración de plataforma |

Desde `experiencia_front/`:

```sh
node --version
npm install
npm start
```

Web: `http://localhost:3000`. API esperada: `http://localhost:8000/api`. Configuración en [api.config.ts](../src/app/core/config/api.config.ts); las claves de base de datos y Stripe nunca pertenecen a la web.

Versión revisada: Angular core 22.1.3; CLI/build 22.1.6. [package.json](../package.json) conserva Angular 22. Node debe satisfacer los engines instalados. Ver [backend](../../experiencia_back/guia-desarrollador/README.md), [móvil](../../experiencia_movil/guia-desarrollador/README.md) y [acuerdos del equipo](../../docs/GUIAS_DESARROLLADORES.md).
