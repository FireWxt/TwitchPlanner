import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MeResponse {
  id: number;
  mail: string;
  avatar_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  // adapte si ton backend tourne sur un autre port
  private api = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient) {}

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.api}/me`);
  }

  uploadAvatar(file: File): Observable<{ avatar_url: string }> {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http.post<{ avatar_url: string }>(`${this.api}/me/avatar`, fd);
  }
}
