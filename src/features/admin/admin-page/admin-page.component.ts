import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SnapPanelsComponent } from '../../../shared/components/snap-panels/snap-panels.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AdminInviteRequestsComponent } from '../invite-requests/admin-invite-requests.component';
import { AdminUsersComponent } from '../users/admin-users.component';

/** Admin home: invite requests and users on one page, switched between (one at a time, no split view). */
@Component({
  selector: 'app-admin-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SnapPanelsComponent, AdminInviteRequestsComponent, AdminUsersComponent, TranslatePipe],
  template: `
    <app-snap-panels
      [firstLabel]="'admin.requests.short' | translate"
      [secondLabel]="'admin.users.title' | translate"
      [allowSplit]="false"
    >
      <app-admin-invite-requests first embedded />
      <app-admin-users second embedded />
    </app-snap-panels>
  `,
})
export class AdminPageComponent {}
