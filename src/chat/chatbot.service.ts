import { Injectable } from '@nestjs/common';
import IntentClassifier from '../intent/intent.classifier';
import { MessageService } from 'src/message/message.service';
import { UserService } from 'src/model/user.service';
import * as fs from 'fs';
import * as path from 'path';
import { generateRandomIntegerUpToMax } from 'src/utils/utils';

@Injectable()
export class ChatbotService {
  private readonly intentClassifier: IntentClassifier;
  private readonly message: MessageService;
  private readonly userService: UserService;
  private quizData: any;
  
  async onModuleInit() {
    const filePath = path.resolve(__dirname,"..","..", 'quiz.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    this.quizData = JSON.parse(fileContents);
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
    let userData = await this.userService.findUserByMobileNumber(from, botId);
    if (!userData){
      userData =  await this.userService.createUser(from, botId, "English");
    }
    const { intent = undefined, entities = undefined } = text ? this.intentClassifier.getIntent(text.body) : {};
    let allQuizTopic = this.quizData.topics.map((quiz: any) => quiz.name);
    if (button_response) {
      if (allQuizTopic.includes(button_response.body) ) {
        
        let selectedTopic = this.quizData.topics.find((t: any) => t.name === button_response.body);
        let currentSetNumber = generateRandomIntegerUpToMax( selectedTopic?.sets?.length - 1);
        
        // await this.message.askQuestion(from,0, userData.currentTopic, currentSetNumber, 0 )
        await this.message.handleTopicClick(from, button_response.body);

        await this.userService.saveQuestIndex(from,botId, 0)
        await this.userService.saveCurrentSetNumber(from,botId, currentSetNumber)
        await this.userService.saveCurrentTopic(from,botId,button_response.body)
        await this.userService.saveCurrentScore(from,botId, 0)
      }
      else if (button_response.body === "Retake Quiz") {

        
        await this.message.askQuestion(from,0, userData.currentTopic, userData.setNumber, 0 )
        await this.userService.saveQuestIndex(from,botId, 0)
        await this.userService.saveCurrentScore(from,botId, 0)
  
      } 
      else if (button_response.body === "Choose Another Topic" || button_response.body === "Yes, let's start!" || button_response.body === "Go to topic selection") {
             
        await this.message.createTopicButtonsFromQuizData(from);
      }
       else if (button_response.body === "Not right now.") {
        this.message.endSession(from, button_response.body);
      } 

      else if ( button_response.body === "Tell me more.") {
        await this.message.handleTellMeMore(from, userData.currentTopic);
      } 
      else if (button_response.body === "Got it, let's quiz!") {
        
        await this.message.askQuestion(from,0, userData.currentTopic, userData.setNumber, 0 )
        await this.userService.saveQuestIndex(from,botId, 0)
        await this.userService.saveCurrentScore(from,botId, 0)
      } 
      else{
        
        await this.message.handleQuizResponse(from, button_response, userData.currentTopic, userData.setNumber, userData.currentQuestIndex, userData.score);
        await this.userService.saveQuestIndex(from,botId,  userData.currentQuestIndex+1)
      }
    } else {
     
      if (intent === 'greeting') {
        
        await this.message.sendWelcomeMessage(from, userData.language);
        await this.message.createYesNoButton(from);
      } 
    }
    return 'ok';
  }
}

export default ChatbotService;
