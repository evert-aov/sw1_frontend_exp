import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ExperienceService } from '../../core/services/experience.service';
import { ThemeService } from '../../core/services/theme.service';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService } from '../../core/services/auth.service';
import { Experience } from '../../core/models/experience.model';

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
  duration: string;
  price: string;
}

export interface HomeCourseItem {
  id: string;
  title: string;
  category: string;
  image: string;
  venue: string;
  price: string;
  duration: string;
}

export interface HomeDateItem {
  id: string;
  day: string;
  month: string;
  weekday: string;
  time: string;
  title: string;
  category: string;
  venue: string;
  remainingSpots: number;
  totalSpots: number;
  price: string;
}

const FALLBACK_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=2000&q=85',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=2000&q=85',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=2000&q=85',
  'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=2000&q=85',
];

const FALLBACK_COURSE_IMAGES = [
  'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=85',
];

function parseEventDate(isoString?: string): {
  day: string;
  month: string;
  weekday: string;
  time: string;
} {
  if (!isoString) {
    return { day: '28', month: 'NOV', weekday: 'Sábado', time: '10:00' };
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return { day: '28', month: 'NOV', weekday: 'Sábado', time: '10:00' };
  }
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const weekday = weekdays[date.getDay()];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return { day, month, weekday, time: `${hours}:${minutes}` };
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly experienceService = inject(ExperienceService);
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly isScrolled = signal(false);
  readonly activeSlideIndex = signal(0);
  private autoplayTimer?: ReturnType<typeof setInterval>;

  readonly heroSlides: HeroSlide[] = [
    {
      id: 'pottery',
      eyebrow: 'Cerámica & Fuego · Edición No. 04',
      title: 'El arte de dar forma al barro y detener el tiempo',
      subtitle:
        'Taller de torno alfarero y quemado de gres. Práctica meditativa guiada por maestros ceramistas en un entorno de luz natural.',
      image: FALLBACK_HERO_IMAGES[0],
      category: 'Artesanía',
      duration: '2 jornadas (10h)',
      price: 'Bs. 380',
    },
    {
      id: 'coffee',
      eyebrow: 'Laboratorio Sensorial · Orígenes Yungas',
      title: 'Alquimia del grano: cata sensorial y métodos de extracción',
      subtitle:
        'Calibración de tueste, perfiles organolépticos y química del agua junto a baristas certificados de café de altura.',
      image: FALLBACK_HERO_IMAGES[1],
      category: 'Gastronomía',
      duration: '4 horas',
      price: 'Bs. 220',
    },
    {
      id: 'photo',
      eyebrow: 'Artes Visuales · Laboratorio Químico',
      title: 'Luz, grano y emulsión: fotografía analógica en 35mm',
      subtitle:
        'Desde el disparo con cámara mecánica hasta el revelado manual en cubeta y copiado en papel baritado.',
      image: FALLBACK_HERO_IMAGES[2],
      category: 'Fotografía',
      duration: 'Fin de semana',
      price: 'Bs. 340',
    },
    {
      id: 'botanical',
      eyebrow: 'Tinturas Naturales · Flora Andina',
      title: 'Acuarela botánica con pigmentos de cochinilla y molle',
      subtitle:
        'Extracción de tintes vivos, molienda de tierras andinas e ilustración botánica sobre papel de algodón hecho a mano.',
      image: FALLBACK_HERO_IMAGES[3],
      category: 'Artes Plásticas',
      duration: '5 horas',
      price: 'Bs. 290',
    },
  ];

  readonly featuredCourses = signal<HomeCourseItem[]>([
    {
      id: 'fallback-1',
      title: 'Torno Alfarero y Esmaltes de Ceniza Mineral',
      category: 'Cerámica',
      image: FALLBACK_COURSE_IMAGES[0],
      venue: 'Estudio Barro Vivo · San Miguel',
      price: 'Bs. 380',
      duration: '8 horas',
    },
    {
      id: 'fallback-2',
      title: 'Tueste Artesanal y Calibración de Filtrados',
      category: 'Café de Especialidad',
      image: FALLBACK_COURSE_IMAGES[1],
      venue: 'Tostaduría Illimani · Sopocachi',
      price: 'Bs. 250',
      duration: '4 horas',
    },
    {
      id: 'fallback-3',
      title: 'Retrato con Luz Natural y Revelado en Cuarto Oscuro',
      category: 'Fotografía',
      image: FALLBACK_COURSE_IMAGES[2],
      venue: 'Cuarto Oscuro · Centro Histórico',
      price: 'Bs. 320',
      duration: '6 horas',
    },
    {
      id: 'fallback-4',
      title: 'Pintura Botánica con Pigmentos Minerales del Altiplano',
      category: 'Artes Plásticas',
      image: FALLBACK_COURSE_IMAGES[3],
      venue: 'Invernadero · Cota Cota',
      price: 'Bs. 290',
      duration: '5 horas',
    },
  ]);

  readonly upcomingDates = signal<HomeDateItem[]>([
    {
      id: 'date-1',
      day: '28',
      month: 'NOV',
      weekday: 'Jueves',
      time: '17:30',
      title: 'Cata Sensorial: Geisha y Typica de Caranavi',
      category: 'Café de Especialidad',
      venue: 'Laboratorio de Café · San Miguel',
      remainingSpots: 3,
      totalSpots: 10,
      price: 'Bs. 190',
    },
    {
      id: 'date-2',
      day: '30',
      month: 'NOV',
      weekday: 'Sábado',
      time: '09:30',
      title: 'Iniciación al Torno: Cilindros y Formas Básicas',
      category: 'Cerámica',
      venue: 'Taller Barro Vivo · Sopocachi',
      remainingSpots: 2,
      totalSpots: 8,
      price: 'Bs. 320',
    },
    {
      id: 'date-3',
      day: '05',
      month: 'DIC',
      weekday: 'Jueves',
      time: '18:00',
      title: 'Química del Revelado: Del Rollo al Positivo',
      category: 'Fotografía',
      venue: 'Cuarto Oscuro Central · Centro Histórico',
      remainingSpots: 4,
      totalSpots: 6,
      price: 'Bs. 280',
    },
    {
      id: 'date-4',
      day: '07',
      month: 'DIC',
      weekday: 'Sábado',
      time: '10:00',
      title: 'Tintes Naturales: Cochinilla, Molle y Añil',
      category: 'Artes Plásticas',
      venue: 'Invernadero Botánico · Cota Cota',
      remainingSpots: 5,
      totalSpots: 12,
      price: 'Bs. 270',
    },
  ]);

  ngOnInit(): void {
    this.startAutoplay();
    this.loadCatalogData();
    this.setupScrollDetection();

    this.destroyRef.onDestroy(() => {
      this.stopAutoplay();
    });
  }

  scrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private setupScrollDetection(): void {
    if (typeof window === 'undefined') return;

    const evaluateScroll = () => {
      const mainEl = document.querySelector('main');
      const mainScroll = mainEl ? mainEl.scrollTop : 0;
      const winScroll = window.scrollY || document.documentElement.scrollTop || 0;
      const scrolled = winScroll > 30 || mainScroll > 30;
      if (this.isScrolled() !== scrolled) {
        this.isScrolled.set(scrolled);
      }
    };

    // 1. Captura eventos de scroll globales (incluyendo los que ocurren dentro del <main>)
    window.addEventListener('scroll', evaluateScroll, { passive: true, capture: true });

    // 2. Observer para cuando el centinela superior del hero sale de la pantalla
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            // Si el centinela ya no es visible, hemos scrolleado
            this.isScrolled.set(!entry.isIntersecting);
          }
        },
        { threshold: 0.1 },
      );

      setTimeout(() => {
        const sentinel = document.getElementById('heroTopSentinel');
        if (sentinel) {
          observer.observe(sentinel);
        }
      }, 100);

      this.destroyRef.onDestroy(() => observer.disconnect());
    }

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', evaluateScroll, true);
    });

    // Evaluación inicial
    evaluateScroll();
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }

  setSlide(index: number): void {
    this.activeSlideIndex.set(index);
    this.startAutoplay();
  }

  nextSlide(): void {
    this.activeSlideIndex.update((curr) => (curr + 1) % this.heroSlides.length);
  }

  prevSlide(): void {
    this.activeSlideIndex.update(
      (curr) => (curr - 1 + this.heroSlides.length) % this.heroSlides.length,
    );
  }

  private loadCatalogData(): void {
    this.experienceService
      .getCatalog({ page_size: 12 })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        const experiences = result?.experiences ?? [];
        if (!experiences || experiences.length === 0) return;

        // 1. Asignar cursos destacados con datos reales del catálogo
        const mappedCourses: HomeCourseItem[] = experiences.slice(0, 4).map((exp, idx) => ({
          id: exp.id,
          title: exp.title,
          category: exp.category_name || 'Taller',
          image: exp.cover_image_url?.trim() || FALLBACK_COURSE_IMAGES[idx % FALLBACK_COURSE_IMAGES.length],
          venue: exp.venue_zone || exp.venue_name || 'La Paz',
          price: exp.price ? `Bs. ${exp.price}` : 'Consultar',
          duration: exp.duration_minutes ? `${exp.duration_minutes} min` : '2 horas',
        }));
        this.featuredCourses.set(mappedCourses);

        // 2. Asignar próximas fechas con datos reales del catálogo
        const mappedDates: HomeDateItem[] = experiences.slice(0, 4).map((exp, idx) => {
          const parsed = parseEventDate(exp.event_date);
          const remaining = Math.max(1, (exp.max_capacity || 10) - (exp.reserved_slots || 0));
          return {
            id: exp.id,
            day: parsed.day,
            month: parsed.month,
            weekday: parsed.weekday,
            time: parsed.time,
            title: exp.title,
            category: exp.category_name || 'Experiencia',
            venue: exp.venue_name || exp.venue_zone || 'Sede asignada',
            remainingSpots: remaining,
            totalSpots: exp.max_capacity || 10,
            price: exp.price ? `Bs. ${exp.price}` : 'Consultar',
          };
        });
        this.upcomingDates.set(mappedDates);
      });
  }
}
