import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NonceService {
  private baseUrl = 'http://localhost:3000';

  async generateNonceFor(pathWithQuery: string): Promise<string> {
    const url = this.baseUrl + pathWithQuery;

    for (let i = 0; i < 5_000_000; i++) {
      const nonce = String(i);
      const hashHex = await this.sha256Hex(url + nonce);
      if (hashHex.startsWith('0000')) return nonce;
    }


    throw new Error('Impossible de générer un nonce (limite atteinte)');
  }

  private async sha256Hex(input: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
