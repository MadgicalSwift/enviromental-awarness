// app.module.ts

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserService } from './model/user.service';
import * as dotenv from 'dotenv';
import { APP_FILTER } from '@nestjs/core';
import { LoggingService } from './common/middleware/logger.middleware';
import { SwiftchatModule } from './swiftchat/swiftchat.module';
import { HttpExceptionFilter } from './common/exception/http-exception.filter';
import { ChatbotModule } from './chat/chatbot.module';
import { MessageModule } from './message/message.module';

dotenv.config();

@Module({
  imports: [MessageModule, ChatbotModule, SwiftchatModule],
  controllers: [AppController],
  providers: [
    LoggingService,
    UserService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
