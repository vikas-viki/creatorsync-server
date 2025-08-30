import { Body, Controller, Delete, Get, Param, Post, Request, Sse, UseGuards } from '@nestjs/common';
import type { Request as HttpRequest } from "express";
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ChatService } from './chat.service';
import { AddNewChatDTO, NewMediaDTO, NewMessageDTO, NewVideoRequestDTO, VideoRequestApprovalDTO } from './dtos/chat.dto';
import { Observable } from 'rxjs';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {

    constructor(
        private chatService: ChatService) { }

    @Get('all')
    async getAllChats(@Request() req: HttpRequest) {
        return await this.chatService.getUserChats(req.user!.id, req.user!.type);
    }

    @Sse('message/video-request/:id/progress')
    getVideoRequestStatus(@Param('id') id: string): Observable<MessageEvent> {
        return this.chatService.getVideoUploadProgress(id);
    }

    @Post('message/video-request')
    async newVideoRequest(@Request() req: HttpRequest, @Body() data: NewVideoRequestDTO) {
        return await this.chatService.addNewVideoRequest(req.user!, data);
    }

    @Post('message/video-request/:id/retry')
    async retryVideoRequest(@Param('id') id: string, @Request() req: HttpRequest) {
        return await this.chatService.retryVideoRequest(id, req.user!);
    }

    @Post('message/video-request/:id/approve')
    async approveVideoRequest(@Param('id') id: string, @Body() data: VideoRequestApprovalDTO, @Request() req: HttpRequest) {
        return await this.chatService.approveVideoRequest(data, id, req.user!);
    }

    @Get(':id')
    async getChatData(@Param('id') id: string, @Request() req: HttpRequest) {
        return await this.chatService.getChatData(id, req.user!);
    }

    @Post('message/media')
    async mediaMessage(@Body() data: NewMediaDTO, @Request() req: HttpRequest): Promise<string> {
        return await this.chatService.mediaMessage(data, req.user!);
    }

    @Post('')
    async addNewChat(@Body() body: AddNewChatDTO, @Request() req: HttpRequest) {
        return await this.chatService.addNewChat(body.editorId, req.user!);
    }

    @Post('message/text')
    async addNewMessage(@Body() body: NewMessageDTO, @Request() req: HttpRequest) {
        return await this.chatService.addTextMessage(body, req.user!);
    }

    @Delete(':id')
    async removeChat(@Request() req: HttpRequest, @Param('id') id: string) {
        return await this.chatService.removeChat(req.user!, id)
    }
}
