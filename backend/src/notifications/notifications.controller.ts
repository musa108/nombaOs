import { Controller, Get, Put, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  getAll(@Request() req, @Query('unread') unread: string) {
    return this.svc.getNotifications(req.user.business.id, unread === 'true');
  }

  @Get('count')
  getUnreadCount(@Request() req) {
    return this.svc.getUnreadCount(req.user.business.id);
  }

  @Put(':id/read')
  markRead(@Param('id') id: string) {
    return this.svc.markRead(id);
  }

  @Put('read-all')
  markAllRead(@Request() req) {
    return this.svc.markAllRead(req.user.business.id);
  }
}
