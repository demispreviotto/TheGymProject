import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SnapPanelsComponent } from '../../../shared/components/snap-panels/snap-panels.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ExerciseListComponent } from '../exercises/exercise-list/exercise-list.component';
import { PlanningListComponent } from '../planning/planning-list/planning-list.component';

/** Trainer home: training plans and exercises on one page, switched between (one at a time, no split view). */
@Component({
  selector: 'app-trainer-library-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SnapPanelsComponent, PlanningListComponent, ExerciseListComponent, TranslatePipe],
  template: `
    <app-snap-panels
      [firstLabel]="'planning.title' | translate"
      [secondLabel]="'exercises.title' | translate"
      [allowSplit]="false"
    >
      <app-planning-list first embedded />
      <app-exercise-list second embedded />
    </app-snap-panels>
  `,
})
export class TrainerLibraryPageComponent {}
