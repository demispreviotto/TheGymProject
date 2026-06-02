import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-tenant-branding',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2">
      @if (safeSvg()) {
        <span class="h-7 w-7 flex-shrink-0 bg-[hsl(var(--tenant-primary))] rounded-[18%] p-1" [innerHTML]="safeSvg()"></span>
      }
      @if (tenantName()) {
        <span class="text-sm font-semibold text-neutral-100 bg-[[hsl(var(--tenant-primary))] rounded-[18%] p-1">{{ tenantName() }}</span>
      }
    </div>
  `,
})
export class TenantBrandingComponent {
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly tenantName = computed(() => this.auth.tenant()?.name ?? null);

  readonly safeSvg = computed((): SafeHtml | null => {
    const svg = this.auth.tenant()?.logo_svg;
    if (!svg) return null;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  });
}
