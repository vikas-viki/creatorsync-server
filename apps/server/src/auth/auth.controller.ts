import { Body, Controller, Get, InternalServerErrorException, Post, Query, Request, Response, UseGuards } from '@nestjs/common';
import { AuthInput } from './dtos/auth.dto';
import { AuthService } from './auth.service';
import type { Response as HttpResponse, Request as HttpRequest } from 'express';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Get('youtube')
    @UseGuards(JwtAuthGuard)
    async getYoutubeAuthLink(@Request() req: HttpRequest) {
        const url = await this.authService.getYoutubeAuthLink(req.user!);
        if (url) {
            return { url };
        }
        throw new InternalServerErrorException("We couldn’t log you in right now. Please try again later.")
    }

    @Get('youtube/callback')
    @UseGuards(JwtAuthGuard)
    async handleYoutubeAuth(@Query('code') code: string, @Request() req: HttpRequest, @Response({ passthrough: true }) res: HttpResponse) {
        const url = await this.authService.handleYoutubeAuthLink(code, req.user!);
        console.log({ url });
        res.redirect(url);
    }

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
    async getSession(@Request() req: HttpRequest) {
        return {
            username: req.user?.username,
            userId: req.user!.id,
            type: req.user?.type,
            isYoutubeConnected: req.user?.isYoutubeConnected
        }
    }

    @Get('logout')
    logout(@Response({ passthrough: true }) res: HttpResponse) {
        res.cookie('jwt', '', {
            maxAge: 1
        })
    }
}
