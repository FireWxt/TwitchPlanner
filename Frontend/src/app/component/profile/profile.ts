import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { UserService, MeResponse } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  me: MeResponse | null = null;

  loading = false;
  saving = false;
  uploading = false;
  changingPwd = false;

  error: string | null = null;
  success: string | null = null;

  // champs formulaire profil
  form = {
    email: '',
    twitch_url: '',
  };

  // champs password
  pwd = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  };

  readonly backendBaseUrl = 'http://localhost:3000';

  constructor(private userService: UserService, private cdr: ChangeDetectorRef) {}



  loadMe(): void {
    console.log('LoadMe called');

    this.loading = true;
    this.error = null;
    this.success = null;

    this.userService.me()
      .pipe(finalize(() => {
        this.loading = false;
        console.log('loading set to false');
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          console.log('ME NEXT in component', data);
          this.me = data;

          // ✅ préremplir
          this.form.email = data.email ?? '';
          this.form.twitch_url = data.twitch_url ?? '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.log('ME ERROR in component', err);
          this.error = err?.error?.error ?? 'Impossible de charger le profil';
          this.cdr.detectChanges();
        },
      });
  }


  
  ngOnInit(): void {
    console.log("Profile component init");
    this.loadMe();
  }
  avatarSrc(): string | null {
    if (!this.me?.avatar_url) return null;
    return `${this.backendBaseUrl}${this.me.avatar_url}`;
  }
  
  saveProfile(): void {
    if (!this.me) return;

    this.saving = true;
    this.error = null;
    this.success = null;

    const email = (this.form.email || '').trim();
    if (!email) {
      this.saving = false;
      this.error = 'Email invalide';
      return;
    }

    const payload = {
      email,
      twitch_url: (this.form.twitch_url || '').trim() || null,
      avatar_url: this.me.avatar_url ?? null,
    };

    this.userService.updateMe(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (updated) => {
          const oldEmail = this.me?.email;
          this.me = updated;
          this.form.email = updated.email ?? '';
          this.form.twitch_url = updated.twitch_url ?? '';

          if (oldEmail && updated.email && oldEmail !== updated.email) {
            this.success = "Profil mis à jour. Comme l'email a changé, reconnecte-toi pour éviter des soucis de session.";
          } else {
            this.success = 'Profil mis à jour.';
          }
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Sauvegarde impossible';
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error = 'Merci de sélectionner une image (png/jpg/webp…)';
      input.value = '';
      return;
    }

    this.uploading = true;
    this.error = null;
    this.success = null;

    this.userService.uploadAvatar(file)
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: (res) => {
          if (this.me) this.me = { ...this.me, avatar_url: res.avatar_url };
          this.success = 'Avatar mis à jour.';
          input.value = '';
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Upload impossible';
          input.value = '';
        },
      });
  }

  changePassword(): void {
    const currentPassword = this.pwd.currentPassword;
    const newPassword = this.pwd.newPassword;
    const confirm = this.pwd.confirmNewPassword;

    this.error = null;
    this.success = null;

    if (!currentPassword || !newPassword || !confirm) {
      this.error = 'Remplis tous les champs mot de passe.';
      return;
    }
    if (newPassword.length < 8) {
      this.error = 'Nouveau mot de passe trop court (min 8).';
      return;
    }
    if (newPassword !== confirm) {
      this.error = 'La confirmation ne correspond pas.';
      return;
    }

    this.changingPwd = true;

    this.userService.changePassword({ currentPassword, newPassword })
      .pipe(finalize(() => (this.changingPwd = false)))
      .subscribe({
        next: () => {
          this.success = 'Mot de passe modifié.';
          this.pwd.currentPassword = '';
          this.pwd.newPassword = '';
          this.pwd.confirmNewPassword = '';
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Changement de mot de passe impossible';
        },
      });
  }
}
