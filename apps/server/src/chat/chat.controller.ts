import { Body, Controller, Delete, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import type { Request as HttpRequest } from "express";
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ChatService } from './chat.service';
import { AddNewChatDTO } from './dtos/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {

    constructor(private chatService: ChatService) { }

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

    @Post('')
    async addNewChat(@Body() body: AddNewChatDTO, @Request() req: HttpRequest) {
        return await this.chatService.addNewChat(body.editorId, req.user!);
    }

    @Post('/message')
    addNewMessage() {

    }

    @Post('videoRequest')
    addNewVideoRequest() {

    }

    @Delete('')
    async removeChat(@Request() req: HttpRequest, @Query('id') id: string) {
        return await this.chatService.removeChat(req.user!, id)
    }
}
