
import { PrismaService } from '@creatorsync/prisma/prisma.service';
import {
    CanActivate,
    ExecutionContext,
    Injectable
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest<Request>();

        const token = this.extractTokenFromHeader(request);
        if (!token) {
            return false;
        }

        try {
            const payload: { userId: string, type: string } = this.jwtService.verify(token);

            const user = await this.prisma.user.findUnique({
                where: {
                    id: payload.userId
                },
                select: {
                    id: true,
                    username: true,
                    type: true,
                    youtubeRefreshToken: true
                }
            });

            if (!user) {
                return false;
            }

            request.user = {
                id: user.id,
                isYoutubeConnected: user.youtubeRefreshToken != null,
                username: user.username,
                type: user.type
            };
            return true;
        } catch {
            return false;
        }
    }

    extractTokenFromHeader(request: Request): string | undefined {
        const cookies = request.cookies as Record<string, string> | undefined;
        return cookies?.jwt;
    }
}