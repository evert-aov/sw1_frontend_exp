import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ButtonComponent } from './button';
import { IconComponent } from '../components/icon/icon.component';

let dialogSequence = 0;

/** El dialog nativo mantiene el foco dentro y lo devuelve al disparador al cerrar. */
@Component({
  selector: 'app-dialog',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dialog
    #dialog
    class="ui-dialog"
    [attr.aria-labelledby]="titleId"
    (cancel)="$event.preventDefault(); closed.emit()"
    (click)="onBackdrop($event)"
  >
    <div class="ui-modal space-y-5">
      <div class="flex items-center justify-between gap-3">
        <h2 [id]="titleId" class="ui-section-title">{{ title() }}</h2>
        <button
          appButton
          variant="ghost"
          size="icon"
          (click)="closed.emit()"
          [attr.aria-label]="closeLabel()"
          autofocus
        >
          <app-icon name="x-mark" sizeClass="w-5 h-5" />
        </button>
      </div>
      <ng-content />
    </div>
  </dialog>`,
})
export class DialogComponent implements OnDestroy {
  readonly title = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly returnFocus = input<HTMLElement | null>(null);
  readonly closed = output<void>();
  readonly titleId = `ui-dialog-${++dialogSequence}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }
  onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.closed.emit();
  }
  ngOnDestroy(): void {
    this.dialog().nativeElement.close();
    const target = this.returnFocus();
    if (target?.isConnected) target.focus();
  }
}
