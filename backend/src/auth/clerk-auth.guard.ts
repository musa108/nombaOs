import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // For webhook endpoint, verify Clerk signature
    const svixId = request.headers['svix-id'];
    const svixTimestamp = request.headers['svix-timestamp'];
    const svixSignature = request.headers['svix-signature'];

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException('Missing Clerk webhook headers');
    }

    const webhookSecret = this.config.get('CLERK_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    // Verify the webhook signature
    const body = JSON.stringify(request.body);
    const toSign = `${svixId}.${svixTimestamp}.${body}`;
    const secretBytes = Buffer.from(webhookSecret.split('_')[1], 'base64');
    const hmac = crypto.createHmac('sha256', secretBytes);
    hmac.update(toSign);
    const signature = `v1,${hmac.digest('base64')}`;

    if (signature !== svixSignature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
