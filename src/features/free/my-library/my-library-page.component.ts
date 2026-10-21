import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SnapPanelsComponent } from '../../../shared/components/snap-panels/snap-panels.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ExerciseListComponent } from '../../trainer/exercises/exercise-list/exercise-list.component';
import { MyPlanningListComponent } from '../my-planning-list/my-planning-list.component';

/** Free and admin users' training library: their plans and their exercises on one page, switched between (one at a time, no split view). */
@Component({
  selector: 'app-my-library-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SnapPanelsComponent, MyPlanningListComponent, ExerciseListComponent, TranslatePipe],
  template: `
    <app-snap-panels
      [firstLabel]="'myplan.planning.title' | translate"
      [secondLabel]="'myplan.exercises.title' | translate"
      [allowSplit]="false"
    >
      <app-my-planning-list first embedded />
      <app-exercise-list
        second
        embedded
        titleKey="myplan.exercises.title"
        newRoute="/my-plan/exercises/new"
      />
    </app-snap-panels>
  `,
})
export class MyLibraryPageComponent {}
