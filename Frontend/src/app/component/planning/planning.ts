import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlanningService } from '../../services/planning.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planning.html'
})
export class Planning implements OnInit {

  loading = false;
  error: string | null = null;

  planning: any = null;
  evenements: any[] = [];

  // Form planning
  planningForm = {
    title: '',
    start_date: '',
    end_date: ''
  };

  // Form event
  eventForm = {
    stream_title: '',
    day_of_week: '',
    start_time: '',
    end_time: ''
  };

  constructor(
    private planningService: PlanningService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Si pas de token, inutile de charger -> redirection login
    const token = this.auth.getToken?.() ?? localStorage.getItem('token');
    if (!token) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadPlanning();
  }

  private handleHttpError(err: any, fallback: string) {
    // Ton backend renvoie souvent { error: "..." }
    const apiMessage = err?.error?.error || err?.error?.message;

    // Cas typiques middleware
    if (err?.status === 401) {
      // Token manquant / invalide / expiré / appareil non reconnu
      this.error = apiMessage || 'Session expirée. Reconnecte-toi.';
      // On logout + redirect (optionnel mais pratique)
      this.auth.logout?.();
      localStorage.removeItem('token');
      this.router.navigateByUrl('/login');
      return;
    }

    if (err?.status === 403) {
      // Nonce invalide (requireNonce) :contentReference[oaicite:0]{index=0}
      this.error = apiMessage || 'Requête refusée (nonce invalide).';
      return;
    }

    this.error = apiMessage || fallback;
  }

  loadPlanning() {
    this.loading = true;
    this.error = null;

    this.planningService.getMyPlanning().subscribe({
      next: (res: any) => {
        this.planning = res.planning;
        this.evenements = res.evenements || [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur chargement planning');
      }
    });
  }

  createPlanning() {
    this.error = null;

    if (!this.planningForm.title || !this.planningForm.start_date) {
      this.error = 'Titre et date de début obligatoires';
      return;
    }

    this.loading = true;
    this.planningService.createPlanning({
      title: this.planningForm.title,
      start_date: this.planningForm.start_date,
      end_date: this.planningForm.end_date || null
    }).subscribe({
      next: () => {
        this.planningForm = { title: '', start_date: '', end_date: '' };
        this.loading = false;
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur création planning');
      }
    });
  }

  addEvenement() {
    this.error = null;

    if (!this.planning) {
      this.error = 'Crée d’abord un planning';
      return;
    }

    if (!this.eventForm.stream_title || !this.eventForm.day_of_week || !this.eventForm.start_time) {
      this.error = 'Tous les champs obligatoires doivent être remplis';
      return;
    }

    this.loading = true;
    this.planningService.addEvenement(this.planning.Id_Planning, {
      stream_title: this.eventForm.stream_title,
      day_of_week: this.eventForm.day_of_week,
      start_time: this.eventForm.start_time,
      end_time: this.eventForm.end_time || null
    }).subscribe({
      next: () => {
        this.eventForm = { stream_title: '', day_of_week: '', start_time: '', end_time: '' };
        this.loading = false;
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur ajout événement');
      }
    });
  }

  deleteEvenement(id: number) {
    this.error = null;
    this.loading = true;

    this.planningService.deleteEvenement(id).subscribe({
      next: () => {
        this.loading = false;
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur suppression événement');
      }
    });
  }

  deletePlanning() {
    this.error = null;
    if (!this.planning) return;

    this.loading = true;
    this.planningService.deletePlanning(this.planning.Id_Planning).subscribe({
      next: () => {
        this.loading = false;
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur suppression planning');
      }
    });
  }
}
