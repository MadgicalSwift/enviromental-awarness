
// swiftchat.module.ts

import { Module } from '@nestjs/common';
import { SwiftchatMessageService } from './swiftchat.service';
import { MessageModule } from 'src/message/message.module'; // Correct the import path as necessary
import { UserModule } from 'src/model/user.module';

@Module({
  imports: [MessageModule, UserModule], // Import MessageModule
  providers: [SwiftchatMessageService],
  exports: [SwiftchatMessageService],
})
export class SwiftchatModule {}
