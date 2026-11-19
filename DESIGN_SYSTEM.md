# Guía de Estilo y Sistema de Diseño Editorial: Experiencias

Esta guía reúne todas las especificaciones visuales, cromáticas, tipográficas y de maquetación construidas para la plataforma. Su propósito es servir como **referencia técnica y conceptual** para presentaciones, colaboración en equipo y como **directriz (prompt) para asistentes de inteligencia artificial** al momento de diseñar o adaptar nuevas vistas (catálogo, reservas, perfil, etc.).

---

## 1. Concepto e Identidad Visual (Para presentaciones y pitch)

### ¿Cómo explicar este estilo?
> *"Dejamos atrás la estética genérica de 'software SaaS con tarjetas moradas y esquinas infladas' para abrazar una identidad de **Revista Cultural Impresa (Editorial Magazine)**, inspirada en publicaciones como Cereal, Kinfolk y Apartamento. El diseño celebra lo artesanal y lo tangible a través de tonos tierra cálidos, fotografía que domina el espacio, tipografía serif literaria de gran escala, bordes rectos nítidos y composiciones asimétricas con ritmo visual dinámico."*

### Pilares clave:
1. **Materialidad y calma**: Tonos crema, arena, terracota cocida y marrones café tostado. Transmite pausa, artesanía y dedicación.
2. **Cero bordes redondeados (`border-radius: 0`)**: Se eliminan las tarjetas flotantes con radio de `1rem`. Todo usa cortes limpios (`rounded-none`), como páginas y columnas de una revista de arte.
3. **Fotografía dominante**: Las fotos no son adornos pequeños; van a sangre (*full-bleed*) o con proporciones de aspecto editoriales variadas (4:3, 3:4, 16:9).
4. **Espaciado generoso**: Espacios en blanco amplios entre secciones (mínimo `5rem` o `py-24 sm:py-32`) para que el contenido respire.
5. **Asimetría intencional**: En lugar de grillas uniformes de 3x3 tarjetas iguales, usamos grillas 7/5 y 4/8 que jerarquizan la historia principal.

---

## 2. Paleta Cromática y Variables CSS (`src/styles.css`)

El proyecto consume variables semánticas en `:root` y `:root.dark`. **Nunca se deben cambiar los nombres de las variables ni hardcodear colores HEX en componentes nuevos**; siempre se consumen mediante `var(--ui-*)` o utilidades dinámicas.

```css
/* ==========================================================================
   PALETA CLARA (:root) - Papel crema, arena, marrón oscuro y terracota
   ========================================================================== */
:root {
  color-scheme: light;
  --ui-surface: #fbf8f3;       /* Fondo principal: crema cálido / papel alabastro */
  --ui-surface-soft: #f2ebe0;  /* Superficies suaves: avena / arena cálida */
  --ui-text: #281e19;          /* Texto principal: café tostado oscuro (alto contraste) */
  --ui-muted: #78695d;         /* Texto secundario y etiquetas: sepia / piedra cálida */
  --ui-border: #e3d8cc;        /* Divisores y líneas: arena natural nítida */
  --ui-accent: #be5338;        /* Acento principal: terracota / arcilla cocida */
  --ui-accent-hover: #9e3f27;  /* Acento hover: terracota profunda */
  --ui-accent-soft: #f6ece4;   /* Fondo suave de acento: rubor de arcilla clara */
  --ui-ring: #be5338;          /* Anillo de enfoque accesible */
}

/* ==========================================================================
   PALETA OSCURA (:root.dark) - Noche cálida, roble tostado y ámbar arcilla
   ========================================================================== */
:root.dark {
  color-scheme: dark;
  --ui-surface: #191411;       /* Fondo principal: café tostado profundo / madera oscura */
  --ui-surface-soft: #251e18;  /* Superficies secundarias: turba cálida / roble oscuro */
  --ui-text: #f3ebe2;          /* Texto principal: crema pergamino luminoso */
  --ui-muted: #a39487;         /* Texto secundario: arena cálida apagada */
  --ui-border: #3a3028;        /* Divisores: tierra quemada */
  --ui-accent: #e27a5d;        /* Acento principal: terracota ámbar luminosa */
  --ui-accent-hover: #ec8d72;  /* Acento hover: ámbar terracota claro */
  --ui-accent-soft: #35231a;   /* Fondo suave de acento: sombra de terracota */
}
```

### Tabla de Equivalencias y Uso:

| Variable | Rol en la Interfaz | Ejemplo de Clase Tailwind |
| :--- | :--- | :--- |
| `--ui-surface` | Fondo de página, header scrolleado, cards | `bg-[var(--ui-surface)]` |
| `--ui-surface-soft` | Bloques secundarios, calendarios, cajas de input | `bg-[var(--ui-surface-soft)]` |
| `--ui-text` | Títulos, nombres de cursos, texto principal | `text-[var(--ui-text)]` |
| `--ui-muted` | Ubicaciones, fechas, horarios, subtítulos | `text-[var(--ui-muted)]` |
| `--ui-border` | Bordes de 1px entre secciones, separadores | `border-[var(--ui-border)]` |
| `--ui-accent` | Botones de acción (CTA), badges, tags activos | `bg-[var(--ui-accent)]`, `text-[var(--ui-accent)]` |
| `--ui-accent-hover` | Estado hover de botones y enlaces principales | `hover:bg-[var(--ui-accent-hover)]` |
| `--ui-accent-soft` | Fondos de pills de categoría, chips | `bg-[var(--ui-accent-soft)]` |

---

## 3. Tipografía

Ambas fuentes se importan desde Google Fonts en `src/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet" />
```

### 1. Serif Literaria (*Playfair Display*)
* **Uso obligatorio**: Títulos principales de sección (`h1`, `h2`), títulos de cursos sobre imágenes, números de fecha en calendarios, blockquotes del manifiesto y logo de marca *"Experiencias"*.
* **Clase CSS de apoyo**:
  ```css
  .font-editorial {
    font-family: 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif;
  }
  ```
* **Regla de estilo**: Peso regular o semibold (`font-normal` o `font-semibold`). Nunca usar tracking negativo condensado (`tracking-tighter` exagerado); dejar que las curvas elegantes respiren.

### 2. Sans-serif Geométrica (*Manrope*)
* **Uso**: Cuerpo de texto, descripciones, metadatos, tablas, botones, formularios y navegación.
* **Eyebrows / Kickers (Etiquetas sobre títulos)**:
  * Mayúsculas con tracking generoso: `text-xs uppercase tracking-[0.2em] font-semibold text-[var(--ui-accent)]`.

### 3. Escala fluida y protección contra zoom en Hero Titles:
Para evitar que títulos grandes se salgan de la pantalla al hacer zoom o en laptops de baja altura:
```css
.hero-title {
  font-size: clamp(2.15rem, min(6.5vw, 7.5vh), 5rem);
  line-height: 1.08;
}

@media (max-height: 750px) {
  .hero-title {
    font-size: clamp(1.85rem, 5.5vh, 3.25rem) !important;
  }
}
```

---

## 4. Principios de Composición y Estructura

### Bordes Redondeados y Formas
* **Hero Principal**: Va a sangre (*full-bleed*, de borde a borde de la pantalla) sin border-radius externo en el contenedor general del hero.
* **Tarjetas y Cajas (Cards)**: Usan esquinas suaves y elegantes: `rounded-2xl` (1.25rem o 1rem) en tarjetas de cursos destacados, tarjetas de fechas de agenda y cajas de login/registro.
* **Badges y Chips de Categoría**: Usan `rounded-full` para un look moderno de píldora editorial.
* **Bordes**: Finos y nítidos de 1px usando `border border-[var(--ui-border)]` o separadores `border-t border-[var(--ui-border)]`.

### Grilla Asimétrica Editorial (CSS Grid)
No uses cuadrículas idénticas de 3 columnas para listas destacadas:
```css
.featured-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .featured-grid > :nth-child(1) { grid-column: span 7; aspect-ratio: 4/3; }
  .featured-grid > :nth-child(2) { grid-column: span 5; aspect-ratio: 3/4; }
  .featured-grid > :nth-child(3) { grid-column: span 4; aspect-ratio: 1/1; }
  .featured-grid > :nth-child(4) { grid-column: span 8; aspect-ratio: 16/9; }
}

@media (max-width: 767px) {
  .featured-grid { grid-template-columns: 1fr; }
  .featured-grid > * { aspect-ratio: 4/5; }
}
```

---

## 5. Micro-interacciones y Animaciones

1. **Zoom suave en fotografía (`scale-1.03`)**:
   El contenedor lleva `relative overflow-hidden group`. La imagen lleva:
   ```css
   .img-zoom {
     transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
   }
   .group:hover .img-zoom {
     transform: scale(1.03);
   }
   ```
2. **Elevación tipográfica en hover**:
   Los títulos sobre fotos suben ligeramente: `transition-transform duration-300 group-hover:-translate-y-1`.
3. **Indicadores de carrusel interactivos**:
   Un botón con hitbox cómodo de `36px` (`height: 2.25rem`) que contiene una línea de `3px` que se engrosa a `6px` en hover:
   ```css
   .carousel-nav-btn {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     height: 2.25rem;
     padding: 0 0.25rem;
     background: transparent;
     border: none;
     cursor: pointer;
   }
   .carousel-nav-line {
     display: block;
     height: 3px;
     background-color: rgba(255, 255, 255, 0.4);
     transition: height 0.25s ease, width 0.35s ease;
   }
   .carousel-nav-btn:hover .carousel-nav-line {
     height: 6px;
     background-color: rgba(255, 255, 255, 0.95);
   }
   .carousel-nav-btn.is-active .carousel-nav-line {
     background-color: var(--ui-accent);
   }
   ```

---

## 6. Iconografía Oficial (`<app-icon />`)

Utilizamos el componente de Heroicons v2 Outline (`src/app/shared/components/icon/icon.component.ts`):

```html
<app-icon name="arrow-right" sizeClass="w-4 h-4" />
```

### Iconos recomendados por contexto:
* **Navegación / Acciones**: `arrow-right`, `arrow-left`, `plus`, `x-mark`, `bars-3`
* **Metadatos de eventos**:
  * `calendar` (Fechas y programación)
  * `clock` (Duración y horarios)
  * `map-pin` (Sedes, zonas y direcciones)
  * `users` o `ticket` (Cupos disponibles y aforo)
  * `user` (Anfitrión o instructor)
* **Utilidades del sistema**:
  * `language` (Selector de idioma ES/EN)
  * `sun` / `moon` (Toggle claro / oscuro)
  * `sparkles` (Destacados, recomendados)
  * `photo` (Imágenes y galería)

---

## 7. Patrones de Botones y Header

### Botón Principal Editorial (CTA)
```html
<a
  routerLink="/catalog"
  class="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-white text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] transition-colors rounded-none"
>
  <span>Explorar experiencias</span>
  <app-icon name="arrow-right" sizeClass="w-4 h-4" />
</a>
```

### Botón Secundario Editorial
```html
<a
  routerLink="/catalog"
  class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-none text-xs uppercase tracking-widest font-semibold bg-[var(--ui-surface-soft)] text-[var(--ui-text)] border border-[var(--ui-border)] hover:bg-[var(--ui-accent)] hover:text-white hover:border-[var(--ui-accent)] transition-all"
>
  <span>Ver detalle</span>
  <app-icon name="arrow-right" sizeClass="w-3.5 h-3.5" />
</a>
```

### Header con scroll seguro (sin alterar rutas ni romper layout)
El header usa dos estados CSS directos sin depender de opacidades Tailwind complejas:
* `.home-header.is-transparent`: Sobre imágenes, texto blanco, fondo transparente.
* `.home-header.is-scrolled`: Fondo `var(--ui-surface)`, borde inferior `var(--ui-border)`, sombra suave y textos en `var(--ui-text)` y `var(--ui-muted)`.
* **Navegación dentro de página**: Usar botones con `(click)="scrollToSection('seccionId')"` en lugar de `<a href="#seccion">` para no alterar el router de Angular.

---

## 8. Prompt Copy-Paste para otra IA o Miembro del Equipo

Copia y pega el siguiente bloque a cualquier IA (ChatGPT, Claude, Gemini, Cursor) cuando te toque adaptar otra página (ej. `/catalog`, `/profile`, `/booking`):

```markdown
Por favor ajusta la vista [NOMBRE_DE_LA_PAGINA] para que siga exactamente el Sistema de Diseño Editorial del proyecto definido en DESIGN_SYSTEM.md:

1. PALETA:
- Usa exclusivamente las variables CSS existentes: var(--ui-surface), var(--ui-surface-soft), var(--ui-text), var(--ui-muted), var(--ui-border), var(--ui-accent), var(--ui-accent-hover).
- Prohibido usar morados, lilas o grises fríos. Todos los tonos son tierra cálidos (crema, café tostado, arena, terracota).

2. BORDES Y FORMAS:
- El Hero va a sangre (full-bleed) de borde a borde.
- Para cards, cajas de login/registro y tarjetas de cursos/agenda, usa esquinas redondeadas suaves y elegantes (rounded-2xl o rounded-xl).
- Para chips, pills y tags de categoría usa rounded-full.
- Bordes nítidos de 1px usando var(--ui-border).

3. TIPOGRAFÍA:
- Títulos principales en serif: clase .font-editorial ('Playfair Display', serif) con peso normal/semibold y tracking normal.
- Eyebrows/etiquetas sobre títulos: texto pequeño en mayúsculas con espaciado amplio: text-xs uppercase tracking-[0.2em] text-[var(--ui-accent)].
- Textos de lectura, botones y datos: sans-serif ('Manrope').

4. FOTOGRAFÍA Y COMPOSICIÓN:
- Fotografías dominantes con proporciones editoriales (aspect-[4/3], aspect-[3/4], aspect-[16/9]).
- Grillas asimétricas o listas horizontales con espaciado amplio.
- Micro-interacción: zoom sutil en hover (scale-1.03) dentro de overflow-hidden.

5. ICONOGRAFÍA:
- Usa el componente <app-icon name="..." sizeClass="..." /> con iconos Heroicons v2 (arrow-right, calendar, clock, map-pin, users, ticket, etc.).

6. RESTRICCIONES TÉCNICAS:
- Angular + Tailwind v4.
- No modificar servicios backend ni rutas protegidas.
- Respetar accesibilidad WCAG y soporte automático modo claro/oscuro.
```
