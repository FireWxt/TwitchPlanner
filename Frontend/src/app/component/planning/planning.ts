import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PlanningService } from '../../services/planning.service';
import { AuthService } from '../../services/auth.service';
import html2canvas from 'html2canvas';

import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { IgdbService, IgdbGame } from '../../services/igdb.service';

type Day = { value: number; label: string };

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './planning.html',
  styleUrls: ['./planning.scss']
})
export class Planning implements OnInit {
  @ViewChild('planningGrid') planningGrid!: ElementRef;

  loading = false;
  error: string | null = null;

  planning: any = null;
  evenements: any[] = [];
  plannings: any[] = []; // Liste de tous les plannings

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
  editingEventId: number | null = null;

  minStartDate = '';

  // IGDB autocomplete
  private gameSearch$ = new Subject<string>();
  gameResults: IgdbGame[] = [];
  showGameDropdown = false;
  isSearchingGames = false;

  // Form planning
  planningForm = {
    title: '',
    start_date: '',
    end_date: '',
  };

  // Form event (day_of_week = 1..7) + IGDB
  eventForm: {
    stream_title: string;
    day_of_week: number | null;
    start_time: string;
    end_time: string;

    game_query: string;
    game_igdb_id: number | null;
    game_name: string;
    game_cover_url: string | null;
  } = {
    stream_title: '',
    day_of_week: null,
    start_time: '',
    end_time: '',

    game_query: '',
    game_igdb_id: null,
    game_name: '',
    game_cover_url: null,
  };

  constructor(
    private planningService: PlanningService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private igdbService: IgdbService
  ) {}

  ngOnInit(): void {
    const token = this.auth.getToken?.() ?? localStorage.getItem('token');
    if (!token) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.minStartDate = this.getMondayOfCurrentWeekYMD();

    this.initEmptyEventsByDay();
    this.loadPlannings();

    // IGDB: abonnement recherche (debounce)
    this.gameSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const query = (q || '').trim();
          if (query.length < 2) {
            this.gameResults = [];
            this.showGameDropdown = false;
            this.isSearchingGames = false;
            this.cdr.detectChanges();
            return of([]);
          }
          this.isSearchingGames = true;
          this.cdr.detectChanges();
          return this.igdbService.searchGames(query).pipe(
            catchError(() => of([]))
          );
        })
      )
      .subscribe((games) => {
        this.isSearchingGames = false;
        this.gameResults = games;
        this.showGameDropdown = games.length > 0;
        this.cdr.detectChanges();
      });
  }

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

  // ===== IGDB handlers =====

  onGameInput(value: string) {
    // l'utilisateur retape => on désélectionne le jeu
    this.eventForm.game_query = value;
    this.eventForm.game_igdb_id = null;
    this.eventForm.game_name = '';
    this.eventForm.game_cover_url = null;

    this.gameSearch$.next(value);
  }

  selectGame(game: IgdbGame) {
    this.eventForm.game_query = game.name;
    this.eventForm.game_igdb_id = game.id;
    this.eventForm.game_name = game.name;
    this.eventForm.game_cover_url = game.cover;

    this.showGameDropdown = false;
    this.cdr.detectChanges();
  }

  hideGameDropdownSoon() {
    setTimeout(() => {
      this.showGameDropdown = false;
      this.cdr.detectChanges();
    }, 150);
  }

  // ===== UI event form =====

  openAddEvent(dayValue: number) {
    this.error = null;
    this.editingEventId = null;

    this.eventForm = {
      stream_title: '',
      day_of_week: dayValue,
      start_time: '',
      end_time: '',

      game_query: '',
      game_igdb_id: null,
      game_name: '',
      game_cover_url: null,
    };

    this.gameResults = [];
    this.showGameDropdown = false;
    this.isSearchingGames = false;

    this.showEventForm = true;
    this.cdr.detectChanges();
  }

  openEditEvent(event: any) {
    this.error = null;
    this.editingEventId = this.getEventId(event);

    // Formater l'heure (enlever les secondes si présentes)
    const formatTime = (t: string) => t ? t.substring(0, 5) : '';

    this.eventForm = {
      stream_title: event.stream_title || '',
      day_of_week: event.day_of_week,
      start_time: formatTime(event.start_time),
      end_time: formatTime(event.end_time),

      game_query: event.game_name || '',
      game_igdb_id: event.game_igdb_id || null,
      game_name: event.game_name || '',
      game_cover_url: event.game_cover_url || null,
    };

    this.gameResults = [];
    this.showGameDropdown = false;
    this.isSearchingGames = false;

    this.showEventForm = true;
    this.cdr.detectChanges();
  }

  closeAddEvent() {
    this.showEventForm = false;
    this.editingEventId = null;
    this.cdr.detectChanges();
  }

  loadPlannings() {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.planningService.getMyPlannings().subscribe({
      next: (res: any) => {
        this.plannings = res?.plannings ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur chargement liste plannings');
        this.cdr.detectChanges();
      },
    });
  }

  selectPlanning(p: any) {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.planningService.getPlanningById(p.Id_Planning).subscribe({
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

  backToList() {
    this.planning = null;
    this.evenements = [];
    this.initEmptyEventsByDay();
    this.cdr.detectChanges();
  }

  async downloadPlanning() {
    if (!this.planningGrid?.nativeElement) return;

    try {
      const canvas = await html2canvas(this.planningGrid.nativeElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `planning-${this.planning?.title || 'stream'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Erreur téléchargement planning:', err);
      this.error = 'Erreur lors du téléchargement';
      this.cdr.detectChanges();
    }
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
          this.loadPlannings();
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

    const payload = {
      stream_title: this.eventForm.stream_title,
      day_of_week: day,
      start_time: this.eventForm.start_time,
      end_time: this.eventForm.end_time || null,
      game_igdb_id: this.eventForm.game_igdb_id,
      game_name: this.eventForm.game_name,
      game_cover_url: this.eventForm.game_cover_url,
    };

    const request$ = this.editingEventId
      ? this.planningService.updateEvenement(this.editingEventId, payload as any)
      : this.planningService.addEvenement(this.planning.Id_Planning, payload as any);

    request$.subscribe({
      next: () => {
        this.showEventForm = false;
        this.editingEventId = null;
        this.loading = false;
        this.cdr.detectChanges();
        this.selectPlanning(this.planning);
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, this.editingEventId ? 'Erreur modification événement' : 'Erreur ajout événement');
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
        // Recharger le planning sélectionné
        this.selectPlanning(this.planning);
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
        this.loadPlannings();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur suppression planning');
        this.cdr.detectChanges();
      },
    });
  }

  deletePlanningById(planningId: number, event: Event) {
    event.stopPropagation();

    if (!confirm('Supprimer ce planning ?')) return;

    this.error = null;
    this.loading = true;
    this.cdr.detectChanges();

    this.planningService.deletePlanning(planningId).subscribe({
      next: () => {
        this.loading = false;
        this.loadPlannings();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.handleHttpError(err, 'Erreur suppression planning');
        this.cdr.detectChanges();
      },
    });
  }
}
