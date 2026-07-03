import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'NombaOS API',
      timestamp: new Date().toISOString(),
    };
  }
}
