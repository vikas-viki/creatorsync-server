import { Controller } from '@nestjs/common';
import { MediaServiceService } from './media-service.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class MediaServiceController {
  constructor(private readonly mediaServiceService: MediaServiceService) { }

  @MessagePattern({ cmd: 'signed_url' })
  async getSignedUrl(data: { key: string, contentType: string }): Promise<any> {
    return await this.mediaServiceService.getSignedUrl(data.key, data.contentType);
  }
}
