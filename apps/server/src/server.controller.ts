import { Body, Controller, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ServerService } from './server.service';
import type { Request as HttpRequest } from "express";
import { JwtAuthGuard } from '@creatorsync/prisma/guards/jwt.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ServerController {
  constructor(private readonly serverService: ServerService) { }

  @Post('feedback')
  async addFeedback(@Query('type') type: "feedback" | "feature", @Request() req: HttpRequest, @Body() data: { feedback: string }) {
    if (type == "feature") {
      return await this.serverService.addFeature(req.user!, data.feedback);
    }
    return await this.serverService.addFeedback(req.user!, data.feedback);
  }
}
