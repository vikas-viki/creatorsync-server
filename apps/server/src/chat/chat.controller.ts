import { Body, Controller, Delete, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import type { Request as HttpRequest } from "express";
import { JwtAuthGuard } from '../../../../libs/prisma/src/guards/jwt.guard';
import { ChatService } from './chat.service';
import { AddNewChatDTO, NewMediaDTO, NewMessageDTO, NewVideoRequestDTO } from './dtos/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {

    constructor(
        private chatService: ChatService) { }

    @Get('all')
    async getAllChats(@Request() req: HttpRequest) {
        return await this.chatService.getUserChats(req.user!.id, req.user!.type);
    }

    @Post('message/videoRequest')
    async getVideoRequest(@Request() req: HttpRequest, @Body() data: NewVideoRequestDTO) {
        return await this.chatService.addNewVideoRequest(req.user!, data);
    }

    @Get('')
    async getChatData(@Query('id') id: string, @Request() req: HttpRequest) {
        return await this.chatService.getChatData(id, req.user!);
    }

    @Post('message/media')
    async mediaMessage(@Body() data: NewMediaDTO, @Request() req: HttpRequest): Promise<string> {
        return await this.chatService.mediaMessage(data, req.user!);
    }

    @Get('message/media')
    getMediaMessage(@Query('key') key: string) {
        console.log(key);
    }

    @Post('')
    async addNewChat(@Body() body: AddNewChatDTO, @Request() req: HttpRequest) {
        return await this.chatService.addNewChat(body.editorId, req.user!);
    }

    @Post('message/text')
    async addNewMessage(@Body() body: NewMessageDTO, @Request() req: HttpRequest) {
        return await this.chatService.addTextMessage(body, req.user!);
    }

    @Post('videoRequest')
    addNewVideoRequest() {

    }

    @Delete('')
    async removeChat(@Request() req: HttpRequest, @Query('id') id: string) {
        return await this.chatService.removeChat(req.user!, id)
    }
}
