import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlanningService } from '../../services/planning.service';
import { AuthService } from '../../services/auth.service';

type Day = { value: number; label: string };

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planning.html',
})
export class Planning implements OnInit {
  loading = false;
  error: string | null = null;

  planning: any = null;
  evenements: any[] = [];

  days: Day[] = [
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' },
    { value: 7, label: 'Dimanche' },
  ];

  eventsByDay: Record<number, any[]> = {};
  showEventForm = false;

  // ✅ min date côté UI (lundi de la semaine en cours)
  minStartDate = '';

  // Form planning
  planningForm = {
    title: '',
    start_date: '',
    end_date: '',
  };

  // Form event (day_of_week = 1..7)
  eventForm: {
    stream_title: string;
    day_of_week: number | null;
    start_time: string;
    end_time: string;
  } = {
    stream_title: '',
    day_of_week: null,
    start_time: '',
    end_time: '',
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

    // ✅ calcule une fois
    this.minStartDate = this.getMondayOfCurrentWeekYMD();

    this.initEmptyEventsByDay();
    this.loadPlanning();
  }

  // ✅ lundi de la semaine en cours au format YYYY-MM-DD
  private getMondayOfCurrentWeekYMD(): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const day = now.getDay(); // 0=Dim..6=Sam
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private initEmptyEventsByDay() {
    const map: Record<number, any[]> = {};
    for (const d of this.days) map[d.value] = [];
    this.eventsByDay = map;
  }

  private rebuildEventsByDay() {
    const map: Record<number, any[]> = {};
    for (const d of this.days) map[d.value] = [];

    for (const ev of this.evenements || []) {
      const day = Number(ev.day_of_week);
      if (!Number.isFinite(day)) continue;
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    }

    for (const key of Object.keys(map)) {
      const k = Number(key);
      map[k].sort((a, b) =>
        String(a.start_time ?? '').localeCompare(String(b.start_time ?? ''))
      );
    }

    this.eventsByDay = map;
  }

  getEventsForDay(day: number): any[] {
    return this.eventsByDay?.[day] || [];
  }

  getEventId(ev: any): number {
    return ev.id_evenement;
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

  openAddEvent(dayValue: number) {
    this.error = null;

    this.eventForm = {
      stream_title: '',
      day_of_week: dayValue,
      start_time: '',
      end_time: '',
    };

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
        this.planning = res?.planning ?? null;
        this.evenements = res?.evenements ?? [];
        this.rebuildEventsByDay();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur chargement planning');
        this.cdr.detectChanges();
      },
    });
  }

  createPlanning() {
    this.error = null;

    if (!this.planningForm.title || !this.planningForm.start_date) {
      this.error = 'Titre et date de début obligatoires';
      this.cdr.detectChanges();
      return;
    }

    // ✅ BLOQUAGE FRONT : pas de semaine avant la semaine en cours
    const mondayThisWeek = this.minStartDate || this.getMondayOfCurrentWeekYMD();
    if (this.planningForm.start_date < mondayThisWeek) {
      this.error = `Impossible de créer un planning avant la semaine en cours (à partir du ${mondayThisWeek}).`;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.planningService
      .createPlanning({
        title: this.planningForm.title,
        start_date: this.planningForm.start_date,
        end_date: this.planningForm.end_date || null,
      })
      .subscribe({
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
        },
      });
  }

  addEvenement() {
    this.error = null;

    if (!this.planning) {
      this.error = 'Crée d’abord un planning';
      this.cdr.detectChanges();
      return;
    }

    const day = this.eventForm.day_of_week;

    if (!this.eventForm.stream_title || !day || !this.eventForm.start_time) {
      this.error = 'Titre, jour et heure de début obligatoires';
      this.cdr.detectChanges();
      return;
    }

    if (day < 1 || day > 7) {
      this.error = 'Jour invalide (1-7)';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.planningService
      .addEvenement(this.planning.Id_Planning, {
        stream_title: this.eventForm.stream_title,
        day_of_week: day,
        start_time: this.eventForm.start_time,
        end_time: this.eventForm.end_time || null,
      } as any)
      .subscribe({
        next: () => {
          this.showEventForm = false;
          this.loading = false;
          this.cdr.detectChanges();
          this.loadPlanning();
        },
        error: (err) => {
          this.loading = false;
          this.handleHttpError(err, 'Erreur ajout événement');
          this.cdr.detectChanges();
        },
      });
  }

  formatPlanningRange(start: string, end: string): string {
    if (!start) return '';

    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    const startDay = startDate.getDate();
    const endDay = endDate?.getDate();

    const month = startDate.toLocaleDateString('fr-FR', { month: 'long' });
    const year = startDate.getFullYear();

    if (endDate) {
      return `${startDay} → ${endDay} ${month} ${year}`;
    }

    return `${startDay} ${month} ${year}`;
  }

  deleteEvenement(eventId: number) {
    this.error = null;
    if (!eventId) return;

    this.loading = true;
    this.cdr.detectChanges();

    this.planningService.deleteEvenement(eventId).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.loadPlanning();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur suppression événement');
        this.cdr.detectChanges();
      },
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
      },
    });
  }
}
