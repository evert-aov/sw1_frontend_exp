import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { User } from '../../core/models/user.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  ButtonComponent,
  AlertComponent,
  PageHeaderComponent,
  EmptyStateComponent,
  DialogComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    ButtonComponent,
    AlertComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    DialogComponent,
  ],
  template: `<section class="max-w-5xl mx-auto space-y-6">
    <app-page-header
      [eyebrow]="'workspace.platform' | translate"
      [title]="'admin.usersTitle' | translate"
      [description]="'admin.usersDescription' | translate"
      ><button appButton variant="secondary" [busy]="loading()" (click)="load()">
        {{ 'ui.refresh' | translate }}
      </button></app-page-header
    >
    @if (error()) {
      <app-alert tone="error">{{ error() }}</app-alert>
    }
    @if (saved()) {
      <app-alert tone="success">{{ 'admin.rolesSaved' | translate }}</app-alert>
    }
    @for (item of items(); track item.id) {
      <article class="ui-surface p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="font-semibold">{{ item.first_name }} {{ item.last_name }}</h2>
          <p class="ui-muted text-sm mt-1 break-all">{{ item.email }}</p>
          <div class="flex flex-wrap gap-2 mt-3">
            @for (role of item.roles; track role) {
              <span class="ui-badge">{{ 'role.' + role | translate }}</span>
            }
          </div>
        </div>
        <button appButton variant="secondary" size="sm" (click)="edit(item, $event)">
          {{ 'admin.editRoles' | translate }}
        </button>
      </article>
    } @empty {
      <app-empty-state
        icon="users"
        [title]="(loading() ? 'ui.loading' : 'admin.noUsers') | translate"
      />
    }
    <nav class="ui-actions justify-between">
      <button appButton variant="secondary" [disabled]="!offset || loading()" (click)="page(-1)">
        {{ 'ui.previous' | translate }}</button
      ><button
        appButton
        variant="secondary"
        [disabled]="items().length < 25 || loading()"
        (click)="page(1)"
      >
        {{ 'ui.next' | translate }}
      </button>
    </nav>
    @if (editing(); as user) {
      <app-dialog
        [title]="'admin.editRoles' | translate"
        [closeLabel]="'ui.close' | translate"
        [returnFocus]="trigger"
        (closed)="!busy() && editing.set(null)"
      >
        <p class="font-semibold">{{ user.first_name }} {{ user.last_name }}</p>
        <p class="ui-muted text-sm">{{ 'admin.rolesHint' | translate }}</p>
        <fieldset class="space-y-3" [disabled]="busy()">
          <legend class="sr-only">{{ 'admin.editRoles' | translate }}</legend>
          @for (role of roleOptions; track role) {
            <label class="flex items-center gap-3 ui-surface p-3 cursor-pointer"
              ><input
                type="checkbox"
                class="w-4 h-4 accent-violet-600"
                [checked]="selection().includes(role)"
                [disabled]="user.id === auth.currentUser()?.id && role === 'ADMIN'"
                (change)="toggle(role)"
              />{{ 'role.' + role | translate }}</label
            >
          }
          @if (user.roles.includes('VENUE')) {
            <label class="flex items-center gap-3 ui-surface p-3 cursor-pointer"
              ><input
                type="checkbox"
                class="w-4 h-4 accent-violet-600"
                [checked]="selection().includes('VENUE')"
                (change)="toggle('VENUE')"
              />{{ 'role.VENUE' | translate }}</label
            >
          }
        </fieldset>
        @if (roleError()) {
          <app-alert tone="error">{{ roleError() }}</app-alert>
        }
        <div class="ui-actions">
          <button appButton [busy]="busy()" [disabled]="!selection().length" (click)="save()">
            {{ 'common.save' | translate }}</button
          ><button appButton variant="secondary" [disabled]="busy()" (click)="editing.set(null)">
            {{ 'common.cancel' | translate }}
          </button>
        </div>
      </app-dialog>
    }
  </section>`,
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly items = signal<User[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly roleError = signal('');
  readonly saved = signal(false);
  readonly editing = signal<User | null>(null);
  readonly selection = signal<string[]>([]);
  readonly roleOptions = ['ATTENDEE', 'HOST', 'ADMIN'];
  trigger: HTMLElement | null = null;
  offset = 0;
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .users(this.offset)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => this.error.set(this.i18n.translate('admin.loadError')),
      });
  }
  page(direction: number): void {
    this.offset = Math.max(0, this.offset + 25 * direction);
    this.load();
  }
  edit(user: User, event: Event): void {
    this.trigger = event.currentTarget as HTMLElement;
    this.selection.set([...user.roles]);
    this.editing.set(user);
    this.roleError.set('');
    this.saved.set(false);
  }
  toggle(role: string): void {
    this.selection.update((items) =>
      items.includes(role) ? items.filter((item) => item !== role) : [...items, role],
    );
  }
  save(): void {
    const user = this.editing();
    if (!user || !this.selection().length || this.busy()) return;
    this.busy.set(true);
    this.roleError.set('');
    this.api
      .assignRoles(user.id, this.selection())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.items.update((items) =>
            items.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.editing.set(null);
          this.saved.set(true);
          if (updated.id === this.auth.currentUser()?.id)
            this.auth
              .getProfile()
              .subscribe({ error: () => this.error.set(this.i18n.translate('admin.loadError')) });
        },
        error: (err) =>
          this.roleError.set(err.error?.detail ?? this.i18n.translate('admin.saveError')),
      });
  }
}
