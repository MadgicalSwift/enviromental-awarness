import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CustomException } from 'src/common/exception/custom.exception';
import { localisedStrings } from 'src/i18n/en/localised-strings';

@Injectable()
export abstract class MessageService {
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
  abstract sendLanguageChangedMessage(from: string, language: string);
  abstract startEnvironmentSession(from: string, language: string);
  abstract endSession(from: string, language: string);
  abstract sendTextMessage(from: string, message: string);
  abstract startQuiz(from: string, appState: any);
  abstract askQuestion(from: string, questionIndex: number, appState: any);
  abstract handleQuizResponse(from: string, button_response: any, appState: any);
  abstract endQuiz(from: string, appState: any);
  abstract handleTellMeMore(from: string, appState: any);
  abstract handleTopicClick(from: string, button_response: any, appState: any);
  abstract createTopicButtonsFromQuizData(from: string, appState);
  abstract createYesNoButton(from: string);
  abstract createButtons(from: string, button_data: any);
}
