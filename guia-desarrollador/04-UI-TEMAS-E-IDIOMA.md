# UI compartida, temas e idioma

[Índice](README.md) · [Estilos](../src/styles.css) · [Controles compartidos](../src/app/shared/ui/index.ts)

## Componentes reutilizables

La composición de cada pantalla vive en su funcionalidad; la apariencia y los estados comunes se mantienen en `shared/ui/`. Importar únicamente los controles usados por la plantilla desde ese directorio. Navbar, footer, iconos y skeletons siguen en `shared/components/`.

| Control | Uso y contrato |
| --- | --- |
| `button[appButton]` | Acción nativa. `variant`: primary, secondary, ghost, danger. `size`: sm, md, icon. `busy` muestra progreso, anuncia aria-busy y deshabilita el control. El tipo por defecto es button; declarar submit para enviar un formulario. |
| `a[appButton]` | Navegación con href/routerLink y la misma apariencia. No sustituir enlaces por botones ni agregarles disabled. |
| `input[appInput]`, `textarea[appInput]`, `select[appInput]` | Estilo consistente sobre controles nativos; conserva formControlName y ngModel. Los checkboxes mantienen su control nativo. |
| `app-field` | Recibe controlId, label, hint y error. Proyecta un control appInput; conecta automáticamente su id, etiqueta, aria-describedby y aria-invalid. |
| `app-alert` | Mensajes info/success/error; usa status o alert según el tono. |
| `app-page-header` | Eyebrow opcional, título, descripción y acciones proyectadas. |
| `app-empty-state` | Icono, título, explicación y una acción opcional para continuar. |
| `app-status-badge` | Estado traducido con texto y color; no depender solo del color. |
| `app-dialog` | Diálogo nativo, título accesible, cierre mediante Escape/botón/fondo y retorno del foco. Renderizar con @if y retirar al recibir closed. returnFocus permite indicar el disparador. |

Ejemplo con Reactive Forms:

```html
<app-field
  controlId="first-name"
  [label]="'profile.personal.firstName' | translate"
  [error]="form.controls.first_name.touched && form.controls.first_name.invalid
    ? ('auth.required' | translate) : ''"
>
  <input appInput formControlName="first_name" required autocomplete="given-name" />
</app-field>

<button appButton type="submit" [busy]="saving()">
  {{ 'profile.btn.save' | translate }}
</button>
```

Importar ButtonComponent, FormFieldComponent, InputDirective y TranslatePipe en el componente que usa el ejemplo. La capa de UI no llama APIs, decide precios ni contiene reglas de permisos.

Usar primary para la acción principal, secondary para alternativas, ghost para acciones de menor prioridad y danger para cancelaciones/devoluciones. Los botones de solo icono necesitan aria-label traducido. Las selecciones se anuncian con aria-pressed; la ruta activa, con ariaCurrentWhenActive="page".

## Diseño y accesibilidad

Los tokens de superficie, borde, texto y acento están en `styles.css`; cambian al aplicar la clase dark en html. Los estilos compartidos están en `@layer components`, de modo que las utilidades de composición y los breakpoints de Tailwind sigan funcionando. En las vistas, añadir clases de distribución (grid, gap, w-full, márgenes), evitando copiar colores, bordes y paddings de los controles.

Las acciones tienen al menos 44 px de altura, foco visible y estado deshabilitado. Las ayudas permanecen fuera del placeholder. Cada formulario debe mostrar validación y errores del servidor. Los formularios de acceso permiten scroll en pantallas pequeñas y con zoom. Existe un enlace para saltar al contenido y se respeta la preferencia de movimiento reducido.

El rediseño se aplica a acceso/registro, perfil, catálogo/detalle/publicación, checkout, entradas, grupos, demanda y avisos. Las vistas Live y SaaS corresponden a otro alcance y conservan su implementación.

## Idioma

`I18nService` mantiene es/en, persiste la elección y actualiza el atributo lang de html. Registra el locale español; para fechas dependientes del idioma, pasar i18n.currentLang() al DatePipe. `TranslatePipe` cambia las etiquetas cuando cambia el idioma.

`core/i18n/translations.ts` reúne auth.translations.ts, sprint.translations.ts y ui.translations.ts. Agregar cada clave en español e inglés y usar la misma clave en la vista. No traducir nombres, categorías ingresadas por usuarios ni mensajes persistidos del servidor mediante sustituciones de texto.

```sh
npm run check:i18n
```

El comando comprueba paridad de diccionarios, claves literales de las plantillas, llamadas translate y opciones de etiquetas en TypeScript. Las claves construidas dinámicamente y el contenido de API requieren revisión adicional. Las pruebas de perfil verifican el cambio de idioma y los roles.

## Verificación visual

Revisar claro/oscuro y ambos idiomas a 360, 768 y 1280 px; usar teclado y zoom al 200 %. Comprobar que los menús se cierran con Escape, los formularios se pueden recorrer, el error se relaciona con su campo y el QR devuelve el foco al disparador. La compilación y las pruebas DOM no reemplazan esta revisión en un navegador.

Mantener estados de carga, resultado, vacío y error. Un fallo HTTP no debe presentarse como historial vacío. En los pagos, mostrar los estados canónicos de la API.
