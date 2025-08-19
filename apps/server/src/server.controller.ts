import { Controller } from '@nestjs/common';
import { ServerService } from './server.service';

@Controller()
export class ServerController {
  constructor(private readonly serverService: ServerService) { }

}
