# Pruebas y operación

[Índice](README.md) · [Prueba existente](../src/app/app.spec.ts)

Desde `experiencia_front/`:

```sh
npm test -- --watch=false
npm run check:i18n
npm run build
```

La suite incluye App y pruebas de sesión/roles, HTTP, filtros/paginación, publicación por UUID, conversión horaria y cotización del servidor. No ejecuta compras reales ni acredita PostgreSQL. La compilación de producción comprueba templates/tipos y presupuestos, pero no detecta por sí sola rutas HTTP incorrectas.

La interfaz compartida tiene pruebas DOM de formularios nativos, envío explícito, bloqueo durante una operación y asociación entre etiqueta, ayuda y error. El perfil comprueba español/inglés, validación y un fallo al guardar. El auditor de traducciones comprueba las claves estáticas y la paridad es/en. Para validar distribución, contraste y foco en un navegador, seguir la [guía de UI](04-UI-TEMAS-E-IDIOMA.md).

## Pruebas al desarrollar

Servicios: usar pruebas HTTP para URL, método, parámetros, JWT y transformación de DTO. Formularios: sede obligatoria, fechas y aforos; sesión: rol VENUE, 401, logout y persistencia. Catálogo: búsquedas que requieren otra página y filtros de fecha/radio. Sprint 2: checkout, retorno pendiente, QR, adhesión idempotente, errores de demanda y recuperación de avisos.

Probar el recorrido contra FastAPI y PostgreSQL reales además de dobles. No usar los resultados históricos de la auditoría SQLite como evidencia actual. La configuración y prueba de acceso PostgreSQL están en la [guía del backend](../../experiencia_back/guia-desarrollador/01-POSTGRESQL-Y-MIGRACIONES.md).

## Diagnóstico

| Síntoma | Revisar |
| --- | --- |
| API no responde | Backend en 8000 y comprobación PostgreSQL exitosa |
| Error 400 publicando presencial | UUID de sede, fecha y capacidad frente a la API |
| Error 404 al ver entradas/demanda | Diferencias de rutas documentadas |
| VENUE sin permiso | Perfil confirmado en la API; la web ya incluye VENUE como publicador |
| Datos no cambian al filtrar | Parámetros, página y respuesta de servidor; ya no se filtra solo una página local |
| Pantalla vacía en vez de error | catchError/handlers que convierten fallos en listas vacías |

No desplegar una nueva URL de API cambiando credenciales del backend en código Angular. La web solo recibe endpoints públicos y tokens de su sesión, nunca claves de PostgreSQL o Stripe.
