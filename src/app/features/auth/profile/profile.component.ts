import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

// Vista de perfil: consulta y edición de datos, biografía e intereses (CU-02 / HU-03)
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold">{{ 'profile.title' | translate }}</h1>
      <p class="mt-1 text-slate-500 dark:text-slate-400">{{ 'profile.subtitle' | translate }}</p>

      @if (loadError()) {
        <div class="mt-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {{ 'profile.loadError' | translate }}
        </div>
      }

      @if (user(); as u) {
        <div class="mt-8 grid gap-6 md:grid-cols-3">
          <!-- Tarjeta resumen -->
          <div class="md:col-span-1 self-start p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            @if (u.avatar_url) {
              <img [src]="u.avatar_url" alt="" class="w-24 h-24 mx-auto rounded-full object-cover" />
            } @else {
              <div class="w-24 h-24 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold">
                {{ initials(u) }}
              </div>
            }
            <h2 class="mt-4 text-xl font-semibold">{{ u.first_name }} {{ u.last_name }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 break-all">{{ u.email }}</p>
            <div class="mt-3 flex flex-wrap justify-center gap-2">
              @for (role of u.roles; track role) {
                <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {{ 'role.' + role | translate }}
                </span>
              }
            </div>
            <p class="mt-4 text-xs text-slate-400">{{ 'profile.memberSince' | translate }} {{ u.created_at | date: 'mediumDate' }}</p>
          </div>

          <!-- Formulario de edición -->
          <form [formGroup]="form" (ngSubmit)="onSaveProfile()"
            class="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 class="text-lg font-semibold">{{ 'profile.edit' | translate }}</h3>

            @if (saved()) {
              <div class="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-700 dark:text-emerald-300">
                {{ 'profile.saved' | translate }}
              </div>
            }

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="first_name" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'auth.register.firstName' | translate }}</label>
                <input id="first_name" formControlName="first_name" [class]="inputClass" />
              </div>
              <div>
                <label for="last_name" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'auth.register.lastName' | translate }}</label>
                <input id="last_name" formControlName="last_name" [class]="inputClass" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="phone" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'auth.register.phone' | translate }}</label>
                <input id="phone" type="tel" formControlName="phone" [class]="inputClass" />
              </div>
              <div>
                <label for="avatar_url" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'profile.avatarUrl' | translate }}</label>
                <input id="avatar_url" type="url" formControlName="avatar_url" placeholder="https://..." [class]="inputClass" />
              </div>
            </div>

            <div>
              <label for="bio" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'profile.bio' | translate }}</label>
              <textarea id="bio" rows="3" formControlName="bio" [placeholder]="'profile.bioPlaceholder' | translate" [class]="inputClass"></textarea>
            </div>

            <!-- Intereses como etiquetas -->
            <div>
              <label for="interest" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'profile.interests' | translate }}</label>
              <p class="text-xs text-slate-400">{{ 'profile.interestsHint' | translate }}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (tag of interests(); track tag) {
                  <span class="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 text-sm rounded-full bg-slate-100 dark:bg-slate-800">
                    {{ tag }}
                    <button type="button" (click)="removeInterest(tag)" class="w-5 h-5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer" aria-label="Remove">×</button>
                  </span>
                } @empty {
                  <span class="text-sm text-slate-400">{{ 'profile.noInterests' | translate }}</span>
                }
              </div>
              <input id="interest" #interestInput (keydown.enter)="addInterest(interestInput); $event.preventDefault()"
                [placeholder]="'profile.addInterest' | translate" [class]="inputClass" />
            </div>

            <div class="flex justify-end">
              <button type="submit" [disabled]="saving() || form.invalid"
                class="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold shadow-sm transition-colors cursor-pointer">
                {{ (saving() ? 'profile.saving' : 'common.save') | translate }}
              </button>
            </div>
          </form>
        </div>
      } @else if (!loadError()) {
        <p class="mt-8 text-slate-500">{{ 'common.loading' | translate }}</p>
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  // Se muestra lo guardado en sesión mientras llega la versión actualizada del backend
  user = signal<User | null>(this.auth.currentUser());
  interests = signal<string[]>([]);
  saving = signal(false);
  saved = signal(false);
  loadError = signal(false);

  inputClass =
    'mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: [''],
    phone: [''],
    avatar_url: [''],
    bio: [''],
  });

  ngOnInit(): void {
    const cached = this.user();
    if (cached) this.fillForm(cached);

    this.auth.getProfile().subscribe({
      next: (u) => {
        this.user.set(u);
        this.fillForm(u);
      },
      error: () => this.loadError.set(true),
    });
  }

  initials(u: User): string {
    return `${u.first_name.charAt(0)}${u.last_name?.charAt(0) ?? ''}`.toUpperCase();
  }

  addInterest(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.interests().includes(value)) {
      this.interests.update((list) => [...list, value]);
    }
    input.value = '';
  }

  removeInterest(tag: string): void {
    this.interests.update((list) => list.filter((t) => t !== tag));
  }

  onSaveProfile(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saved.set(false);

    this.auth.updateProfile({ ...this.form.getRawValue(), interests: this.interests() }).subscribe({
      next: (u) => {
        this.user.set(u);
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => this.saving.set(false),
    });
  }

  private fillForm(u: User): void {
    this.form.patchValue({
      first_name: u.first_name,
      last_name: u.last_name ?? '',
      phone: u.phone ?? '',
      avatar_url: u.avatar_url ?? '',
      bio: u.bio ?? '',
    });
    this.interests.set([...u.interests]);
  }
}
