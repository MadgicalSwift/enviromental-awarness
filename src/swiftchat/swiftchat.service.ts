import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { LocalizationService } from 'src/localization/localization.service';
import { MessageService } from 'src/message/message.service';

dotenv.config();

@Injectable()
export class SwiftchatMessageService extends MessageService {
  private botId = process.env.BOT_ID;
  private apiKey = process.env.API_KEY;
  private apiUrl = process.env.API_URL;
  private baseUrl = `${this.apiUrl}/${this.botId}/messages`;

  private prepareRequestData(from: string, requestBody: string): any {
    return {
      to: from,
      type: 'text',
      text: {
        body: requestBody,
      },
    };
  }
  async sendWelcomeMessage(from: string, language: string) {
    const localisedStrings = LocalizationService.getLocalisedString(language);
    console.log("localisedStrings: ", localisedStrings);
    const requestData = this.prepareRequestData(
      from,
      localisedStrings.welcomeMessage,
    );

    console.log("request data from here: ", requestData)

    const response = await this.sendMessage(
      this.baseUrl,
      requestData,
      this.apiKey,
    );
    return response;
  }

  async sendLanguageChangedMessage(from: string, language: string) {
    const localisedStrings = LocalizationService.getLocalisedString(language);
    console.log("localisedStrings: ", localisedStrings);
    const requestData = this.prepareRequestData(
      from,
      localisedStrings.language_changed,
    );

    console.log("request data from here: ", requestData)
    const response = await this.sendMessage(
      this.baseUrl,
      requestData,
      this.apiKey,
    );
    return response;
  }

  async startEnvironmentSession(from: string, language: string) {
    const localisedStrings = LocalizationService.getLocalisedString(language);
    console.log("localisedStrings: ", localisedStrings);
    const requestData = this.prepareRequestData(
      from,
      localisedStrings.choose_topics,
    );

    console.log("request data from here: ", requestData)
    const response = await this.sendMessage(
      this.baseUrl,
      requestData,
      this.apiKey,
    );
    return response;
  }

  async endSession(from: string, language: string) {
    const localisedStrings = LocalizationService.getLocalisedString(language);
    console.log("localisedStrings: ", localisedStrings);
    const requestData = this.prepareRequestData(
      from,
      localisedStrings.end_session,
    );

    console.log("request data from here: ", requestData)
    const response = await this.sendMessage(
      this.baseUrl,
      requestData,
      this.apiKey,
    );
    return response;
  }

  async sendTextMessage(from: string, message: string) {
    const requestData = this.prepareRequestData(
      from,
      message,
    );

    const response = await this.sendMessage(
      this.baseUrl,
      requestData,
      this.apiKey,
    );
    return response;
  }
}
