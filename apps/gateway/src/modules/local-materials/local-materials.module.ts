import { Module } from '@nestjs/common';

import { LocalMaterialsController } from './local-materials.controller';
import { LocalMaterialsService } from './local-materials.service';

@Module({
  controllers: [LocalMaterialsController],
  providers: [LocalMaterialsService],
})
export class LocalMaterialsModule {}
