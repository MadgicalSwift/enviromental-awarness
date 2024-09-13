
// message.module.ts

import { Module } from '@nestjs/common';
import { MessageService } from './message.service'; // Update the path to message.service
import { CustomException } from 'src/common/exception/custom.exception';
import { SwiftchatMessageService } from 'src/swiftchat/swiftchat.service';
import { UserModule } from 'src/model/user.module';

@Module({
  imports: [
    UserModule, // Import UserModule to make UserService available
  ],
  providers: [
    {
      provide: MessageService,
      useClass: SwiftchatMessageService, // Provide the WhatsAppMessageService implementation
    },
    CustomException,
  ],
  exports: [MessageService, CustomException],
})
export class MessageModule {}
