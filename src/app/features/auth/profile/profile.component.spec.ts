import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { ExperienceService } from '../../../core/services/experience.service';
import { I18nService } from '../../../core/services/i18n.service';
import { translations } from '../../../core/i18n/translations';
import { uiTranslations } from '../../../core/i18n/ui.translations';

describe('Perfil, idioma y mensajes de formulario', () => {
  const user = {
    id: 'user',
    first_name: 'Ana',
    last_name: 'Pérez',
    email: 'ana@example.test',
    roles: ['ATTENDEE'],
    created_at: '2026-01-01T00:00:00Z',
    interests: ['Jazz'],
  };
  const setup = async (roles = ['ATTENDEE']) => {
    const updateProfile = vi.fn(() => throwError(() => new Error('network')));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ ...user, roles }),
            getProfile: () => of({ ...user, roles }),
            isAttendee: () => roles.includes('ATTENDEE'),
            isHost: () => roles.includes('HOST'),
            updateProfile,
          },
        },
        { provide: BookingService, useValue: { getMyTickets: () => of([]) } },
        { provide: ExperienceService, useValue: { getCategories: () => of([]) } },
      ],
    });
    const fixture = TestBed.createComponent(ProfileComponent);
    const i18n = TestBed.inject(I18nService);
    i18n.setLanguage('es');
    await fixture.whenStable();
    return { fixture, i18n, updateProfile };
  };

  it('cambia todo el perfil a inglés sin mostrar claves sin traducir', async () => {
    const { fixture, i18n } = await setup();
    expect(fixture.nativeElement.textContent).toContain('Guardar perfil');
    expect(fixture.nativeElement.textContent).toContain('Asistente');
    i18n.setLanguage('en');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Save profile');
    expect(fixture.nativeElement.textContent).toContain('Attendee');
    expect(fixture.nativeElement.textContent).not.toMatch(/(?:profile|role|auth|ui)\.[\w.]+/);
    expect(document.documentElement.lang).toBe('en');
  });

  it('muestra la validación y el fallo del servidor sin anunciar guardado exitoso', async () => {
    const { fixture, updateProfile } = await setup();
    fixture.componentInstance.form.controls.first_name.setValue('');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#first_name-error').textContent).toContain(
      'obligatorio',
    );
    expect(updateProfile).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls.first_name.setValue('Ana');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron guardar');
    expect(fixture.nativeElement.textContent).not.toContain('Perfil actualizado correctamente');
  });

  it('mantiene los textos compartidos en ambos idiomas, incluidos estados y roles', () => {
    expect(Object.keys(uiTranslations.es).sort()).toEqual(Object.keys(uiTranslations.en).sort());
    for (const lang of ['es', 'en'] as const) {
      for (const key of Object.keys(uiTranslations[lang]))
        expect(translations[lang][key]?.trim(), `${lang}:${key}`).toBeTruthy();
      for (const role of ['ATTENDEE', 'HOST', 'VENUE', 'ADMIN'])
        expect(translations[lang]['role.' + role]).toBeTruthy();
    }
  });

  it('no muestra ni consulta reservas de asistente en el perfil de un HOST', async () => {
    const { fixture } = await setup(['HOST']);
    expect(fixture.nativeElement.textContent).not.toContain('Mis reservas y compras');
    expect(fixture.nativeElement.querySelector('[formControlName="city"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="zone"]')).toBeNull();
    const api = TestBed.inject(BookingService);
    const spy = vi.spyOn(api, 'getMyTickets');
    fixture.componentInstance.ngOnInit();
    expect(spy).not.toHaveBeenCalled();
  });
});
