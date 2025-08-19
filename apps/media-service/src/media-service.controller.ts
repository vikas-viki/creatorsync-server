import { Controller } from '@nestjs/common';
import { MediaServiceService } from './media-service.service';

@Controller()
export class MediaServiceController {
  constructor(private readonly mediaServiceService: MediaServiceService) { }

}
