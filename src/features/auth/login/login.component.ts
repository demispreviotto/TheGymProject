import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  async onSubmit(): Promise<void> {
    this.error.set(null);
    this.submitting.set(true);
    const err = await this.auth.signIn(this.email(), this.password());
    if (err) this.error.set(err);
    this.submitting.set(false);
  }
}
