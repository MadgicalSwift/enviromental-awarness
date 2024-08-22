import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import  ChatbotService  from './chat/chatbot.service'; // Named import
import { UserService } from './model/user.service';
import * as dotenv from 'dotenv';

dotenv.config();

@Controller()
export class AppController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly language: UserService,
  ) {}

  @Get('/api/status')
  getStatus(@Res() res: Response) {
    res.status(200).send({
      status: {
        code: 0,
        message: 'OK',
      },
    });
  }

  @Post('/message')
  async handleUserMessage(@Body() body, @Res() res: Response): Promise<void> {
    try {
      const { from, text } = body;
      await this.chatbotService.processMessage(body);
      res.status(200).send({
        status: {
          code: 0,
          message: 'Success',
        },
      });
    } catch (error) {
      res.status(500).send({
        status: {
          code: 1,
          message: error.message,
        },
      });
    }
  }
}
