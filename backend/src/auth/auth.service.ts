import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async syncClerkUser(clerkId: string, email: string, name: string) {
    let user = await this.prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { clerkId, email, name },
      });
    } else {
      user = await this.prisma.user.update({
        where: { clerkId },
        data: { email, name },
      });
    }

    const token = this.jwtService.sign({ sub: user.id, clerkId: user.clerkId });
    return { user, token };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async deleteUser(clerkId: string) {
    await this.prisma.user.deleteMany({ where: { clerkId } });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });
  }
}
