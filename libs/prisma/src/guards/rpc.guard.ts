import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { GuardUser } from '../types';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RpcAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const data = context.switchToRpc().getData<{ authToken: string | null | undefined, user: GuardUser | null }>();

        const token = data?.authToken;
        if (!token) throw new RpcException(new UnauthorizedException('No token provided'));

        try {
            const payload: { userId: string, type: string } = await this.jwtService.verifyAsync(token);
            const user = await this.prisma.user.findUnique({
                where: {
                    id: payload.userId
                },
                select: {
                    id: true,
                    username: true,
                    type: true
                }
            });

            if (!user) {
                return false;
            }

            data.user = user;
            return true;
        } catch (err) {
            console.log("ms error: ", err);
            throw new RpcException(new UnauthorizedException('Invalid token'));
        }
    }
}
