import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CatalogComponent } from './catalog.component';

describe('Catalog server pagination', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http?.verify());

  it('requests another page and resets to page one on category selection', () => {
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/categories')).flush([]);
    http.expectOne((r) => r.url.endsWith('/catalog')).flush({ experiences: [], page: 1, page_size: 12, total: 25, total_pages: 3 });
    const component = fixture.componentInstance;
    component.changePage(2);
    const second = http.expectOne((r) => r.url.endsWith('/catalog'));
    expect(second.request.params.get('page')).toBe('2');
    second.flush({ experiences: [], page: 2, page_size: 12, total: 25, total_pages: 3 });
    component.selectCategory('category-id');
    const filtered = http.expectOne((r) => r.url.endsWith('/catalog'));
    expect(filtered.request.params.get('category_id')).toBe('category-id');
    expect(filtered.request.params.get('page')).toBe('1');
    filtered.flush({ experiences: [], page: 1, page_size: 12, total: 0, total_pages: 1 });
    fixture.destroy();
  });

  it('cancels an earlier request when modality changes', () => {
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/categories')).flush([]);
    const previous = http.expectOne((r) => r.url.endsWith('/catalog'));
    fixture.componentInstance.selectModality('VIRTUAL');
    expect(previous.cancelled).toBe(true);
    const current = http.expectOne((r) => r.url.endsWith('/catalog'));
    expect(current.request.params.get('modality')).toBe('VIRTUAL');
    current.flush({ experiences: [], page: 1, page_size: 12, total: 0, total_pages: 1 });
    fixture.destroy();
  });
});
