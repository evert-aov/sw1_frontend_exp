import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ButtonComponent, ButtonLinkDirective } from '../../../shared/ui/button';
import {
  AlertComponent,
  PageHeaderComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
} from '../../../shared/ui/feedback';
import { DialogComponent } from '../../../shared/ui/dialog';
import { I18nService } from '../../../core/services/i18n.service';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BookingService } from '../../../core/services/booking.service';
import { Booking, Ticket } from '../../../core/models/booking.model';

/** Historial propio, estados de devolución y QR generado por la API autorizada. */
@Component({
  selector: 'app-my-tickets',
  imports: [
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    ButtonLinkDirective,
    AlertComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    DialogComponent,
    DatePipe,
    DecimalPipe,
    RouterLink,
  ],
  templateUrl: './my-tickets.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTicketsComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private readonly api = inject(BookingService);
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filter = signal<'all' | 'upcoming' | 'past'>('all');
  readonly selected = signal<Ticket | null>(null);
  qrTrigger: HTMLElement | null = null;
  readonly qrUrl = signal('');
  readonly qrLoading = signal(false);
  readonly refundBusy = signal('');
  readonly visible = computed(() =>
    this.bookings().filter((item) => {
      const future = !!item.event_date && new Date(item.event_date).getTime() > Date.now();
      return this.filter() === 'all' || (this.filter() === 'upcoming' ? future : !future);
    }),
  );

  ngOnInit(): void {
    this.load();
  }
  ngOnDestroy(): void {
    this.closeQR();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getMyTickets()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.bookings.set(items),
        error: (err) =>
          this.error.set(err.error?.detail ?? this.i18n.translate('tickets.loadError')),
      });
  }

  onShowTicketQR(ticket: Ticket, event?: Event): void {
    if (this.qrLoading()) return;
    this.closeQR();
    this.selected.set(ticket);
    this.qrLoading.set(true);
    this.error.set('');
    this.qrTrigger = event?.currentTarget as HTMLElement | null;
    this.api
      .getTicketQR(ticket.id)
      .pipe(finalize(() => this.qrLoading.set(false)))
      .subscribe({
        next: (blob) => {
          if (this.selected()?.id === ticket.id) this.qrUrl.set(URL.createObjectURL(blob));
        },
        error: (err) => {
          this.closeQR();
          this.error.set(this.i18n.translate('tickets.qrError'));
        },
      });
  }

  closeQR(): void {
    if (this.qrUrl()) URL.revokeObjectURL(this.qrUrl());
    this.qrUrl.set('');
    this.selected.set(null);
  }

  canRefund(item: Booking): boolean {
    return (
      item.status === 'PAID' &&
      item.total_amount > 0 &&
      !item.refund_status &&
      !!item.event_date &&
      new Date(item.event_date).getTime() > Date.now() &&
      !item.tickets.some((ticket) => ticket.is_used)
    );
  }

  refund(item: Booking): void {
    if (this.refundBusy() || !this.canRefund(item)) return;
    if (!window.confirm(this.i18n.translate('tickets.refundConfirm'))) return;
    this.refundBusy.set(item.id);
    this.error.set('');
    this.api
      .refund(item.id)
      .pipe(finalize(() => this.refundBusy.set('')))
      .subscribe({
        next: (updated) =>
          this.bookings.update((items) =>
            items.map((value) => (value.id === updated.id ? updated : value)),
          ),
        error: (err) => {
          this.error.set(err.error?.detail ?? this.i18n.translate('tickets.refundError'));
        },
      });
  }
}
