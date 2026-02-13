import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface MeResponse {
  Id_USER: number;
  email: string;
  created_at: Date;
  twitch_url: string | null;
  avatar_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = 'http://localhost:3000/api/profile';

  constructor(private http: HttpClient) {}


me() {
  return this.http.get<any>(`${this.api}/me`, {
    params: { t: Date.now() }
  }).pipe(
    tap({
      next: (x) => console.log('UserService.me NEXT', x),
      error: (e) => console.log('UserService.me ERROR', e),
      complete: () => console.log('UserService.me COMPLETE'),
    })
  );
}


  updateMe(payload: { email: string; twitch_url: string | null; avatar_url: string | null }): Observable<MeResponse> {
    return this.http.put<MeResponse>(`${this.api}/me`, payload);
  }

  uploadAvatar(file: File): Observable<{ avatar_url: string }> {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http.post<{ avatar_url: string }>(`${this.api}/me/avatar`, fd);
  }

  changePassword(payload: { currentPassword: string; newPassword: string }): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`${this.api}/me/password`, payload);
  }
}
