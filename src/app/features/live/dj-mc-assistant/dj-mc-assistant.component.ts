import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LiveMetrics } from '../../../core/models/live.model';
import {
  DjPlaylistId,
  DjTransitionSuggestion,
  DjYoutubeTrack,
  LiveTelemetrySnapshot,
  McAiProvider,
  McAiTelemetryContext,
} from '../../../core/models/live-telemetry.model';
import { I18nService } from '../../../core/services/i18n.service';
import { LiveTelemetryService } from '../../../core/services/live-telemetry.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { DjGrooveEngine } from './dj-audio-engine';

export interface DjPlaylistDefinition {
  id: DjPlaylistId;
  name: string;
  genre: string;
  bpm: number;
  youtubeVideoId: string;
  tracks: string[];
}

interface LocalAudioTrack {
  name: string;
  url: string;
}

interface YtPlayerLike {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(vol: number): void;
  loadVideoById(videoId: string): void;
  loadPlaylist(opts: { list: string; listType: 'playlist' }): void;
  nextVideo(): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          height?: string;
          width?: string;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YtPlayerLike }) => void;
            onStateChange?: (e: { data: number }) => void;
            onError?: () => void;
          };
        },
      ) => YtPlayerLike;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const DJ_PLAYLISTS: DjPlaylistDefinition[] = [
  {
    id: 'chill_jazz',
    name: 'Jazz & Lounge',
    genre: 'Acoustic Jazz / Lo-Fi',
    bpm: 92,
    youtubeVideoId: '72kUZ1LaI7U',
    tracks: ['Cafe Jazz & Piano Lounge', 'Warm Canvas Groove', 'Midnight Espresso'],
  },
  {
    id: 'groove_funk',
    name: 'Groove & Funk',
    genre: 'Nu-Disco / Synth Groove',
    bpm: 112,
    youtubeVideoId: '4xDzrJKXOOY',
    tracks: ['Synth & Groove Radio', 'Golden Floor Bounce', 'Electric Conversation'],
  },
  {
    id: 'melodic_house',
    name: 'House Melódico',
    genre: 'Melodic / Deep House',
    bpm: 122,
    youtubeVideoId: '36YnV9STBqc',
    tracks: ['Deep & Melodic House Radio', 'Deep Rhythm Flow', 'Afterglow Horizon'],
  },
  {
    id: 'upbeat_party',
    name: 'Upbeat Party',
    genre: 'Upbeat / Chillhop & Dance',
    bpm: 128,
    youtubeVideoId: '7NOSDKb0HlU',
    tracks: ['Upbeat Beats Radio', 'Crowd Ignition', 'Peak Energy Encore'],
  },
];

const DJ_AUTO_INTERVAL_MS = 90_000;

function parseYoutubeInput(raw: string): { videoId?: string; listId?: string } | null {
  const input = raw.trim();
  if (!input) return null;

  // ID directo de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return { videoId: input };
  }

  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    const listId = url.searchParams.get('list') || undefined;
    let videoId = url.searchParams.get('v') || undefined;

    if (!videoId && url.hostname.includes('youtu.be')) {
      const seg = url.pathname.replace(/^\/+/, '').split('/')[0];
      if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) videoId = seg;
    }
    if (!videoId && url.pathname.includes('/embed/')) {
      const seg = url.pathname.split('/embed/')[1]?.split('/')[0];
      if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) videoId = seg;
    }
    if (!videoId && url.pathname.includes('/live/')) {
      const seg = url.pathname.split('/live/')[1]?.split('/')[0];
      if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) videoId = seg;
    }

    if (videoId || listId) {
      return { videoId, listId };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * DJ Virtual Autónomo en Vivo (CU-10 / CU-11).
 *
 * Soporta reproducción desde YouTube (sin API key, vía IFrame Player API oficial),
 * motor de grooves BPM integrado y archivos MP3/WAV locales, con ducking automático
 * mientras el DJ habla al micrófono con Edge TTS.
 */
@Component({
  selector: 'app-dj-mc-assistant',
  imports: [FormsModule, IconComponent, TranslatePipe],
  templateUrl: './dj-mc-assistant.component.html',
  styleUrl: './dj-mc-assistant.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DjMcAssistantComponent implements OnInit, AfterViewInit {
  private readonly telemetry = inject(LiveTelemetryService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('youtubeHost') private youtubeHost?: ElementRef<HTMLDivElement>;

  readonly sessionId = input.required<string>();
  readonly snapshot = input<LiveTelemetrySnapshot | null>(null);
  readonly liveMetrics = input<LiveMetrics | null>(null);
  readonly provider = input<McAiProvider>('vertex');

  readonly playlists = DJ_PLAYLISTS;
  readonly audioSource = signal<'youtube' | 'synth'>('youtube');
  readonly activePlaylistId = signal<DjPlaylistId>('chill_jazz');
  readonly trackIndex = signal<number>(0);
  readonly isPlaying = signal<boolean>(false);
  readonly volume = signal<number>(65);
  readonly autoDjEnabled = signal<boolean>(true);
  readonly loadingMix = signal<boolean>(false);
  readonly pendingTransition = signal<DjTransitionSuggestion | null>(null);
  readonly djSpeaking = signal<boolean>(false);
  readonly localTracks = signal<LocalAudioTrack[]>([]);
  readonly localTrackIndex = signal<number>(0);
  readonly youtubeUrlInput = signal<string>('');
  readonly youtubeReady = signal<boolean>(false);
  readonly customYoutubeLabel = signal<string | null>(null);
  readonly youtubeResults = signal<DjYoutubeTrack[]>([]);
  readonly searchingYoutube = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly activePlaylist = computed(
    () => this.playlists.find((p) => p.id === this.activePlaylistId()) ?? this.playlists[0],
  );

  readonly currentTrackTitle = computed(() => {
    const custom = this.localTracks();
    if (custom.length > 0) {
      return custom[this.localTrackIndex() % custom.length]?.name ?? '';
    }
    if (this.audioSource() === 'youtube' && this.customYoutubeLabel()) {
      return this.customYoutubeLabel()!;
    }
    const list = this.activePlaylist();
    return list.tracks[this.trackIndex() % list.tracks.length];
  });

  private readonly grooveEngine = new DjGrooveEngine();
  private ytPlayer: YtPlayerLike | null = null;
  private localAudio: HTMLAudioElement | null = null;
  private djVoiceAudio: HTMLAudioElement | null = null;
  private djVoiceUrl: string | null = null;
  private autoTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.autoTimer) clearInterval(this.autoTimer);
      this.stopDjVoice();
      this.grooveEngine.destroy();
      this.stopLocalAudio();
      try {
        this.ytPlayer?.destroy();
      } catch {
        // Ignorar al desmontar
      }
      this.ytPlayer = null;
      for (const track of this.localTracks()) {
        URL.revokeObjectURL(track.url);
      }
    });
  }

  ngOnInit(): void {
    this.grooveEngine.setVolume(this.volume() / 100);
    this.autoTimer = setInterval(() => {
      if (
        this.autoDjEnabled() &&
        !this.loadingMix() &&
        !this.djSpeaking() &&
        this.pendingTransition() === null
      ) {
        this.requestAiMix();
      }
    }, DJ_AUTO_INTERVAL_MS);
  }

  ngAfterViewInit(): void {
    this.initYoutubeApi();
  }

  setAudioSource(source: 'youtube' | 'synth'): void {
    if (this.audioSource() === source) return;
    const wasPlaying = this.isPlaying();
    this.pauseMusic();
    this.audioSource.set(source);
    if (source === 'youtube' && !this.ytPlayer) {
      setTimeout(() => this.initYoutubeApi(), 50);
    }
    if (wasPlaying) {
      this.playMusic();
    }
  }

  selectPlaylist(id: DjPlaylistId): void {
    this.activePlaylistId.set(id);
    this.trackIndex.set(0);
    this.customYoutubeLabel.set(null);
    this.errorMessage.set(null);

    if (this.localTracks().length > 0) return;

    if (this.audioSource() === 'youtube') {
      const pl = this.playlists.find((p) => p.id === id) ?? this.playlists[0];
      if (this.ytPlayer && this.youtubeReady()) {
        this.ytPlayer.loadVideoById(pl.youtubeVideoId);
        if (!this.isPlaying()) {
          this.ytPlayer.pauseVideo();
        }
      }
    } else {
      this.grooveEngine.setPlaylist(id);
    }
  }

  loadYoutubeFromUrl(): void {
    const raw = this.youtubeUrlInput().trim();
    if (!raw) return;

    const parsed = parseYoutubeInput(raw);
    if (!parsed) {
      // No es una URL directa -> buscar en YouTube Data API v3
      this.searchYoutubeMusic(raw);
      return;
    }
    this.errorMessage.set(null);
    this.youtubeResults.set([]);
    this.clearLocalTracks();
    this.audioSource.set('youtube');

    const applyLoad = () => {
      if (!this.ytPlayer) return;
      if (parsed.listId && !parsed.videoId) {
        this.ytPlayer.loadPlaylist({ list: parsed.listId, listType: 'playlist' });
        this.customYoutubeLabel.set(`YouTube Playlist (${parsed.listId.slice(0, 10)}...)`);
      } else if (parsed.videoId) {
        this.ytPlayer.loadVideoById(parsed.videoId);
        this.customYoutubeLabel.set(`YouTube (${parsed.videoId})`);
      }
      this.ytPlayer.setVolume(this.djSpeaking() ? Math.round(this.volume() * 0.18) : this.volume());
      this.ytPlayer.playVideo();
      this.isPlaying.set(true);
      this.youtubeUrlInput.set('');
    };

    if (this.ytPlayer && this.youtubeReady()) {
      applyLoad();
    } else {
      this.initYoutubeApi(applyLoad);
    }
  }

  searchYoutubeMusic(query: string): void {
    if (this.searchingYoutube()) return;
    this.searchingYoutube.set(true);
    this.errorMessage.set(null);
    this.telemetry.searchDjYoutube(query, 5).subscribe({
      next: (res) => {
        this.youtubeResults.set(res.tracks);
        this.searchingYoutube.set(false);
        if (res.tracks.length === 0) {
          this.errorMessage.set('No se encontraron videos musicales embebibles para esa búsqueda.');
        }
      },
      error: (err) => {
        this.searchingYoutube.set(false);
        this.errorMessage.set(
          err?.error?.detail ?? 'No se pudo buscar en YouTube. Revisa tu YOUTUBE_API_KEY.',
        );
      },
    });
  }

  playYoutubeTrack(track: DjYoutubeTrack): void {
    this.errorMessage.set(null);
    this.clearLocalTracks();
    this.audioSource.set('youtube');
    this.customYoutubeLabel.set(`${track.title} — ${track.channel}`);
    const apply = () => {
      if (!this.ytPlayer) return;
      this.ytPlayer.loadVideoById(track.video_id);
      this.ytPlayer.setVolume(this.djSpeaking() ? Math.round(this.volume() * 0.18) : this.volume());
      this.ytPlayer.playVideo();
      this.isPlaying.set(true);
    };
    if (this.ytPlayer && this.youtubeReady()) {
      apply();
    } else {
      this.initYoutubeApi(apply);
    }
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pauseMusic();
    } else {
      this.playMusic();
    }
  }

  playMusic(): void {
    const custom = this.localTracks();
    if (custom.length > 0) {
      this.grooveEngine.stop();
      this.ytPlayer?.pauseVideo();
      this.playLocalTrack(this.localTrackIndex());
      this.isPlaying.set(true);
      return;
    }

    if (this.audioSource() === 'youtube') {
      this.grooveEngine.stop();
      this.stopLocalAudio();
      if (this.ytPlayer && this.youtubeReady()) {
        this.ytPlayer.setVolume(this.djSpeaking() ? Math.round(this.volume() * 0.18) : this.volume());
        this.ytPlayer.playVideo();
        this.isPlaying.set(true);
      } else {
        this.initYoutubeApi(() => {
          this.ytPlayer?.setVolume(this.volume());
          this.ytPlayer?.playVideo();
          this.isPlaying.set(true);
        });
      }
      return;
    }

    this.stopLocalAudio();
    this.ytPlayer?.pauseVideo();
    this.grooveEngine.setVolume(this.volume() / 100);
    this.grooveEngine.start(this.activePlaylistId());
    this.isPlaying.set(true);
  }

  pauseMusic(): void {
    this.grooveEngine.stop();
    if (this.localAudio) {
      this.localAudio.pause();
    }
    try {
      this.ytPlayer?.pauseVideo();
    } catch {
      // Ignorar si aún no está listo
    }
    this.isPlaying.set(false);
  }

  nextTrack(): void {
    const custom = this.localTracks();
    if (custom.length > 0) {
      const next = (this.localTrackIndex() + 1) % custom.length;
      this.localTrackIndex.set(next);
      if (this.isPlaying()) {
        this.playLocalTrack(next);
      }
      return;
    }
    if (this.audioSource() === 'youtube') {
      const currentIdx = this.playlists.findIndex((p) => p.id === this.activePlaylistId());
      const nextPl = this.playlists[(currentIdx + 1) % this.playlists.length];
      this.selectPlaylist(nextPl.id);
      if (this.isPlaying()) {
        this.ytPlayer?.playVideo();
      }
      return;
    }
    const count = this.activePlaylist().tracks.length;
    this.trackIndex.update((i) => (i + 1) % count);
  }

  onVolumeChange(value: number): void {
    this.volume.set(value);
    const norm = value / 100;
    this.grooveEngine.setVolume(norm);
    if (this.localAudio) {
      this.localAudio.volume = this.djSpeaking() ? norm * 0.22 : norm;
    }
    if (this.ytPlayer && this.youtubeReady()) {
      this.ytPlayer.setVolume(this.djSpeaking() ? Math.round(value * 0.18) : value);
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    for (const old of this.localTracks()) {
      URL.revokeObjectURL(old.url);
    }
    const nextTracks: LocalAudioTrack[] = Array.from(files).map((file) => ({
      name: file.name.replace(/\.[^.]+$/, ''),
      url: URL.createObjectURL(file),
    }));
    this.localTracks.set(nextTracks);
    this.localTrackIndex.set(0);
    input.value = '';
    this.playMusic();
  }

  clearLocalTracks(): void {
    this.stopLocalAudio();
    for (const old of this.localTracks()) {
      URL.revokeObjectURL(old.url);
    }
    this.localTracks.set([]);
    this.localTrackIndex.set(0);
    if (this.isPlaying()) {
      this.playMusic();
    }
  }

  toggleAutoDj(): void {
    this.autoDjEnabled.update((v) => !v);
  }

  requestAiMix(): void {
    const id = this.sessionId();
    if (!id || this.loadingMix()) return;
    this.loadingMix.set(true);
    this.errorMessage.set(null);
    const lang = this.i18n.currentLang() === 'en' ? 'en' : 'es';

    this.telemetry
      .generateDjTransition(id, {
        provider: this.provider(),
        language: lang,
        current_playlist_id: this.activePlaylistId(),
        telemetry: this.buildTelemetryContext(),
      })
      .subscribe({
        next: (suggestion) => {
          this.pendingTransition.set(suggestion);
          this.loadingMix.set(false);
        },
        error: (err) => {
          this.loadingMix.set(false);
          this.errorMessage.set(
            err?.error?.detail ?? 'No se pudo generar la transición del DJ Autónomo.',
          );
        },
      });
  }

  applyTransition(speak: boolean): void {
    const sug = this.pendingTransition();
    if (!sug) return;
    this.pendingTransition.set(null);
    const aiTrack = sug.youtube_tracks?.[0];
    if (aiTrack && this.audioSource() === 'youtube' && this.localTracks().length === 0) {
      this.activePlaylistId.set(sug.recommended_playlist_id);
      this.playYoutubeTrack(aiTrack);
    } else {
      this.selectPlaylist(sug.recommended_playlist_id);
      if (!this.isPlaying()) {
        this.playMusic();
      } else if (this.audioSource() === 'youtube') {
        this.ytPlayer?.playVideo();
      }
    }
    if (speak && sug.dj_shoutout) {
      this.speakDjShoutout(sug.dj_shoutout, sug.model);
    }
  }

  dismissTransition(): void {
    this.pendingTransition.set(null);
  }

  stopDjVoice(): void {
    if (this.djVoiceAudio) {
      this.djVoiceAudio.pause();
      this.djVoiceAudio.src = '';
      this.djVoiceAudio = null;
    }
    if (this.djVoiceUrl) {
      URL.revokeObjectURL(this.djVoiceUrl);
      this.djVoiceUrl = null;
    }
    this.djSpeaking.set(false);
    this.setMusicDucked(false);
  }

  private initYoutubeApi(onReadyCallback?: () => void): void {
    if (typeof window === 'undefined' || !this.youtubeHost?.nativeElement) return;

    const mountPlayer = () => {
      if (!window.YT?.Player || !this.youtubeHost?.nativeElement) return;
      if (this.ytPlayer) {
        onReadyCallback?.();
        return;
      }
      this.ytPlayer = new window.YT.Player(this.youtubeHost.nativeElement, {
        height: '180',
        width: '100%',
        videoId: this.activePlaylist().youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(this.volume());
            this.youtubeReady.set(true);
            onReadyCallback?.();
          },
          onStateChange: (e) => {
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            if (e.data === 1) this.isPlaying.set(true);
            else if (e.data === 2 || e.data === 0) this.isPlaying.set(false);
          },
          onError: () => {
            this.errorMessage.set(
              'Este video de YouTube no permite reproducción embebida. Prueba otro enlace o cambia a Groove BPM.',
            );
          },
        },
      });
    };

    if (window.YT?.Player) {
      mountPlayer();
      return;
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      mountPlayer();
    };

    if (!document.getElementById('yt-iframe-api-script')) {
      const script = document.createElement('script');
      script.id = 'yt-iframe-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  }

  private speakDjShoutout(text: string, modelName?: string): void {
    this.stopDjVoice();
    const lang = this.i18n.currentLang() === 'en' ? 'en' : 'es';
    const voice = lang === 'en' ? 'andrew' : 'marcelo';
    this.djSpeaking.set(true);
    this.setMusicDucked(true);

    this.telemetry
      .synthesizeMcSpeech({
        text,
        voice,
        language: lang,
        record_in_session_id: this.sessionId(),
        provider: this.provider(),
        model: modelName,
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.djVoiceUrl = url;
          const audio = new Audio(url);
          this.djVoiceAudio = audio;
          audio.onended = () => this.stopDjVoice();
          audio.onerror = () => this.stopDjVoice();
          void audio.play().catch(() => this.stopDjVoice());
        },
        error: () => {
          this.stopDjVoice();
        },
      });
  }

  private setMusicDucked(ducked: boolean): void {
    this.grooveEngine.setDucked(ducked);
    if (this.localAudio) {
      const norm = this.volume() / 100;
      this.localAudio.volume = ducked ? norm * 0.22 : norm;
    }
    if (this.ytPlayer && this.youtubeReady()) {
      this.ytPlayer.setVolume(ducked ? Math.round(this.volume() * 0.18) : this.volume());
    }
  }

  private playLocalTrack(index: number): void {
    const tracks = this.localTracks();
    const track = tracks[index];
    if (!track) return;
    if (!this.localAudio) {
      this.localAudio = new Audio();
      this.localAudio.onended = () => this.nextTrack();
    }
    this.localAudio.src = track.url;
    const norm = this.volume() / 100;
    this.localAudio.volume = this.djSpeaking() ? norm * 0.22 : norm;
    void this.localAudio.play().catch(() => {
      this.isPlaying.set(false);
    });
  }

  private stopLocalAudio(): void {
    if (this.localAudio) {
      this.localAudio.pause();
      this.localAudio.src = '';
    }
  }

  private buildTelemetryContext(): McAiTelemetryContext | null {
    const cam = this.liveMetrics();
    if (cam) {
      return {
        signal_status: 'LIVE',
        traffic_light: cam.energy_traffic_light ?? null,
        attention_score: cam.attention_score,
        joy_score: cam.joy_score,
        inattention_score: cam.inattention_score,
        detected_faces_count: cam.detected_faces_count,
        dominant_age_group: cam.dominant_age_group ?? null,
      };
    }
    const snap = this.snapshot();
    if (snap) {
      return {
        signal_status: snap.signal_status,
        traffic_light: snap.traffic_light,
        energy_score: snap.energy_score,
        attention_score: snap.attention_score,
        joy_score: snap.joy_score,
        detected_faces_count: snap.detected_faces_count,
        trend: snap.trend,
        dominant_age_group: snap.dominant_age_group,
      };
    }
    return null;
  }
}
