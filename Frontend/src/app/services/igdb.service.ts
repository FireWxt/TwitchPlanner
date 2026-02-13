import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IgdbGame {
  id: number;
  name: string;
  cover: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class IgdbService {

  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  searchGames(query: string): Observable<IgdbGame[]> {
    return this.http.post<IgdbGame[]>(
      `${this.baseUrl}/igdb/games/search`,
      { query }
    );
  }
}
