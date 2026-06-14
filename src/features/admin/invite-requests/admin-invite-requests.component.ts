import {
  Component, inject, signal, OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { InviteRequestService } from '../../../core/invite-requests/invite-request.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import type { InviteRequest } from '../../../core/invite-requests/invite-request.service';

@Component({
  selector: 'app-admin-invite-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, SkeletonComponent],
  template: `
    <div>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-neutral-100">{{ 'admin.requests.title' | translate }}</h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            {{ inviteService.pendingCount() }} pending
          </p>
        </div>
      </div>

      @if (loading()) {
        <app-skeleton [count]="3" itemClass="h-20" />
      } @else if (inviteService.allRequests().length === 0) {
        <p class="text-sm text-neutral-500">{{ 'admin.requests.empty' | translate }}</p>
      } @else {
        <div class="rounded-xl border border-neutral-800 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-800 bg-neutral-900">
                <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">{{ 'admin.requests.requester' | translate }}</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden sm:table-cell">{{ 'admin.requests.invitee' | translate }}</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden lg:table-cell">{{ 'admin.requests.reason' | translate }}</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Status</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (req of inviteService.allRequests(); track req.id) {
                <tr class="border-b border-neutral-800 last:border-0">
                  <td class="px-4 py-3">
                    <p class="font-medium text-neutral-100">{{ req.requester?.name ?? '—' }}</p>
                    <p class="text-xs text-neutral-500">{{ req.requester?.email ?? req.requester_id }}</p>
                  </td>
                  <td class="px-4 py-3 hidden sm:table-cell">
                    <p class="text-neutral-200">{{ req.invitee_name }}</p>
                    <p class="text-xs text-neutral-500">{{ req.invitee_email }}</p>
                  </td>
                  <td class="px-4 py-3 hidden lg:table-cell">
                    <p class="text-neutral-400 text-xs max-w-xs truncate" [title]="req.reason">{{ req.reason }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <span [class]="statusClass(req.status)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                      {{ statusLabel(req.status) }}
                    </span>
                    @if (req.reviewer_note) {
                      <p class="text-xs text-neutral-600 mt-0.5 max-w-[120px] truncate" [title]="req.reviewer_note">{{ req.reviewer_note }}</p>
                    }
                  </td>
                  <td class="px-4 py-3">
                    @if (req.status === 'pending') {
                      <div class="flex gap-2 justify-end">
                        <button
                          (click)="approve(req)"
                          [disabled]="processingId() === req.id"
                          class="text-xs px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 border border-green-500/30
                                 hover:bg-green-500/30 disabled:opacity-50 transition-colors">
                          {{ processingId() === req.id ? '…' : ('admin.requests.approve' | translate) }}
                        </button>
                        <button
                          (click)="reject(req)"
                          [disabled]="processingId() === req.id"
                          class="text-xs px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20
                                 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                          {{ 'admin.requests.reject' | translate }}
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (actionError()) {
        <p class="mt-4 rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{{ actionError() }}</p>
      }
    </div>
  `,
})
export class AdminInviteRequestsComponent implements OnInit {
  readonly inviteService = inject(InviteRequestService);

  readonly loading = signal(true);
  readonly processingId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.inviteService.loadAllRequests();
    this.loading.set(false);
  }

  async approve(req: InviteRequest): Promise<void> {
    this.actionError.set(null);
    this.processingId.set(req.id);
    const err = await this.inviteService.approveRequest(req.id, req.invitee_email);
    if (err) this.actionError.set(err);
    this.processingId.set(null);
  }

  async reject(req: InviteRequest): Promise<void> {
    this.actionError.set(null);
    this.processingId.set(req.id);
    const err = await this.inviteService.rejectRequest(req.id);
    if (err) this.actionError.set(err);
    this.processingId.set(null);
  }

  statusClass(status: InviteRequest['status']): string {
    const map = {
      pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border border-green-500/30',
      rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
    return map[status];
  }

  statusLabel(status: InviteRequest['status']): string {
    const map = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
    return map[status];
  }
}
