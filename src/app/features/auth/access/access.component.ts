import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ButtonComponent, EmptyStateComponent } from '../../../shared/ui';

@Component({
  selector: 'app-access',
  imports: [TranslatePipe, ButtonComponent, EmptyStateComponent],
  template: `<app-empty-state
    icon="shield-check"
    [title]="'access.title' | translate"
    [description]="'access.description' | translate"
    ><button appButton [busy]="busy()" (click)="retry()">{{ 'ui.retry' | translate }}</button
    ><button appButton variant="secondary" (click)="auth.logout()">
      {{ 'nav.logout' | translate }}
    </button></app-empty-state
  >`,
})
export class AccessComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  retry(): void {
    this.busy.set(true);
    this.auth.getProfile().subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigateByUrl(this.auth.homeRoute());
      },
      error: () => this.busy.set(false),
    });
  }
}
