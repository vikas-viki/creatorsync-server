import { Controller } from '@nestjs/common';
import { MediaServiceService } from './media-service.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class MediaServiceController {
  constructor(private readonly mediaServiceService: MediaServiceService) { }

  @MessagePattern({ cmd: 'signed_url_upload' })
  async getSignedUrlForUpload(data: { key: string, contentType: string }): Promise<any> {
    return await this.mediaServiceService.getSignedUrlForUpload(data.key, data.contentType);
  }

  @MessagePattern({ cmd: 'signed_urls_view' })
  async getSignedUrlForView(data: { keys: string[] }) {
    return await this.mediaServiceService.getSignedUrlForView(data.keys);
  }
}
