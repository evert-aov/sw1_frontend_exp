import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse exitosamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar el carrusel en la primera diapositiva', () => {
    expect(component.activeSlideIndex()).toBe(0);
  });

  it('debe permitir cambiar de diapositiva con nextSlide y prevSlide', () => {
    component.nextSlide();
    expect(component.activeSlideIndex()).toBe(1);

    component.prevSlide();
    expect(component.activeSlideIndex()).toBe(0);

    component.setSlide(2);
    expect(component.activeSlideIndex()).toBe(2);
  });

  it('debe contener los cursos destacados con imágenes y títulos', () => {
    expect(component.featuredCourses().length).toBeGreaterThanOrEqual(4);
    for (const course of component.featuredCourses()) {
      expect(course.image).toBeTruthy();
      expect(course.title).toBeTruthy();
      expect(course.category).toBeTruthy();
    }
  });

  it('debe contener las próximas fechas con cupos', () => {
    expect(component.upcomingDates().length).toBeGreaterThanOrEqual(4);
    for (const session of component.upcomingDates()) {
      expect(session.day).toBeTruthy();
      expect(session.remainingSpots).toBeGreaterThan(0);
    }
  });

  it('debe renderizar el CTA para explorar el catálogo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cta = compiled.querySelector('a[href="/catalog"]');
    expect(cta).toBeTruthy();
  });

  it('debe alternar el idioma y el tema visual al llamar a los servicios', () => {
    const initialLang = component.i18n.currentLang();
    component.i18n.toggleLanguage();
    expect(component.i18n.currentLang()).not.toBe(initialLang);

    const initialTheme = component.themeService.theme();
    component.themeService.toggleTheme();
    expect(component.themeService.theme()).not.toBe(initialTheme);
  });
});
