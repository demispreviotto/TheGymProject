import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';

const CIRCLE_BASE = 'relative flex h-9 w-9 items-center justify-center rounded-full bg-tenant-primary text-tenant-contrast transition-opacity hover:opacity-90';
const CIRCLE_ACTIVE = 'ring-2 ring-neutral-100 ring-offset-2 ring-offset-neutral-950';

/**
 * The way into the profile on mobile: a user icon on the tenant colour, with an optional alert dot.
 * It is ringed while the profile page is open, since Profile is not a bottom tab.
 */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, AppIconComponent],
  template: `
    <a
      routerLink="/profile"
      class="-mr-1.5 flex h-11 w-11 items-center justify-center"
      [attr.aria-current]="active() ? 'page' : null"
      [attr.aria-label]="('nav.profile.open' | translate) + (showDot() ? ', ' + ('nav.pending' | translate) : '')"
    >
      <span [class]="circleClass()">
        <app-icon name="user" iconClass="w-5 h-5 fill-current" />
        @if (showDot()) {
          <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-neutral-950" aria-hidden="true"></span>
        }
      </span>
    </a>
  `,
})
export class UserAvatarComponent {
  readonly showDot = input(false);
  /** The profile page is the current page. */
  readonly active = input(false);

  readonly circleClass = computed(() => (this.active() ? `${CIRCLE_BASE} ${CIRCLE_ACTIVE}` : CIRCLE_BASE));
}
