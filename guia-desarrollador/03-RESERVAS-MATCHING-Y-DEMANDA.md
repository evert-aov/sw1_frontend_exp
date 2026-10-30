# Reservas, matching y demanda — sprint 2

[Índice](README.md) · [Reservas](../src/app/core/services/booking.service.ts) · [Matching](../src/app/core/services/matching.service.ts) · [Backend](../../experiencia_back/guia-desarrollador/04-RESERVAS-PAGOS-Y-ENTRADAS.md)

## Compra e historial

Detalle permite elegir 1–20 entradas y conserva Idempotency-Key durante reintentos de una misma solicitud. POST /bookings envía solo evento/cantidad. Checkout carga la reserva propia y muestra importes, moneda, vencimiento y estado económico/evento.

POST /payments/checkout/{id} devuelve una URL Stripe verificada antes de redirigir. Al volver con payment=returned se llama POST /payments/status/{id}; el parámetro no confirma un pago. Hay consulta manual de estado y cancelación de retenciones pendientes.

Mis entradas muestra próximas/pasadas/todas, devoluciones y tickets anidados de GET /bookings/my-tickets. El QR se solicita como Blob autenticado a GET /bookings/tickets/{id}/qr y se libera su object URL al cerrar. No se envía el payload a un generador externo.

El comprador puede solicitar devolución completa antes del evento si ninguna entrada se utilizó. HOST/VENUE dispone en /host/operations de ingresos contables por moneda y un formulario para código legible/lectura QR del lector de acceso. La API limita el check-in al anfitrión propietario y al evento con quórum confirmado. No se implementa captura de cámara del navegador.

## Matching y avisos

Detalle navega al grupo sin postular automáticamente. La pantalla consulta GET /matching/group/{experience_id} cada 15 segundos mientras está abierta. POST /matching/apply admite zona y disponibilidad opcionales, interpretadas en hora de Bolivia; DELETE /matching/group/{id}/membership permite retirarse.

Se muestran interés del grupo, afinidad, cupos confirmados y estado del evento por separado. Reunir interés invita a reservar; no produce un pago ni una entrada.

La ruta /notifications recupera avisos propios por páginas de 50, consulta cada 30 segundos y permite marcarlos leídos. El enlace está en navegación y en Mis entradas. Los errores conservan su estado visible y permiten recuperación; no se reutiliza el WebSocket de live.

## Demanda para establecimientos

/demand-insights exige HOST/VENUE/ADMIN en guard y API. Consulta /demand/insights y /demand/suggestions con zona opcional. switchMap cancela consultas anteriores al cambiar de zona. Se muestran búsquedas sin oferta de 30 días y su evidencia, con precio/franja solo cuando existen filtros observados.

Preparar experiencia abre un borrador editable con título/categoría/precio. La zona solo propone una sede persistida coincidente; el formulario mantiene venue_id real y no inventa dirección/establecimiento.

El catálogo envía X-Search-Session efímero. El servidor registra la búsqueda y deduplica reintentos/paginación; los componentes no afirman si hubo resultados.

Ver [estado y verificación](../../docs/AVANCE_SPRINT_2.md). La UI compilada y las pruebas HTTP no acreditan un cobro Stripe real ni PostgreSQL. SaaS no está habilitado para contratación.
