import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SnapPanelsComponent } from '../../../shared/components/snap-panels/snap-panels.component';
import { layoutFromView } from '../../../shared/components/snap-panels/snap-panels.layout';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ProgramListComponent } from '../../program/program-list/program-list.component';
import { ExerciseListComponent } from '../exercises/exercise-list/exercise-list.component';
import { PlanningListComponent } from '../planning/planning-list/planning-list.component';

/** Trainer home: programs, training plans and exercises on one page, switched between (one at a time, no split view). */
@Component({
  selector: 'app-trainer-library-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SnapPanelsComponent, ProgramListComponent, PlanningListComponent, ExerciseListComponent, TranslatePipe],
  template: `
    <app-snap-panels
      [firstLabel]="'program.title' | translate"
      [secondLabel]="'planning.title' | translate"
      [thirdLabel]="'exercises.title' | translate"
      [layout]="initialLayout"
      [allowSplit]="false"
    >
      <app-program-list first embedded />
      <app-planning-list second embedded />
      <app-exercise-list third embedded />
    </app-snap-panels>
  `,
})
export class TrainerLibraryPageComponent {
  /** Plans by default; ?view=programs or ?view=exercises opens that panel (a form back-link uses it). */
  readonly initialLayout = layoutFromView(inject(ActivatedRoute).snapshot.queryParamMap.get('view'));
}
