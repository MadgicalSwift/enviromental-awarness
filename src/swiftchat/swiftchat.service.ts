import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { LocalizationService } from 'src/localization/localization.service';
import { UserService } from 'src/model/user.service';
import { MessageService } from 'src/message/message.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { generateRandomIntegerUpToMax } from 'src/utils/utils';
import { localisedStrings } from 'src/i18n/en/localised-strings';
import { MixpanelService } from 'src/mixpanel/mixpanel.service';

dotenv.config();

@Injectable()
export class SwiftchatMessageService extends MessageService {
  botId = process.env.BOT_ID;
  apiKey = process.env.API_KEY;
  apiUrl = process.env.API_URL;
  baseUrl = `${this.apiUrl}/${this.botId}/messages`;
  private quizData: any;

  constructor(private readonly userService: UserService, protected readonly mixpanel: MixpanelService) {
    super(mixpanel)
  }
  async onModuleInit() {
    const filePath = path.resolve(__dirname,"..", "..",'quiz.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    this.quizData = JSON.parse(fileContents);
  }

  prepareRequestData(from: string, requestBody: string): any {
    return {
      to: from,
      type: 'text',
      text: {
        body: requestBody,
      },
    };
  }

  async sendWelcomeMessage(from: string, language: string) {
    try {
      const localisedStrings = LocalizationService.getLocalisedString(language);
      const requestData = this.prepareRequestData(from, localisedStrings.welcomeMessage);
      // set user with prefered language
      await this.userService.createUser(from, language, this.botId);
      const response = await this.sendMessage(this.baseUrl, requestData, this.apiKey);
      console.log('Welcome message sent:', response.data);
      return response;
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  }
  
  async sendLanguageChangedMessage(from: string, language: string) {
    const localisedStrings = LocalizationService.getLocalisedString(language);
    const requestData = this.prepareRequestData(
      from,
      localisedStrings.select_language,
    );

    const response = await this.sendMessage(
      this.baseUrl,
      requestData,
      this.apiKey,
    );
    return response;
  }


  async startEnvironmentSession(from: string, language: string) {
    try {
      const localisedStrings = LocalizationService.getLocalisedString(language);
      const requestData = this.prepareRequestData(from, localisedStrings.choose_topics);

      // Update user state to start session
      await this.userService.saveCurrentTopic(from, this.botId, null); // Reset topic for new session

      const response = await this.sendMessage(this.baseUrl, requestData, this.apiKey);
      console.log('Environment session started:', response.data);
      return response;
    } catch (error) {
      console.error('Error starting environment session:', error);
    }
  }

  async endSession(from: string, language: string) {
    try {
      const localisedStrings = LocalizationService.getLocalisedString(language);
      const requestData = this.prepareRequestData(from, localisedStrings.end_session);

      // Reset user state at end of session
      await this.userService.saveCurrentTopic(from, this.botId, null);
      await this.userService.saveCurrentScore(from, this.botId, 0);

      const response = await this.sendMessage(this.baseUrl, requestData, this.apiKey);
      console.log('Session ended:', response.data);
      return response;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async sendTextMessage(from: string, message: string) {
    try {
      const requestData = this.prepareRequestData(from, message);
      const response = await this.sendMessage(this.baseUrl, requestData, this.apiKey);
      console.log('Text message sent:', response.data);
      return response;
    } catch (error) {
      console.error('Error sending text message:', error);
    }
  }


      
      
      
   



async askQuestion(from: string, questionIndex: number, topicSelected:string, setNumber:number, score:number ) {
  try {
    let selectedTopic = this.quizData.topics.find((t: any) => t.name === topicSelected);

    let selectedSet = selectedTopic.sets[setNumber];
    console.log(selectedSet);
    const questions = selectedSet.questions;

    if (questionIndex < questions.length) {
      const question = questions[questionIndex];

      const button_data = {

        buttons: question.options.map(option => (  {
          
          type: 'solid',
          body: option,
          reply: option,
        })),
        body: question.question,
      };

      await this.createButtons(from, button_data);
    } else {
      await this.endQuiz(from, score, topicSelected, setNumber); // All questions have been answered
    }
  } catch (error) {
    console.error('Error asking question:', error);
  }
}


  async handleQuizResponse(from: string, button_response: any, language: string, topicSelected: string, setNumber: number, currentIndex: number, score:number): Promise<void> {
    try {
      const topic =this.quizData.topics.find((t: any) => t.name === topicSelected);

      const selectedSet = topic.sets[setNumber];
  
      const questions = selectedSet.questions;
  
      const currentQuestion = questions[currentIndex];

      const isCorrect = button_response.body === currentQuestion.correctAnswer;

      if (isCorrect) {
        let correctans= localisedStrings.correctans(currentQuestion.correctAnswer);
        await this.sendTextMessage(from, correctans);
        await this.sendTextMessage(from, currentQuestion.explanation);
        await this.userService.saveCurrentScore(from,this.botId, score+1)
        
        this.mixpanel.track('Taking_Quiz', {
        distinct_id: from,
        language: language,
        question: currentQuestion,
        user_answer: button_response?.body,
        answer_is: 'correct',
        });
      } else {
        let notright= localisedStrings.notquite(currentQuestion.correctAnswer);
        await this.sendTextMessage(from, notright);
        await this.sendTextMessage(from, currentQuestion.explanation);

        this.mixpanel.track('Taking_Quiz', {
          distinct_id: from,
          language: language,
          question: currentQuestion,
          user_answer: button_response?.body,
          answer_is: 'incorrect',
          });
      }

      if (currentIndex === (questions.length - 1)) {
        let userData = await this.userService.findUserByMobileNumber(from, this.botId);
        await this.endQuiz(from, userData.score, topicSelected, setNumber);
      } else {
        await this.askQuestion(from, currentIndex+1,  topicSelected, setNumber, score);
      }
    } catch (error) {
      console.error('Error handling quiz response:', error);
    }
  }

 

  async endQuiz(from: string, score:number, topicSelected:string, setNumber:number): Promise<void> {
    try {
      // const correctAnsCount = appState.quizResponse.filter(response => response.isCorrect).length;

      const topic = this.quizData.topics.find((t: any) => t.name === topicSelected);

      const selectedSet = topic.sets[setNumber];
      await this.sendTextMessage(from, localisedStrings.completedQuiz );
      await this.sendTextMessage(from, localisedStrings.quizResults(score, selectedSet.questions.length));

      const button_data = {
        buttons: [
          {
            type: 'solid',
            body: localisedStrings.retakeQuiz,
            reply: localisedStrings.retakeQuiz,
          },
          {
            type: 'solid',
            body: localisedStrings.chooseAnotherTopic,
            reply: localisedStrings.chooseAnotherTopic,
          },
        ],
        body: localisedStrings.choice,
      };

      await this.createButtons(from, button_data);
    } catch (error) {
      console.error('Error ending quiz:', error);
    }
  }


  async handleTellMeMore(from: string, currentTopic: string): Promise<void> {
    try {
      const topic = this.quizData.topics.find((t: any) => t.name === currentTopic);
     

      await this.sendTextMessage(from, `${localisedStrings.description} ${topic.name}:`);
      await this.sendTextMessage(from, topic.fullExplanation);
      const button_data = {
        buttons: [
          {
            type: 'solid',
            body: localisedStrings.gotitquiz,
            reply: localisedStrings.gotitquiz,
          }
        ],
        body: localisedStrings.chooseoption
      };
      await this.createButtons(from, button_data);
    } catch (error) {
      console.error('Error handling tell me more:', error);
    }
  }

  async handleTopicClick(from: string, button_response: string): Promise<void> {
    try {
     

      const topic = this.quizData.topics.find((t: any) => t.name === button_response);
    
      console.log(topic);
      await this.sendTextMessage(from, `Explanation is: ${topic.explanation}`);
      const button_data = {
        buttons: [
          {
            type: 'solid',
            body: localisedStrings.gotitquiz,
            reply: localisedStrings.gotitquiz,
          },
          {
            type: 'solid',
            body: localisedStrings.tellmemore,
            reply: localisedStrings.tellmemore,
          },
        ],
        body: localisedStrings.chooseoption
      };
     
      console.log(button_data);
      await this.createButtons(from, button_data);
    } catch (error) {
      console.error('Error handling topic click:', error);
    }
  }

  async createTopicButtonsFromQuizData(from: string): Promise<void> {
    try {
      const buttons = this.quizData.topics.map(item => ({
        type: "solid",
        body: item.name,
        reply: item.name
      }));
      const button_data = {
        buttons: buttons,
        body: localisedStrings.choose
      };
      
      await this.createButtons(from, button_data);
      
    } catch (error) {
      console.error('Error creating topic buttons:', error);
    }
  }

  async createYesNoButton(from: string): Promise<void> {
    try {
      const button_data = {
        buttons: [
          {
            type: 'solid',
            body: localisedStrings.start,
            reply: localisedStrings.start,
          },
          {
            type: 'solid',
            body: localisedStrings.notrightnow,
            reply: localisedStrings.notrightnow,
          },
        ],
        body: "Choose option"
      };
      await this.createButtons(from, button_data);
    } catch (error) {
      console.error('Error creating yes/no buttons:', error);
    }
  }

  async createButtons(from: string, button_data: any): Promise<void> {
    const url = `${this.apiUrl}/${this.botId}/messages`;
    const messageData = {
      to: from,
      type: 'button',
      button: {
        body: {
          type: 'text',
          text: {
            body: button_data.body
          },
        },
        buttons: button_data.buttons,
        allow_custom_response: false,
      },
    };
    try {
      await axios.post(url, messageData, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error sending buttons:', error);
    }
  }

}
