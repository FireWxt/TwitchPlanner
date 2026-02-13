import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private API = 'http://localhost:3000/api/planning';

  constructor(private http: HttpClient) {}


  getMyPlanning() {
    return this.http.get<{ planning: any; evenements: any[] }>(`${this.API}/me`);
  }

  createPlanning(payload: { title: string; start_date: string; end_date?: string | null }) {
    return this.http.post(`${this.API}`, payload);
  }


  addEvenement(planningId: number, payload: {
    stream_title: string;
    day_of_week: number; 
    start_time: string;  
    end_time?: string | null;
  }) {
    console.log("Jour de la semaine ", payload.day_of_week);
    return this.http.post(`${this.API}/${planningId}/evenement`, payload);
  }

  deleteEvenement(eventId: number) {
    return this.http.delete(`${this.API}/evenement/${eventId}`);
  }

  deletePlanning(planningId: number) {
    return this.http.delete(`${this.API}/${planningId}`);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
