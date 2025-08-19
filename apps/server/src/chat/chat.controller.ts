import { Body, Controller, Delete, Get, Inject, Post, Query, Request, UseGuards } from '@nestjs/common';
import type { Request as HttpRequest } from "express";
import { JwtAuthGuard } from '../../../../libs/prisma/src/guards/jwt.guard';
import { ChatService } from './chat.service';
import { AddNewChatDTO, NewMediaDTO, NewMessageDTO } from './dtos/chat.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {

    constructor(
        @Inject("MEDIA_SERVICE") private client: ClientProxy,
        private chatService: ChatService) { }

    @Get('all')
    async getAllChats(@Request() req: HttpRequest) {
        return await this.chatService.getUserChats(req.user!.id, req.user!.type);
    }

    @Get('videoRequest')
    getVideoRequest() {

    }

    @Get('')
    getChatData() {

    }

    @Post('signedUrl')
    async getSignedUrl(@Body() data: NewMediaDTO, @Request() req: HttpRequest): Promise<string> {
        const key = await this.chatService.getSignedUrl(data, req.user!);
        return await firstValueFrom(this.client.send({ cmd: "signed_url" }, { key, contentType: data.contentType }));
    }

    @Post('')
    async addNewChat(@Body() body: AddNewChatDTO, @Request() req: HttpRequest) {
        return await this.chatService.addNewChat(body.editorId, req.user!);
    }

    @Post('/message')
    async addNewMessage(@Body() body: NewMessageDTO, @Request() req: HttpRequest) {
        return await this.chatService.addNewMessage(body, req.user!);
    }

    @Post('videoRequest')
    addNewVideoRequest() {

    }

    @Delete('')
    async removeChat(@Request() req: HttpRequest, @Query('id') id: string) {
        return await this.chatService.removeChat(req.user!, id)
    }
}
