import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BookingService, HostIncome } from '../../core/services/booking.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  ButtonComponent,
  FormFieldComponent,
  InputDirective,
  AlertComponent,
  PageHeaderComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-host-operations',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    ButtonComponent,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="max-w-5xl mx-auto space-y-6">
    <app-page-header
      [eyebrow]="'workspace.host' | translate"
      [title]="'workspace.operations' | translate"
      [description]="'host.operationsDescription' | translate"
      ><button appButton variant="secondary" [busy]="loading()" (click)="load()">
        {{ 'ui.refresh' | translate }}
      </button></app-page-header
    >
    @if (error()) {
      <app-alert tone="error">{{ error() }}</app-alert>
    }
    <section class="ui-surface ui-panel space-y-5">
      <h2 class="ui-section-title">{{ 'income.title' | translate }}</h2>
      @for (row of income(); track row.currency) {
        <dl class="grid sm:grid-cols-3 gap-3">
          <div class="ui-stat">
            <dt>{{ 'income.gross' | translate }}</dt>
            <dd>{{ row.currency }} {{ row.gross | number: '1.2-2' }}</dd>
          </div>
          <div class="ui-stat">
            <dt>{{ 'income.fee' | translate }}</dt>
            <dd>{{ row.currency }} {{ row.platform_fee | number: '1.2-2' }}</dd>
          </div>
          <div class="ui-stat">
            <dt>{{ 'income.net' | translate }}</dt>
            <dd>{{ row.currency }} {{ row.net | number: '1.2-2' }}</dd>
          </div>
        </dl>
        <p class="ui-muted text-sm">
          {{ 'income.refunded' | translate }}: {{ row.currency }}
          {{ row.refunded | number: '1.2-2' }} · {{ 'income.pending' | translate }}:
          {{ row.currency }} {{ row.refund_pending | number: '1.2-2' }}
        </p>
      } @empty {
        <p class="ui-muted text-sm">
          {{ (loading() ? 'ui.loading' : 'income.empty') | translate }}
        </p>
      }
    </section>
    <section class="ui-surface ui-panel space-y-5">
      <h2 class="ui-section-title">{{ 'scan.title' | translate }}</h2>
      <p class="ui-muted text-sm">{{ 'scan.hint' | translate }}</p>
      <form (ngSubmit)="scan()" class="flex flex-col sm:flex-row sm:items-end gap-3">
        <app-field class="flex-1" controlId="host-entry-code" [label]="'scan.label' | translate"
          ><input
            appInput
            name="entryCode"
            [(ngModel)]="entryCode"
            required
            maxlength="4096" /></app-field
        ><button appButton type="submit" [busy]="scanning()" [disabled]="!entryCode.trim()">
          {{ 'scan.submit' | translate }}
        </button>
      </form>
      @if (scanSuccess()) {
        <app-alert tone="success">{{ scanSuccess() }}</app-alert>
      }
      @if (scanError()) {
        <app-alert tone="error">{{ scanError() }}</app-alert>
      }
    </section>
  </section>`,
})
export class HostOperationsComponent implements OnInit {
  private readonly api = inject(BookingService);
  private readonly i18n = inject(I18nService);
  readonly income = signal<HostIncome[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly scanning = signal(false);
  readonly scanSuccess = signal('');
  readonly scanError = signal('');
  entryCode = '';
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .hostIncome()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.income.set(rows),
        error: () => this.error.set(this.i18n.translate('income.error')),
      });
  }
  scan(): void {
    if (!this.entryCode.trim() || this.scanning()) return;
    this.scanning.set(true);
    this.scanSuccess.set('');
    this.scanError.set('');
    this.api
      .scanTicket(this.entryCode.trim())
      .pipe(finalize(() => this.scanning.set(false)))
      .subscribe({
        next: (ticket) => {
          this.scanSuccess.set(this.i18n.translate('scan.success') + ': ' + ticket.ticket_code);
          this.entryCode = '';
        },
        error: (err) => this.scanError.set(err.error?.detail ?? this.i18n.translate('scan.error')),
      });
  }
}
