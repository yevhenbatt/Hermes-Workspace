import { Injectable } from '@nestjs/common';

import { ApplicationService } from '../../common/application/application.service';

@Injectable()
export class SystemService {
  constructor(
    private readonly applicationService: ApplicationService,
  ) {}

  getInfo() {
    return this.applicationService.getInfo();
  }
}
