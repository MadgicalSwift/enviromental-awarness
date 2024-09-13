import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CustomException } from 'src/common/exception/custom.exception';
import { localisedStrings } from 'src/i18n/en/localised-strings';
import { MixpanelService } from 'src/mixpanel/mixpanel.service';

@Injectable()
export abstract class MessageService {
  constructor(
    protected readonly mixpanel: MixpanelService
  ) {}
  async prepareWelcomeMessage() {
    return localisedStrings.welcomeMessage;
  }

  getSeeMoreButtonLabel() {
    return localisedStrings.seeMoreMessage;
  }

  async sendMessage(baseUrl: string, requestData: any, token: string) {
    console.log("request data: ", requestData);
    try {
      const response = await axios.post(baseUrl, requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      throw new CustomException(error);
    }
  }

  abstract sendWelcomeMessage(from: string, language: string);
  abstract endSession(from: string, language: string);
  abstract askQuestion(from: string,questionIndex: number, topicSelected:string, setNumber:number, score:number ): Promise<void>;
  abstract handleQuizResponse(from: string, button_response: any, language:string ,topicSelected: string, setNumber: number, currentIndex: number, score:number);
  abstract handleTellMeMore(from: string, currentTopic: string);
  abstract handleTopicClick(from: string, button_response: string);
  abstract createTopicButtonsFromQuizData(from: string);
  abstract createYesNoButton(from: string);
 
}
