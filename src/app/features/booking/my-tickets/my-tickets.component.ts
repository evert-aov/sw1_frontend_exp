import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { Booking } from '../../../core/models/booking.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { EventSkeletonComponent } from '../../../shared/components/event-skeleton/event-skeleton.component';

/**
 * Componente de Mis Entradas y Reservas (CU-06).
 *
 * Muestra el listado de tickets adquiridos por el usuario con:
 * - Carga asíncrona respaldada por skeleton loaders para rendimiento percibido.
 * - Despliegue de estado de confirmación y fecha del evento.
 * - Acceso a código QR digital para control de acceso en puerta.
 */
@Component({
  selector: 'app-my-tickets',
  imports: [DatePipe, DecimalPipe, RouterModule, TranslatePipe, IconComponent, EventSkeletonComponent],
  templateUrl: './my-tickets.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTicketsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  readonly auth = inject(AuthService);

  /** Reservas y tickets adquiridos */
  readonly bookings = signal<Booking[]>([]);

  /** Estado de carga mientras se consulta la API */
  readonly loading = signal<boolean>(true);

  /**
   * Ciclo de vida inicial: carga las entradas del usuario autenticado actual.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.loading.set(false);
      return;
    }

    this.bookingService.getMyTickets().subscribe({
      next: (items) => {
        this.bookings.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.bookings.set([]);
        this.loading.set(false);
      },
    });
  }

  /**
   * Despliega el modal con el código QR digital de la entrada para validación en puerta.
   *
   * @param {number} ticketId - Identificador único del ticket o reserva.
   * @returns {void}
   */
  onShowTicketQR(ticketId: number): void {
    // Despliega código QR de acceso digital
  }
}
