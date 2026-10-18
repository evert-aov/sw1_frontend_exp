import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExperienceService } from '../../../core/services/experience.service';
import { BookingService } from '../../../core/services/booking.service';
import { MatchingService } from '../../../core/services/matching.service';
import { Experience } from '../../../core/models/models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-experience-detail',
  imports: [DatePipe, DecimalPipe, RouterModule, TranslatePipe, IconComponent],
  templateUrl: './experience-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly experienceService = inject(ExperienceService);
  private readonly bookingService = inject(BookingService);
  private readonly matchingService = inject(MatchingService);

  readonly experience = signal<Experience | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly actionMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }

    this.experienceService.getExperienceById(id).subscribe({
      next: (exp) => {
        this.experience.set(exp);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  onReserveClick(): void {
    const exp = this.experience();
    if (!exp) return;

    this.bookingService.createBooking({ experience_id: exp.id, quantity: 1 }).subscribe({
      next: (booking) => {
        this.router.navigate(['/checkout', booking.id]);
      },
      error: () => {
        this.router.navigate(['/checkout', exp.id]);
      },
    });
  }

  onJoinMatchingClick(): void {
    const exp = this.experience();
    if (!exp) return;

    this.matchingService.applyForMatching(exp.id).subscribe({
      next: () => {
        this.router.navigate(['/matching', exp.id]);
      },
      error: () => {
        this.router.navigate(['/matching', exp.id]);
      },
    });
  }
}
