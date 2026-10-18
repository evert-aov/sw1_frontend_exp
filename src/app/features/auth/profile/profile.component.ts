import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { ExperienceService } from '../../../core/services/experience.service';
import { Booking, Category, User } from '../../../core/models/models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

export type ProfileTab = 'profile' | 'billing';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, TranslatePipe, IconComponent],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly experienceService = inject(ExperienceService);

  readonly activeTab = signal<ProfileTab>('profile');
  readonly showAvatarInput = signal(false);

  readonly user = signal<User | null>(this.auth.currentUser());
  readonly categories = signal<Category[]>([]);
  readonly bookings = signal<Booking[]>([]);
  readonly interests = signal<string[]>([]);

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly loadError = signal(false);

  readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.first_name.charAt(0)}${u.last_name?.charAt(0) ?? ''}`.toUpperCase();
  });

  readonly availableTopics = computed(() => {
    const fromBackend = this.categories().map((c) => c.name);
    const current = this.interests();
    return Array.from(new Set([...fromBackend, ...current]));
  });

  readonly form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: [''],
    phone: [''],
    city: [''],
    zone: [''],
    avatar_url: [''],
    bio: [''],
  });

  ngOnInit(): void {
    const cached = this.user();
    if (cached) {
      this.fillForm(cached);
    }

    this.auth.getProfile().subscribe({
      next: (u) => {
        this.user.set(u);
        this.fillForm(u);
      },
      error: () => {
        if (!this.user()) {
          this.loadError.set(true);
        }
      },
    });

    this.experienceService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([]),
    });

    this.bookingService.getMyTickets().subscribe({
      next: (items) => this.bookings.set(items),
      error: () => this.bookings.set([]),
    });
  }

  selectTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  isInterestSelected(topic: string): boolean {
    return this.interests().includes(topic);
  }

  toggleInterest(topic: string): void {
    this.interests.update((list) =>
      list.includes(topic) ? list.filter((t) => t !== topic) : [...list, topic]
    );
  }

  addCustomInterest(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.interests().includes(value)) {
      this.interests.update((list) => [...list, value]);
    }
    input.value = '';
  }

  onSaveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saved.set(false);

    this.auth
      .updateProfile({
        ...this.form.getRawValue(),
        interests: this.interests(),
      })
      .subscribe({
        next: (u) => {
          this.user.set(u);
          this.saving.set(false);
          this.saved.set(true);
        },
        error: () => {
          this.saving.set(false);
        },
      });
  }

  private fillForm(u: User): void {
    this.form.patchValue({
      first_name: u.first_name,
      last_name: u.last_name ?? '',
      phone: u.phone ?? '',
      city: u.city ?? '',
      zone: u.zone ?? '',
      avatar_url: u.avatar_url ?? '',
      bio: u.bio ?? '',
    });
    this.interests.set([...(u.interests ?? [])]);
  }
}
