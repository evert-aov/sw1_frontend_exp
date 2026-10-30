import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ExperienceService } from './experience.service';
import { AdminService } from './admin.service';

describe('Contratos de gestión por rol', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('consulta lugares propios y no el directorio público al configurar o publicar', () => {
    TestBed.inject(ExperienceService).getMyVenues().subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/venues/me/owned'));
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
  it('elimina por la ruta protegida y no usa la cancelación como borrado', () => {
    TestBed.inject(ExperienceService).deleteExperience('experience').subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/experiences/experience'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
  it('permite seleccionar varios roles y conserva la identidad solo en la ruta', () => {
    TestBed.inject(AdminService).assignRoles('user', ['HOST', 'ATTENDEE']).subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/admin/users/user/roles'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ roles: ['HOST', 'ATTENDEE'] });
    request.flush({});
  });
});
