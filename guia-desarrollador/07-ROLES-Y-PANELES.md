# Roles, navegación y paneles

[Índice](README.md) · [Reglas vigentes](../../docs/REGLAS_Y_VISTAS_POR_ROL.md)

AuthService distingue ADMIN, HOST y ATTENDEE por pertenencia explícita. VENUE equivale a HOST como compatibilidad. homeRoute define el inicio con prioridad ADMIN → HOST → ATTENDEE. NavigationService entrega una única lista al navbar de escritorio y adaptable.

Los guards consultan /users/me antes de autorizar una ruta privada. publicCatalogGuard permite visitantes y ATTENDEE, hostGuard protege gestión propia, attendeeGuard protege reservas/entradas/matching y adminGuard protege plataforma. Un fallo de conexión lleva a /access para reintentar; no crea permisos a partir de la caché.

## Funcionalidades

- features/host/host-dashboard: listado propio con acciones autorizadas por can_edit/can_delete de la API y confirmación de eliminación.
- features/host/venues: formulario reutilizable para alta/edición de lugares propios, con ubicación, teléfono y capacidad.
- features/host/host-operations: ingresos reales por moneda y registro de acceso; estas herramientas ya no están en Mis entradas.
- features/admin/admin-dashboard: métricas agregadas y consulta paginada de experiencias de plataforma.
- features/admin/admin-users: cuentas paginadas y edición de varios roles mediante selección explícita.
- create-experience: el mismo formulario sirve a publicación y edición. /host/experiences/:id/edit consulta el DTO propio, precarga la hora de Bolivia y actualiza mediante PUT. No vuelve a publicar ni cambia categoría.

El perfil consulta reservas solo con ATTENDEE. No permite concederse roles; muestra los roles que devuelve la API. Los campos de ciudad, zona y dirección del lugar se configuran en Mis lugares. El formulario de perfil envía únicamente los campos permitidos por ProfileUpdateDTO.

ADMIN puede tener además HOST o ATTENDEE, pero sus capacidades no se heredan automáticamente. No usar isHost como sinónimo de usuario autenticado ni deducir ATTENDEE por ausencia de HOST. No confiar en localStorage para autorizar operaciones de API.

## Comprobaciones

```sh
npm run check:i18n
npm test -- --watch=false
npm run build
```

Las pruebas cubren navegación por roles, rechazo de rutas con roles de caché desactualizados, URLs de gestión y edición con precio cero. La propiedad y las carreras con reservas se verifican en el backend; la UI no sustituye sus validaciones.
