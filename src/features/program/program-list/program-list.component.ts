import {
  Component, ChangeDetectionStrategy, booleanAttribute, computed, inject, input, OnInit, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ProgramService } from '../../../core/program/program.service';
import { totalWeeks } from '../../../core/program/program-draft';
import type { Program, ProgramPhase } from '../../../core/program/program.types';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import { IconButtonComponent } from '../../../shared/ui/button/icon-button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { headerClass } from '../../../shared/components/snap-panels/embedded-header';

const ICON_BUTTON = 'p-1.5 rounded-md transition-colors';
const ICON_BUTTON_ON = `${ICON_BUTTON} text-[hsl(var(--tenant-primary))] bg-[hsl(var(--tenant-primary))]/10`;
const ICON_BUTTON_OFF = `${ICON_BUTTON} text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800`;

/**
 * Programs panel of the library pages: the user's own programs (follow, share, edit, delete) and, for
 * free/admin users, the programs friends shared (read-only, follow). Mirrors the plans list.
 */
@Component({
  selector: 'app-program-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, AppIconComponent, EmptyStateComponent, IconButtonComponent, ToggleComponent],
  template: `
    <div class="space-y-4">

      <div [class]="header()">
        <div>
          <h1 class="text-xl font-semibold" [attr.aria-level]="embedded() ? 2 : null">{{ titleKey() | translate }}</h1>
          <p class="text-sm text-neutral-400 mt-0.5">{{ programs().length }} {{ 'program.subtitle' | translate }}</p>
        </div>
        <button
          (click)="router.navigate([basePath(), 'programs', 'new'])"
          class="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-white transition-colors"
        >
          {{ 'program.new' | translate }}
        </button>
      </div>

      @if (deleteFailed()) {
        <p class="text-sm text-red-400" role="alert">{{ 'program.err.delete' | translate }}</p>
      }

      @if (loading()) {
        <p class="text-sm text-neutral-500">{{ 'common.loading' | translate }}</p>
      } @else if (programs().length === 0) {
        <app-empty-state [message]="'program.empty' | translate" [hint]="'program.empty.hint' | translate" />
      } @else {
        <div class="rounded-lg border border-neutral-800 overflow-hidden">
          @for (program of programs(); track program.id) {
            <div class="border-b border-neutral-800 last:border-0">
              <div
                class="flex items-center gap-4 px-4 py-3 hover:bg-neutral-900 transition-colors cursor-pointer"
                (click)="edit(program)"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-neutral-100 truncate">{{ program.title }}</p>
                    @if (isFollowing(program.id)) {
                      <span class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded
                                   bg-[hsl(var(--tenant-primary))]/15 text-[hsl(var(--tenant-primary))]">
                        {{ 'program.following' | translate }}
                      </span>
                    }
                  </div>
                  <p class="text-xs text-neutral-500 mt-0.5">
                    {{ phaseCount(program.id) }} {{ 'program.phases.count' | translate }}
                    · {{ weeks(program.id) }} {{ 'program.weeks' | translate }}
                    @if (program.is_shared_with_friends) {
                      · <span class="text-[hsl(var(--tenant-primary))]">{{ 'myplan.share.friends' | translate }}</span>
                    }
                  </p>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0" (click)="$event.stopPropagation()">
                  <button
                    (click)="toggleFollow(program)"
                    [class]="followClass(program.id)"
                    [disabled]="phaseCount(program.id) === 0"
                    [title]="'program.follow' | translate"
                  >
                    <app-icon name="check" iconClass="w-4 h-4" />
                  </button>
                  @if (canShare()) {
                    <button
                      (click)="toggleSharePanel(program.id)"
                      [class]="program.is_shared_with_friends ? iconOn : iconOff"
                      [title]="'program.share.friends' | translate"
                    >
                      <app-icon name="share" />
                    </button>
                  }
                  <app-icon-button
                    icon="pencil"
                    [label]="'common.edit' | translate"
                    labelMode="responsive"
                    variant="ghost"
                    size="sm"
                    (click)="edit(program)"
                  />
                  <app-icon-button
                    icon="trash"
                    [label]="'common.delete' | translate"
                    labelMode="responsive"
                    variant="ghost"
                    size="sm"
                    class="text-neutral-400 hover:text-red-400"
                    (click)="remove(program)"
                  />
                </div>
              </div>

              @if (canShare() && sharePanelId() === program.id) {
                <div class="px-4 pb-4 pt-1 border-t border-neutral-800 bg-neutral-900/50 space-y-3">
                  <p class="text-xs text-neutral-500">{{ 'myplan.share.friends.hint' | translate }}</p>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-neutral-400">{{ 'program.share.friends' | translate }}</span>
                    <app-toggle [active]="program.is_shared_with_friends" (changed)="setShared(program, $event)" />
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (shared().length > 0) {
        <h2 class="pt-2 text-sm font-medium text-neutral-200">{{ 'program.shared.title' | translate }}</h2>
        <div class="rounded-lg border border-neutral-800 overflow-hidden">
          @for (program of shared(); track program.id) {
            <div class="flex items-center gap-4 px-4 py-3 border-b border-neutral-800 last:border-0">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-neutral-100 truncate">{{ program.title }}</p>
                  @if (isFollowing(program.id)) {
                    <span class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded
                                 bg-[hsl(var(--tenant-primary))]/15 text-[hsl(var(--tenant-primary))]">
                      {{ 'program.following' | translate }}
                    </span>
                  }
                  <span class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">
                    {{ 'program.by' | translate }} {{ ownerName(program) }}
                  </span>
                </div>
                <p class="text-xs text-neutral-500 mt-0.5">
                  {{ phaseCount(program.id) }} {{ 'program.phases.count' | translate }}
                  · {{ weeks(program.id) }} {{ 'program.weeks' | translate }}
                </p>
              </div>
              <button
                (click)="toggleFollow(program)"
                [class]="followClass(program.id)"
                [disabled]="phaseCount(program.id) === 0"
                [title]="'program.follow' | translate"
              >
                <app-icon name="check" iconClass="w-4 h-4" />
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProgramListComponent implements OnInit {
  /** Shown inside a SnapPanels panel: the header sticks to the top of the scrolling area. */
  readonly embedded = input(false, { transform: booleanAttribute });
  /** Dictionary key of the heading ("My Programs" for free users, "Programs" for trainers). */
  readonly titleKey = input('program.title');
  readonly header = computed(() => headerClass(this.embedded(), 'flex items-center justify-between'));

  readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly service = inject(ProgramService);
  private readonly language = inject(LanguageService);

  readonly iconOn = ICON_BUTTON_ON;
  readonly iconOff = ICON_BUTTON_OFF;

  readonly loading = signal(true);
  readonly programs = signal<Program[]>([]);
  readonly phases = signal<ProgramPhase[]>([]);
  readonly followingId = signal<string | null>(null);
  readonly deleteFailed = signal(false);
  readonly shared = signal<Program[]>([]);
  readonly ownerNames = signal<Map<string, string>>(new Map());
  readonly sharePanelId = signal<string | null>(null);

  readonly basePath = computed(() => (this.auth.profile()?.role === 'trainer' ? '/trainer' : '/my-plan'));

  /** Friends exist only for free and admin accounts, so only they can share (a trainer's clients get programs assigned). */
  readonly canShare = computed(() => this.auth.profile()?.role !== 'trainer');

  async ngOnInit(): Promise<void> {
    await this.reload();
    this.loading.set(false);
  }

  isFollowing(programId: string): boolean {
    return this.followingId() === programId;
  }

  followClass(programId: string): string {
    return this.isFollowing(programId) ? ICON_BUTTON_ON : ICON_BUTTON_OFF;
  }

  ownerName(program: Program): string {
    return this.ownerNames().get(program.owner_id) ?? '…';
  }

  phaseCount(programId: string): number {
    return this.phasesOf(programId).length;
  }

  weeks(programId: string): number {
    return totalWeeks(this.phasesOf(programId));
  }

  toggleSharePanel(programId: string): void {
    this.sharePanelId.update(current => (current === programId ? null : programId));
  }

  edit(program: Program): void {
    this.router.navigate([this.basePath(), 'programs', program.id]);
  }

  /** Follow the program, or stop following it when it is already the one in progress. */
  async toggleFollow(program: Program): Promise<void> {
    const userId = this.auth.profile()?.id;
    if (!userId) return;
    if (this.isFollowing(program.id)) {
      if ((await this.service.stop(userId)) === null) this.followingId.set(null);
    } else if ((await this.service.follow(userId, program.id)) === null) {
      this.followingId.set(program.id);
    }
  }

  async setShared(program: Program, shared: boolean): Promise<void> {
    if ((await this.service.setSharedWithFriends(program.id, shared)) !== null) return;
    this.programs.update(list => list.map(p => (p.id === program.id ? { ...p, is_shared_with_friends: shared } : p)));
  }

  async remove(program: Program): Promise<void> {
    if (!confirm(`${program.title}: ${this.language.t('program.delete.confirm')}`)) return;
    const error = await this.service.remove(program.id);
    this.deleteFailed.set(error !== null);
    if (error === null) await this.reload();
  }

  private phasesOf(programId: string): ProgramPhase[] {
    return this.phases().filter(p => p.program_id === programId);
  }

  private async reload(): Promise<void> {
    const userId = this.auth.profile()?.id;
    if (!userId) return;
    const [programs, active] = await Promise.all([
      this.service.loadMine(userId),
      this.service.loadActiveProgramId(userId),
    ]);
    this.programs.set(programs);
    this.followingId.set(active);
    const shared = this.canShare() ? await this.service.loadSharedByFriends(userId) : [];
    this.shared.set(shared);
    this.ownerNames.set(await this.service.loadOwnerNames(shared.map(p => p.owner_id)));
    this.phases.set(await this.service.loadPhases([...programs, ...shared].map(p => p.id)));
  }
}
