import { Body, Controller, Get, Post, Request, Response, UseGuards } from '@nestjs/common';
import { AuthInput } from './dtos/auth.dto';
import { AuthService } from './auth.service';
import type { Response as HttpResponse, Request as HttpRequest } from 'express';
import { JwtAuthGuard } from '../../../../libs/prisma/src/guards/jwt.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('signup')
    async signup(@Body() data: AuthInput, @Response({ passthrough: true }) res: HttpResponse) {
        const result = await this.authService.signup(data);

        res.cookie('jwt', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        return 'Authentication successful!'
    }

    @Post('signin')
    async signin(@Body() data: AuthInput, @Response({ passthrough: true }) res: HttpResponse) {
        const result = await this.authService.signin(data);

        res.cookie('jwt', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        return 'Authentication successful!'
    }

    @Get('session')
    @UseGuards(JwtAuthGuard)
    getSession(@Request() req: HttpRequest) {
        return {
            username: req.user?.username,
            userId: req.user!.id,
            type: req.user?.type
        }
    }

    @Get('logout')
    logout(@Response({ passthrough: true }) res: HttpResponse) {
        res.cookie('jwt', '', {
            maxAge: 1
        })
    }
}
