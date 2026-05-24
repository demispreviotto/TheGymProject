import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../core/theme/theme.service';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.initialize();
  }
}
