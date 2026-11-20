import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserGuideService } from './user-guide.service';
import {
  GUIDE_TOPICS,
  GUIDE_TOUR_STEPS,
  GuideMessage,
  GuideQuickAction,
  GuideTopic,
  GuideTourStep,
  getWelcomeMessage,
  resolveGuideQuery,
} from './user-guide.knowledge';

@Component({
  selector: 'app-user-guide-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TranslatePipe],
  templateUrl: './user-guide-chatbot.component.html',
  styleUrls: ['./user-guide-chatbot.component.css'],
})
export class UserGuideChatbotComponent {
  readonly guideService = inject(UserGuideService);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('chatScrollContainer') chatScrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('topicsContainer') topicsContainer?: ElementRef<HTMLDivElement>;

  // Estado UI de la ventana
  readonly isExpanded = signal<boolean>(false);
  readonly isTyping = signal<boolean>(false);
  readonly userInput = signal<string>('');
  readonly copiedSnippetId = signal<string | null>(null);

  // Estado del Tour Guiado
  readonly isTourActive = signal<boolean>(false);
  readonly currentTourStepIndex = signal<number>(0);

  // Mensajes de la conversación
  readonly conversationMessages = signal<GuideMessage[]>([]);

  // Posición y arrastre del botón flotante
  private readonly POS_KEY = 'experiencia_user_guide_pos';
  readonly launcherPosX = signal<number>(0);
  readonly launcherPosY = signal<number>(0);
  readonly isDragging = signal<boolean>(false);
  private dragStartX = 0;
  private dragStartY = 0;
  private initialPosX = 0;
  private initialPosY = 0;
  private dragMoved = false;

  // Derivados reactivos
  readonly currentTourSteps = computed<GuideTourStep[]>(
    () => GUIDE_TOUR_STEPS[this.i18n.currentLang()],
  );
  readonly currentTourStep = computed<GuideTourStep | null>(() => {
    const steps = this.currentTourSteps();
    const idx = this.currentTourStepIndex();
    return steps[idx] ?? null;
  });
  readonly quickTopics = computed<GuideTopic[]>(() => GUIDE_TOPICS[this.i18n.currentLang()]);

  readonly roleBadgeKey = computed<string>(() => {
    switch (this.auth.currentRole()) {
      case 'HOST':
        return 'guide.roleHost';
      case 'ADMIN':
        return 'guide.roleAdmin';
      case 'ATTENDEE':
        return 'guide.roleAttendee';
      default:
        return 'guide.roleGuest';
    }
  });

  // Seguimiento para evitar recrear la bienvenida sin cambios reales
  private lastWelcomeSignature = '';

  constructor() {
    this.initLauncherPosition();
    this.initWelcomeMessage();

    // Re-sincroniza bienvenida solo cuando cambia el idioma, rol o nombre (sin bucle reactivo)
    effect(() => {
      const lang = this.i18n.currentLang();
      const role = this.auth.currentRole();
      const name = this.auth.userFullName();
      const signature = `${lang}|${role}|${name}`;

      if (signature === this.lastWelcomeSignature) return;
      this.lastWelcomeSignature = signature;

      const msgs = untracked(() => this.conversationMessages());
      if (msgs.length === 1 && msgs[0].id.startsWith('welcome-')) {
        this.conversationMessages.set([getWelcomeMessage(lang, role, name)]);
      }
    });

    // Auto-scroll al fondo cuando llegan nuevos mensajes o aparece indicador de escritura
    effect(() => {
      this.conversationMessages();
      this.isTyping();
      this.scrollToBottom();
    });
  }

  // ==================== POSICIÓN Y ARRASTRE DEL LANZADOR ====================

  private initLauncherPosition(): void {
    if (typeof window === 'undefined') return;
    const defaultX = Math.max(16, window.innerWidth - 82);
    const defaultY = Math.max(16, window.innerHeight - 86);

    try {
      const saved = localStorage.getItem(this.POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { x?: number; y?: number };
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          this.launcherPosX.set(this.clampX(parsed.x));
          this.launcherPosY.set(this.clampY(parsed.y));
          return;
        }
      }
    } catch {
      // Ignorar datos corruptos
    }

    this.launcherPosX.set(defaultX);
    this.launcherPosY.set(defaultY);
  }

  private clampX(x: number): number {
    if (typeof window === 'undefined') return x;
    return Math.min(Math.max(12, x), Math.max(12, window.innerWidth - 72));
  }

  private clampY(y: number): number {
    if (typeof window === 'undefined') return y;
    return Math.min(Math.max(12, y), Math.max(12, window.innerHeight - 72));
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.launcherPosX.set(this.clampX(this.launcherPosX()));
    this.launcherPosY.set(this.clampY(this.launcherPosY()));
  }

  onLauncherMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.startDrag(event.clientX, event.clientY);
  }

  onLauncherTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
  }

  private startDrag(clientX: number, clientY: number): void {
    this.isDragging.set(true);
    this.dragMoved = false;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.initialPosX = this.launcherPosX();
    this.initialPosY = this.launcherPosY();
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (!this.isDragging()) return;
    this.updateDrag(event.clientX, event.clientY);
  }

  @HostListener('window:touchmove', ['$event'])
  onWindowTouchMove(event: TouchEvent): void {
    if (!this.isDragging() || event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.updateDrag(touch.clientX, touch.clientY);
  }

  private updateDrag(clientX: number, clientY: number): void {
    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this.dragMoved = true;
    }
    this.launcherPosX.set(this.clampX(this.initialPosX + dx));
    this.launcherPosY.set(this.clampY(this.initialPosY + dy));
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onDragEnd(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    if (this.dragMoved && typeof localStorage !== 'undefined') {
      localStorage.setItem(
        this.POS_KEY,
        JSON.stringify({ x: this.launcherPosX(), y: this.launcherPosY() }),
      );
    }
  }

  onLauncherClick(): void {
    if (this.dragMoved) {
      this.dragMoved = false;
      return;
    }
    this.guideService.toggleGuide();
  }

  // ==================== CONTROLES DE VENTANA ====================

  toggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }

  closeGuide(): void {
    this.guideService.closeGuide();
  }

  hideLauncher(event: Event): void {
    event.stopPropagation();
    this.guideService.hideLauncher();
  }

  showLauncher(): void {
    this.guideService.showLauncher();
  }

  resetConversation(): void {
    this.isTourActive.set(false);
    this.currentTourStepIndex.set(0);
    this.initWelcomeMessage();
  }

  private initWelcomeMessage(): void {
    const lang = this.i18n.currentLang();
    const role = this.auth.currentRole();
    const name = this.auth.userFullName();
    this.lastWelcomeSignature = `${lang}|${role}|${name}`;
    this.conversationMessages.set([getWelcomeMessage(lang, role, name)]);
  }

  // ==================== TOUR GUIADO ====================

  startTour(): void {
    this.isTourActive.set(true);
    this.currentTourStepIndex.set(0);
    this.sendTourStepMessage(0);
  }

  nextTourStep(): void {
    const nextIdx = this.currentTourStepIndex() + 1;
    if (nextIdx < this.currentTourSteps().length) {
      this.currentTourStepIndex.set(nextIdx);
      this.sendTourStepMessage(nextIdx);
    } else {
      this.finishTour();
    }
  }

  prevTourStep(): void {
    const prevIdx = this.currentTourStepIndex() - 1;
    if (prevIdx >= 0) {
      this.currentTourStepIndex.set(prevIdx);
      this.sendTourStepMessage(prevIdx);
    }
  }

  finishTour(): void {
    this.isTourActive.set(false);
    const isEn = this.i18n.currentLang() === 'en';
    this.addBotMessage(
      isEn
        ? '### Tour Completed\n\nYou now know the full **EXPERIENCIA** workflow: catalog & quorum, QR tickets, group matching, host publishing, Live Console with ephemeral GDPR vision, AI Master of Ceremonies with voice, and Autonomous Virtual DJ.\n\nAsk me anything anytime or tell me where you want to go!'
        : '### Tour Completado\n\nYa conoces todo el ecosistema **EXPERIENCIA**: catálogo y quórum, tickets QR, matching grupal, publicación para anfitriones, Consola en Vivo con visión efímera GDPR, Maestro de Ceremonias IA con voz y DJ Virtual Autónomo.\n\nPregúntame cualquier duda cuando quieras o dime a qué módulo deseas ir.',
      undefined,
      undefined,
      isEn
        ? [
            { label: 'Explore Catalog', route: '/catalog', icon: 'magnifying-glass' },
            { label: 'Host Dashboard', route: '/host', icon: 'building-office' },
            { label: 'Restart Tour', query: 'start tour', icon: 'sparkles' },
          ]
        : [
            { label: 'Explorar Catálogo', route: '/catalog', icon: 'magnifying-glass' },
            { label: 'Panel Anfitrión', route: '/host', icon: 'building-office' },
            { label: 'Reiniciar Tour', query: 'iniciar tour', icon: 'sparkles' },
          ],
    );
  }

  private sendTourStepMessage(index: number): void {
    const step = this.currentTourSteps()[index];
    if (!step) return;
    const detailsFormatted = step.details.map((d) => `- ${d}`).join('\n');
    const text = `### ${step.title} (${step.badge})\n\n${step.description}\n\n${detailsFormatted}\n\n*${step.tips}*`;

    const quickActions: GuideQuickAction[] = [];
    if (step.route && step.routeLabel) {
      quickActions.push({
        label: step.routeLabel,
        route: step.route,
        icon: step.routeIcon ?? 'arrow-right',
      });
    }

    this.addBotMessage(text, undefined, undefined, quickActions.length ? quickActions : undefined);
  }

  // ==================== CONVERSACIÓN Y ACCIONES AGÉNTICAS ====================

  sendMessage(textToSend?: string): void {
    const query = (textToSend ?? this.userInput()).trim();
    if (!query) return;

    this.conversationMessages.update((msgs) => [
      ...msgs,
      {
        id: 'user-' + Date.now(),
        sender: 'user',
        text: query,
        timestamp: new Date(),
      },
    ]);

    if (!textToSend) {
      this.userInput.set('');
    }

    this.isTyping.set(true);
    setTimeout(() => {
      const result = resolveGuideQuery(
        query,
        this.i18n.currentLang(),
        this.auth.currentRole(),
        this.router.url,
      );

      if (result === 'START_TOUR') {
        this.startTour();
      } else {
        this.addBotMessage(
          result.text,
          result.codeSnippet,
          result.codeLanguage,
          result.quickActions,
        );
        if (result.navigateTo) {
          this.router.navigateByUrl(result.navigateTo);
        }
      }
      this.isTyping.set(false);
    }, 320);
  }

  executeQuickAction(action: GuideQuickAction): void {
    if (action.route) {
      this.router.navigateByUrl(action.route);
    }
    if (action.query) {
      this.sendMessage(action.query);
    }
  }

  private addBotMessage(
    text: string,
    codeSnippet?: string,
    codeLanguage?: string,
    quickActions?: GuideQuickAction[],
  ): void {
    this.conversationMessages.update((msgs) => [
      ...msgs,
      {
        id: 'bot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        sender: 'bot',
        text,
        timestamp: new Date(),
        codeSnippet,
        codeLanguage,
        quickActions,
      },
    ]);
  }

  // ==================== UTILIDADES UI ====================

  scrollTopics(direction: 'left' | 'right'): void {
    const el = this.topicsContainer?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -180 : 180, behavior: 'smooth' });
  }

  onTopicsWheel(event: WheelEvent): void {
    const el = this.topicsContainer?.nativeElement;
    if (!el || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  }

  copySnippet(snippet: string, msgId: string): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(snippet).then(() => {
      this.copiedSnippetId.set(msgId);
      setTimeout(() => {
        if (this.copiedSnippetId() === msgId) {
          this.copiedSnippetId.set(null);
        }
      }, 1800);
    });
  }

  formatMarkdown(raw: string): string {
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lines = escaped.split('\n');
    const htmlParts: string[] = [];
    let inList = false;

    const inline = (line: string) =>
      line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        continue;
      }

      if (line.startsWith('### ')) {
        if (inList) {
          htmlParts.push('</ul>');
          inList = false;
        }
        htmlParts.push(`<h4 class="font-editorial">${inline(line.slice(4))}</h4>`);
        continue;
      }

      if (line.startsWith('- ') || line.startsWith('• ')) {
        if (!inList) {
          htmlParts.push('<ul>');
          inList = true;
        }
        htmlParts.push(`<li>${inline(line.slice(2))}</li>`);
        continue;
      }

      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      htmlParts.push(`<p>${inline(line)}</p>`);
    }

    if (inList) {
      htmlParts.push('</ul>');
    }

    return htmlParts.join('');
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.chatScrollContainer?.nativeElement;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }, 40);
  }
}
