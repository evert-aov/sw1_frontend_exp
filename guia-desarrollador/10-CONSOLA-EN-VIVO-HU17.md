# Consola en vivo no invasiva (CU-09 / HU-17)

[Índice](README.md) · [Componente](../src/app/features/live/live-telemetry-console/live-telemetry-console.component.ts) · [Servicio](../src/app/core/services/live-telemetry.service.ts)

> **HU-17 — Dashboard en vivo con indicadores discretos.** Como moderador o DJ, quiero una vista con semáforos de energía y pulso visual sin saturación de datos, para tomar decisiones ágiles sin distraerme del evento.

## Ruta

`/live/:sessionId/console`, protegida por `hostGuard`. El backend además verifica que el usuario sea el anfitrión de la sesión o ADMIN.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `core/models/live-telemetry.model.ts` | Tipos de la instantánea, del estado de conexión y del código de monitor |
| `core/services/live-telemetry.service.ts` | WebSocket con token, reconexión exponencial (1 s a 15 s), latido cada 25 s, REST de respaldo y código de monitor |
| `core/i18n/live-telemetry.translations.ts` | Textos ES/EN (registrados en `translations.ts`) |
| `features/live/live-telemetry-console/` | Página de la consola |
| `.../energy-traffic-light/` | Semáforo: una sola luz encendida, porcentaje, tendencia; atenuado sin señal en vivo |
| `.../pulse-chart/` | Gráfica SVG de 60 s con franjas de umbral; la geometría es una función pura (`pulse-chart.geometry.ts`) |

Cada componente separa `.ts`, `.html` y `.css`, usa iconos SVG y no usa emojis.

## Comportamiento

- Al abrir la página se conecta a `ws://…/api/live/telemetry/ws/{id}?token=<JWT>` y recibe una instantánea cada 2.5 s.
- Si la conexión se corta, reintenta con espera exponencial. Si el servidor cierra con 4401, 4403 o 4404, muestra el motivo y no reintenta.
- El indicador de estado muestra la conexión (`Conectando`/`Reconectando`) o la señal (`En vivo`, `Señal con retraso`, `Sin señal`).
- **Modo discreto:** oculta métricas y textos de ayuda y deja solo el semáforo y el pulso. La preferencia se guarda en `localStorage`.
- **Vincular tablet o celular:** genera un código de 6 caracteres (un solo uso, 15 min) para el monitor de la app móvil.

## Integración pendiente

El panel `live/:sessionId` (HU-13/15) puede enlazar a la consola:

```html
<a [routerLink]="['/live', sessionId(), 'console']">Consola en vivo</a>
```

## Probar

```sh
# Backend: crear la sesión de demo e iniciar la transmisión simulada
venv/Scripts/python scripts/seed_live_telemetry_demo.py --stream

# Web: iniciar sesión como host@experiencia.com (Password123!) y abrir la URL impresa por el seed
npx ng test --watch=false --include "src/app/features/live/live-telemetry-console/**/*.spec.ts" --include "src/app/core/services/live-telemetry.service.spec.ts"
```
