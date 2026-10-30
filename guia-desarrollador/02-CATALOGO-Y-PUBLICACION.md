# Catálogo y publicación

[Índice](README.md) · [Servicio](../src/app/core/services/experience.service.ts) · [Hora del evento](../src/app/core/utils/event-time.util.ts)

## Publicación — CU-03

El formulario protegido por HOST carga categorías y lugares propios mediante GET /venues/me/owned, selecciona venue_id y muestra zona/dirección de esa sede. Para IN_PERSON/HYBRID exige un UUID incluido en las sedes consultadas. VIRTUAL no envía sede. Ya no usa venue_name/address como sustitutos de venue_id.

La hora introducida se interpreta como hora de Bolivia (UTC-04:00) y se convierte a UTC. El comportamiento no depende de la zona horaria del navegador.

La proyección consulta GET /api/experiences/commission-quote; el cliente no contiene escalones monetarios. La respuesta aporta tasa, comisión por entrada y neto. Se invalida una cotización cuando cambia el precio y se deshabilita publicar hasta tener una equivalente al precio actual. El servidor mantiene la autoridad sobre el cálculo final de reservas.

## Exploración — CU-04

CatalogComponent consulta filtros y paginación en el servidor. Usa switchMap para cancelar solicitudes anteriores y vuelve a la primera página al cambiar categoría/modalidad/formulario. El formulario envía texto, zona, disponibilidad, fechas y coordenadas/radio; latitud/longitud se completan juntas.

El modelo usa venue_zone y venue_address de la API. Se preservan total/page/page_size/total_pages. Las barras de quórum usan el mínimo viable, distinguiéndolo de la ocupación máxima; el backend descuenta retenciones activas de available_slots.

Los días de búsqueda también se interpretan en Bolivia; hasta incluye el final del día. Falta de ubicación, error de red y resultado vacío se muestran como estados diferentes. Las pruebas verifican cambios de página, filtros reales y descarte de respuestas obsoletas.

Validar publicación y catálogo contra PostgreSQL después de migrar: las pruebas HTTP sustituidas y la compilación no certifican la integración real de sedes/aforos.
