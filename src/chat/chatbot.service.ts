import { Injectable } from '@nestjs/common';
import IntentClassifier from '../intent/intent.classifier';
import { MessageService } from 'src/message/message.service';
import { UserService } from 'src/model/user.service';
import axios from 'axios';
import data from "../quiz.json";

@Injectable()
export class ChatbotService {
  private readonly intentClassifier: IntentClassifier;
  private readonly message: MessageService;
  private readonly userService: UserService;
  private apiUrl = process.env.API_URL;
  private botId = process.env.BOT_ID;
  private apiKey = process.env.API_KEY;
  private topicListShown = false;
  private topicSelected = undefined;
  private quizResponse = [];

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
    let botID = process.env.BOT_ID;
    const userData = await this.userService.findUserByMobileNumber(from);
    const { intent = undefined, entities = undefined } = text? this.intentClassifier.getIntent(text.body): {};
    if(button_response){
      if (button_response.body === "Yes, let's start!"){
        await this.createTopicButtonsFromQuizData(from);
      }else if(button_response.body === "Not right now."){
        this.message.endSession(from, button_response.body);
      }else if (this.quizResponse.length > 0) {
        // Handle the quiz answer if we're in the middle of a quiz
        await this.handleQuizResponse(from, button_response);
    }else if(this.topicListShown && button_response.body === "Tell me more."){
        await this.handleTellMeMore(from);
      }else if(this.topicListShown && button_response.body === "Got it, let's quiz!"){
        await this.startQuiz(from);
      }else if(this.topicListShown){
  
        await this.handleTopicClick(from, button_response);
      }
    }else{
      if (userData.language === 'english' || userData.language === 'hindi') {
        await this.userService.saveUser(userData);
      }
      if (intent === 'greeting') {
        await this.message.sendWelcomeMessage(from, userData.language);
        // await this.createLanguageButton(from);
        // this.createTopicButtonsFromQuizData(from);
        await this.createYesNoButton(from);
      } else if (intent === 'select_language') {
        const selectedLanguage = entities[0];
        const userData = await this.userService.findUserByMobileNumber(from);
        userData.language = selectedLanguage;
        userData.language = selectedLanguage;
        await this.userService.saveUser(userData);
        this.message.sendLanguageChangedMessage(from, userData.language);
      }
    }
    return 'ok';
  }

  private async startQuiz(from: string): Promise<void> {
    const questions = data.topics[this.topicSelected].questions;
    let currentQuestionIndex = 0;

    this.quizResponse = []; // Reset quiz responses

    this.askQuestion(from, currentQuestionIndex);
}

  private async askQuestion (from: string, questionIndex: number){
  const questions = data.topics[this.topicSelected].questions;
  if (questionIndex < questions.length) {
      const question = questions[questionIndex];
      const button_data = {
          buttons: question.options.map(option => ({
              type: 'solid',
              body: option,
              reply: option,
          })),
          body: question.question
      };
      this.quizResponse.push({ questionIndex, userAnswer: null });
      return this.createButtons(from, button_data);
  } else {
      return this.endQuiz(from); // All questions have been answered
  }
};

private async handleQuizResponse(from: string, button_response: any): Promise<void> {
    const questions = data.topics[this.topicSelected].questions;
    const currentQuestionIndex = this.quizResponse.length - 1;
    const currentQuestion = questions[currentQuestionIndex];

    this.quizResponse[currentQuestionIndex].userAnswer = button_response.body;
    this.quizResponse[currentQuestionIndex].isCorrect = button_response.body === currentQuestion.correctAnswer;
    

    if (button_response.body === currentQuestion.correctAnswer) {
        await this.message.sendTextMessage(from, "Correct!");
    } else {
        await this.message.sendTextMessage(from, `Incorrect. The correct answer is: ${currentQuestion.correctAnswer}`);
    }

    this.askQuestion(from, currentQuestionIndex+1);
}

private async endQuiz(from: string): Promise<void> {

    let correctAnsCount = 0;
    this.quizResponse.forEach(response => {
      if(response.isCorrect){
        correctAnsCount++;
      }
    });
    await this.message.sendTextMessage(from, `You’ve completed the quiz on ${data.topics[this.topicSelected]}! Here’s how you did:`);
    await this.message.sendTextMessage(from, `You answered ${correctAnsCount} out of ${data?.topics[this.topicSelected]?.questions?.length} questions correctly!`);
    this.topicSelected = undefined; // Reset topic selection
    this.quizResponse = []; // Reset quiz responses
    this.topicListShown = false; // Reset topic list shown state

    // Optionally, prompt user for next action
    await this.message.sendTextMessage(from, "Would you like to try another quiz?");
}


  private async handleTellMeMore(from: string): Promise<void>{
    await this.message.sendTextMessage(from, "Great choice! Here’s what you need to know about " + data.topics[this.topicSelected].name + ":")
    await this.message.sendTextMessage(from, data.topics[this.topicSelected].fullExplanation);
    const button_data = {
      buttons: [
        {
            type: 'solid',
            body: "Got it, let's quiz!",
            reply: "Got it, let's quiz!",
        }
        ],
        body: "Choose Option"
    }
    return this.createButtons(from, button_data);
  }

  private async createLanguageButton(from: string): Promise<void> {
    const button_data = {
      buttons: [
        {
            type: 'solid',
            body: "English",
            reply: "English",
        },
        {
            type: 'solid',
            body: 'Hindi',
            reply: 'Hindi',
        },
        ],
        body: "Choose Language"
    }
    return this.createButtons(from, button_data);
  }

  private async handleTopicClick(from: string, button_response: any): Promise<void> {
    const {button_index} = button_response;
    await this.message.sendTextMessage(from, data.topics[button_index].explanation);
    const button_data = {
      buttons: [
        {
            type: 'solid',
            body: "Got it, let's quiz!",
            reply: "Got it, let's quiz!",
        },
        {
            type: 'solid',
            body: 'Tell me more.',
            reply: 'Tell me more.',
        },
        ],
        body: "Choose Option"
    }
    this.topicSelected = button_index;
    return this.createButtons(from, button_data);
  }

  private async createTopicButtonsFromQuizData(from: string): Promise<void> {
    const buttons = data.topics.map(item =>{
      return {
        type: "solid",
        body: item.name,
        reply: item.name
      }
    });
    const button_data = {
      buttons: buttons,
      body: "Choose Topics"
    }
    this.topicListShown = true;
    return this.createButtons(from, button_data);
  }

  private async createYesNoButton(from: string): Promise<void> {
    const button_data = {
      buttons: [
        {
            type: 'solid',
            body: "Yes, let's start!",
            reply: "Yes, let's start!",
        },
        {
            type: 'solid',
            body: 'Not right now.',
            reply: 'Not right now.',
        },
        ],
        body: "Choose option"
    }
    await this.createButtons(from, button_data);
  }

  private async createButtons(from: string, button_data: any): Promise<void> {
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
    }
    catch (error) {
    console.error('errors:', error);
    }
}
}
export default ChatbotService;
