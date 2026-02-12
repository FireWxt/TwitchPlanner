import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

  days = [
    { key: 'Lundi', label: 'Lundi' },
    { key: 'Mardi', label: 'Mardi' },
    { key: 'Mercredi', label: 'Mercredi' },
    { key: 'Jeudi', label: 'Jeu' },
    { key: 'Vendredi', label: 'Ven' },
    { key: 'Samedi', label: 'Sam' },
    { key: 'Dimanche', label: 'Dim' },
  ];

  eventsByDay: Record<string, any[]> = {};
  showEventForm = false;

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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const token = this.auth.getToken?.() ?? localStorage.getItem('token');
    if (!token) {
      this.router.navigateByUrl('/login');
      return;
    }

    // init map vide
    this.rebuildEventsByDay();
    this.loadPlanning();
  }

  private handleHttpError(err: any, fallback: string) {
    const apiMessage = err?.error?.error || err?.error?.message;

    if (err?.status === 401) {
      this.error = apiMessage || 'Session expirée. Reconnecte-toi.';
      this.auth.logout?.();
      localStorage.removeItem('token');
      this.cdr.detectChanges();
      this.router.navigateByUrl('/login');
      return;
    }

    if (err?.status === 403) {
      this.error = apiMessage || 'Requête refusée (nonce invalide).';
      this.cdr.detectChanges();
      return;
    }

    this.error = apiMessage || fallback;
    this.cdr.detectChanges();
  }

  
  private rebuildEventsByDay() {
    const map: Record<string, any[]> = {};
    for (const d of this.days) map[d.key] = [];

    for (const ev of (this.evenements || [])) {
      const key = ev.day_of_week;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }

    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    }

    this.eventsByDay = map;
  }


  openAddEvent(dayKey: string) {
    this.error = null;
    this.eventForm.day_of_week = dayKey;
    this.showEventForm = true;
    this.cdr.detectChanges();
  }

  closeAddEvent() {
    this.showEventForm = false;
    this.cdr.detectChanges();
  }

  loadPlanning() {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.planningService.getMyPlanning().subscribe({
      next: (res: any) => {
        this.planning = res.planning;
        this.evenements = res.evenements || [];
        this.rebuildEventsByDay();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur chargement planning');
        this.cdr.detectChanges();
      }
    });
  }

  createPlanning() {
    this.error = null;

    if (!this.planningForm.title || !this.planningForm.start_date) {
      this.error = 'Titre et date de début obligatoires';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.planningService.createPlanning({
      title: this.planningForm.title,
      start_date: this.planningForm.start_date,
      end_date: this.planningForm.end_date || null
    }).subscribe({
      next: () => {
        this.planningForm = { title: '', start_date: '', end_date: '' };
        this.loading = false;
        this.cdr.detectChanges();
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur création planning');
        this.cdr.detectChanges();
      }
    });
  }

  addEvenement() {
    this.error = null;

    if (!this.planning) {
      this.error = 'Crée d’abord un planning';
      this.cdr.detectChanges();
      return;
    }

    if (!this.eventForm.stream_title || !this.eventForm.day_of_week || !this.eventForm.start_time) {
      this.error = 'Tous les champs obligatoires doivent être remplis';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.planningService.addEvenement(this.planning.Id_Planning, {
      stream_title: this.eventForm.stream_title,
      day_of_week: this.eventForm.day_of_week,
      start_time: this.eventForm.start_time,
      end_time: this.eventForm.end_time || null
    }).subscribe({
      next: () => {
        this.eventForm = { stream_title: '', day_of_week: '', start_time: '', end_time: '' };
        this.showEventForm = false;
        this.loading = false;
        this.cdr.detectChanges();
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur ajout événement');
        this.cdr.detectChanges();
      }
    });
  }

  deleteEvenement(id: number) {
    this.error = null;
    this.loading = true;
    this.cdr.detectChanges();

    this.planningService.deleteEvenement(id).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur suppression événement');
        this.cdr.detectChanges();
      }
    });
  }

  deletePlanning() {
    this.error = null;
    if (!this.planning) return;

    this.loading = true;
    this.cdr.detectChanges();

    this.planningService.deletePlanning(this.planning.Id_Planning).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur suppression planning');
        this.cdr.detectChanges();
      }
    });
  }


  getEventsForDay(dayKey: string): any[] {
    return this.eventsByDay?.[dayKey] || [];
  }

  getEventId(ev: any): number {
    return ev?.Id_Evenement ?? ev?.id ?? ev?.Id_Event ?? ev?.Id_evenement;
  }
}
