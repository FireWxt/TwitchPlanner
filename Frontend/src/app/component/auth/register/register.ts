import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {

  registerForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      twitch_url: [''],
      logo: ['']
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) return;
    console.log("clicked");

    this.loading = true;
    this.errorMessage = '';

    this.http.post('http://localhost:3000/api/auth/register', this.registerForm.value)
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error.message || 'Erreur lors de l’inscription';
        }
      });
  }
}
