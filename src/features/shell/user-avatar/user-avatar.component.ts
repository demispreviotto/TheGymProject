import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { initials } from '../../../shared/utils/initials';

/** Profile shortcut for the mobile top bar: the user's initials on the tenant colour, with an optional alert dot. */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <a
      routerLink="/profile"
      class="-mr-1.5 flex h-11 w-11 items-center justify-center"
      [attr.aria-label]="('nav.profile.open' | translate) + (showDot() ? ', ' + ('nav.pending' | translate) : '')"
    >
      <span class="relative flex h-9 w-9 items-center justify-center rounded-full bg-tenant-primary text-sm font-bold text-tenant-contrast transition-opacity hover:opacity-90">
        {{ text() }}
        @if (showDot()) {
          <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-neutral-950" aria-hidden="true"></span>
        }
      </span>
    </a>
  `,
})
export class UserAvatarComponent {
  readonly name = input<string | null>(null);
  readonly showDot = input(false);

  readonly text = computed(() => initials(this.name()));
}
