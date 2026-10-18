import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <footer class="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
        <p>
          <span class="font-semibold text-indigo-600 dark:text-indigo-400">{{ 'nav.brand' | translate }}</span>
          — {{ 'layout.footer' | translate }}
        </p>
        <p>© {{ year }} {{ 'layout.rights' | translate }}</p>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  year = new Date().getFullYear();
}
