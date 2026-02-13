import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, MeResponse } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  me: MeResponse | null = null;
  loading = false;
  uploading = false;
  error: string | null = null;

  // pour afficher l'image via le backend
  readonly backendBaseUrl = 'http://localhost:3000';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadMe();
  }

  loadMe(): void {
    this.loading = true;
    this.error = null;

    this.userService.me().subscribe({
      next: (data) => {
        this.me = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error ?? 'Impossible de charger le profil';
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Simple check (optionnel)
    if (!file.type.startsWith('image/')) {
      this.error = 'Merci de sélectionner une image (png/jpg/webp…)';
      input.value = '';
      return;
    }

    this.uploading = true;
    this.error = null;

    this.userService.uploadAvatar(file).subscribe({
      next: (res) => {
        if (this.me) {
          this.me = { ...this.me, avatar_url: res.avatar_url };
        }
        this.uploading = false;
        input.value = '';
      },
      error: (err) => {
        this.uploading = false;
        this.error = err?.error?.error ?? 'Upload impossible';
        input.value = '';
      },
    });
  }

  avatarSrc(): string | null {
    if (!this.me?.avatar_url) return null;
    // avatar_url ressemble à "/uploads/avatars/xxx.png"
    return `${this.backendBaseUrl}${this.me.avatar_url}`;
  }
}
