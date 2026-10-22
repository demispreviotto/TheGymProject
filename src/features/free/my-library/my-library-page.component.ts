import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SnapPanelsComponent } from '../../../shared/components/snap-panels/snap-panels.component';
import { layoutFromView } from '../../../shared/components/snap-panels/snap-panels.layout';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ProgramListComponent } from '../../program/program-list/program-list.component';
import { ExerciseListComponent } from '../../trainer/exercises/exercise-list/exercise-list.component';
import { MyPlanningListComponent } from '../my-planning-list/my-planning-list.component';

/** Free and admin users' training library: their programs, plans and exercises on one page, switched between (one at a time, no split view). */
@Component({
  selector: 'app-my-library-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SnapPanelsComponent, ProgramListComponent, MyPlanningListComponent, ExerciseListComponent, TranslatePipe],
  template: `
    <app-snap-panels
      [firstLabel]="'myplan.programs.title' | translate"
      [secondLabel]="'myplan.planning.title' | translate"
      [thirdLabel]="'myplan.exercises.title' | translate"
      [layout]="initialLayout"
      [allowSplit]="false"
    >
      <app-program-list first embedded titleKey="myplan.programs.title" />
      <app-my-planning-list second embedded />
      <app-exercise-list
        third
        embedded
        titleKey="myplan.exercises.title"
        newRoute="/my-plan/exercises/new"
      />
    </app-snap-panels>
  `,
})
export class MyLibraryPageComponent {
  /** Plans by default; ?view=programs or ?view=exercises opens that panel (a form back-link uses it). */
  readonly initialLayout = layoutFromView(inject(ActivatedRoute).snapshot.queryParamMap.get('view'));
}
