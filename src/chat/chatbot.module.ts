// chatbot.module.ts

import { Module } from '@nestjs/common';
import ChatbotService from './chatbot.service';
import { SwiftchatModule } from 'src/swiftchat/swiftchat.module'; // Correct the import path as necessary
import IntentClassifier from '../intent/intent.classifier';
import { UserService } from 'src/model/user.service';
import { SwiftchatMessageService } from 'src/swiftchat/swiftchat.service';
import { MessageService } from 'src/message/message.service';
import { MixpanelService } from 'src/mixpanel/mixpanel.service';
@Module({
  imports: [SwiftchatModule], // Import SwiftchatModule
  providers: [
    ChatbotService,
    IntentClassifier,
    UserService,
    {
      provide: MessageService,
      useClass: SwiftchatMessageService,
    },
    MixpanelService
  ],
  exports: [ChatbotService, IntentClassifier],
})
export class ChatbotModule {}
