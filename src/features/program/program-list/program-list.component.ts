import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ProgramService } from '../../../core/program/program.service';
import { totalWeeks } from '../../../core/program/program-draft';
import type { Program, ProgramPhase } from '../../../core/program/program.types';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconButtonComponent } from '../../../shared/ui/button/icon-button.component';

/** Programs the user built, with a one-tap "Follow" that makes the dashboard train from one. */
@Component({
  selector: 'app-program-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, EmptyStateComponent, IconButtonComponent],
  template: `
    <div class="space-y-4">
      <button (click)="router.navigate([basePath()])" class="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
        ← {{ 'program.back' | translate }}
      </button>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">{{ 'program.title' | translate }}</h1>
          <p class="text-sm text-neutral-400 mt-0.5">{{ programs().length }} {{ 'program.subtitle' | translate }}</p>
        </div>
        <button
          (click)="router.navigate([basePath(), 'programs', 'new'])"
          class="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-white transition-colors"
        >
          {{ 'program.new' | translate }}
        </button>
      </div>

      @if (loading()) {
        <p class="text-sm text-neutral-500">{{ 'common.loading' | translate }}</p>
      } @else if (programs().length === 0) {
        <app-empty-state [message]="'program.empty' | translate" [hint]="'program.empty.hint' | translate" />
      } @else {
        <div class="rounded-lg border border-neutral-800 overflow-hidden">
          @for (program of programs(); track program.id) {
            <div
              class="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 last:border-0 hover:bg-neutral-900 transition-colors cursor-pointer"
              (click)="router.navigate([basePath(), 'programs', program.id])"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-100 truncate">{{ program.title }}</p>
                <p class="text-xs text-neutral-500 mt-0.5">
                  {{ phaseCount(program.id) }} {{ 'program.phases.count' | translate }}
                  · {{ weeks(program.id) }} {{ 'program.weeks' | translate }}
                </p>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0" (click)="$event.stopPropagation()">
                @if (followingId() === program.id) {
                  <span class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded
                               bg-[hsl(var(--tenant-primary))]/15 text-[hsl(var(--tenant-primary))]">
                    {{ 'program.following' | translate }}
                  </span>
                } @else {
                  <app-icon-button
                    icon="check"
                    [label]="'program.follow' | translate"
                    labelMode="responsive"
                    variant="ghost"
                    size="sm"
                    [disabled]="phaseCount(program.id) === 0"
                    (click)="follow(program)"
                  />
                }
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
          }
        </div>
      }
    </div>
  `,
})
export class ProgramListComponent implements OnInit {
  readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly service = inject(ProgramService);
  private readonly language = inject(LanguageService);

  readonly loading = signal(true);
  readonly programs = signal<Program[]>([]);
  readonly phases = signal<ProgramPhase[]>([]);
  readonly followingId = signal<string | null>(null);

  readonly basePath = computed(() => (this.auth.profile()?.role === 'trainer' ? '/trainer' : '/my-plan'));

  async ngOnInit(): Promise<void> {
    await this.reload();
    this.loading.set(false);
  }

  phaseCount(programId: string): number {
    return this.phasesOf(programId).length;
  }

  weeks(programId: string): number {
    return totalWeeks(this.phasesOf(programId));
  }

  async follow(program: Program): Promise<void> {
    const userId = this.auth.profile()?.id;
    if (!userId) return;
    if ((await this.service.follow(userId, program.id)) === null) this.followingId.set(program.id);
  }

  async remove(program: Program): Promise<void> {
    if (!confirm(`${program.title}: ${this.language.t('program.delete.confirm')}`)) return;
    if ((await this.service.remove(program.id)) === null) await this.reload();
  }

  private phasesOf(programId: string): ProgramPhase[] {
    return this.phases().filter(p => p.program_id === programId);
  }

  private async reload(): Promise<void> {
    const userId = this.auth.profile()?.id;
    if (!userId) return;
    const [programs, active] = await Promise.all([
      this.service.loadMine(userId),
      this.service.loadActive(userId),
    ]);
    this.programs.set(programs);
    this.followingId.set(active?.program.id ?? null);
    this.phases.set(await this.service.loadPhases(programs.map(p => p.id)));
  }
}
