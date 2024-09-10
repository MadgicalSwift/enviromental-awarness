import { Injectable } from '@nestjs/common';
import IntentClassifier from '../intent/intent.classifier';
import { MessageService } from 'src/message/message.service';
import { UserService } from 'src/model/user.service';
import { localisedStrings } from 'src/i18n/en/localised-strings';

@Injectable()
export class ChatbotService {
  private readonly intentClassifier: IntentClassifier;
  private readonly message: MessageService;
  private readonly userService: UserService;
  private appState = {
    topicListShown: false,
    quizResponse: [],
    topicSelected: undefined,
    setSelected: undefined
  }

  constructor(
    intentClassifier: IntentClassifier,
    message: MessageService,
    userService: UserService,
  ) {
    this.intentClassifier = intentClassifier;
    this.message = message;
    this.userService = userService;
  }

  public async processMessage(body: any): Promise<any> {
    const { from, button_response, text } = body;
    const botId = process.env.BOT_ID;
    const userData = await this.userService.findUserByMobileNumber(from,botId);
    const { intent = undefined, entities = undefined } = text ? this.intentClassifier.getIntent(text.body) : {};

    if (button_response) {
      if (button_response.body === localisedStrings.retakeQuiz) {
        await this.message.startQuiz(from, this.appState);
      } else if (button_response.body === localisedStrings.chooseAnotherTopic || button_response.body === localisedStrings.start || button_response.body === localisedStrings.gototopics) {
        this.appState.quizResponse = []; // Reset quiz responses
        this.appState.topicListShown = false; // Reset topic list shown state
        console.log("topicListShown 1: ", this.appState.topicListShown);
        await this.message.createTopicButtonsFromQuizData(from, this.appState);
        console.log("topicListShown 2: ", this.appState.topicListShown);
      } else if (button_response.body === localisedStrings.notrightnow) {
        this.message.endSession(from, button_response.body);
      } else if (this.appState.quizResponse.length > 0) {
        await this.message.handleQuizResponse(from, button_response, this.appState);
      } else if (this.appState.topicListShown && button_response.body === localisedStrings.tellmemore) {
        await this.message.handleTellMeMore(from, this.appState);
      } else if (this.appState.topicListShown && button_response.body === localisedStrings.gotitquiz) {
        await this.message.startQuiz(from, this.appState);
      } else if (this.appState.topicListShown) {
        await this.message.handleTopicClick(from, button_response, this.appState);
      }
    } else {
      if (userData.language === 'english' || userData.language === 'hindi') {
        // await this.userService.saveUser(userData);
      }
      if (intent === 'greeting') {
        await this.userService.createUser(from,botId ,userData.language)
        await this.message.sendWelcomeMessage(from, userData.language);
        await this.message.createYesNoButton(from);
      } else if (intent === 'select_language') {
        const selectedLanguage = entities[0];
        const userData = await this.userService.findUserByMobileNumber(from);
        userData.language = selectedLanguage;
        // await this.userService.saveUser(userData);
        this.message.sendLanguageChangedMessage(from, userData.language);
      }
    }
    return 'ok';
  }
}

export default ChatbotService;
