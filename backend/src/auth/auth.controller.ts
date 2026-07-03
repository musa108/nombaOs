import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Called by the frontend after Clerk authentication
  @Post('sync')
  async syncUser(
    @Body() dto: { clerkId: string; email: string; name: string },
  ) {
    return this.authService.syncClerkUser(dto.clerkId, dto.email, dto.name);
  }

  // Clerk webhook — receives user.created / user.deleted events.
  // Verify signature in ClerkAuthGuard; register this URL in the Clerk dashboard.
  @UseGuards(ClerkAuthGuard)
  @Post('webhook')
  async handleClerkWebhook(@Body() body: { type: string; data: any }) {
    const { type, data } = body;

    if (type === 'user.created') {
      const email = data.email_addresses?.[0]?.email_address ?? '';
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Merchant';
      await this.authService.syncClerkUser(data.id, email, name);
    }

    if (type === 'user.deleted') {
      await this.authService.deleteUser(data.id);
    }

    return { received: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
