import { Injectable } from '@nestjs/common';
import IntentClassifier from '../intent/intent.classifier';
import { MessageService } from 'src/message/message.service';
import { UserService } from 'src/model/user.service';

@Injectable()
export class ChatbotService {
  private readonly intentClassifier: IntentClassifier;
  private readonly message: MessageService;
  private readonly userService: UserService;
  private appState = {
    topicListShown: false,
    quizResponse: [],
    topicSelected: undefined,
    setSelected: undefined,
    currentIndex: 0, // Initialize currentIndex for tracking quiz progress
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
    const userData = await this.userService.findUserByMobileNumber(from, botId);
    const { intent = undefined, entities = undefined } = text ? this.intentClassifier.getIntent(text.body) : {};

    if (button_response) {
      if (button_response.body === "Retake Quiz") {
        this.appState.currentIndex = 0; // Reset index when retaking the quiz
        await this.message.startQuiz(from, this.appState);
      } else if (button_response.body === "Choose Another Topic" || button_response.body === "Yes, let's start!" || button_response.body === "Go to topic selection") {
        this.appState.quizResponse = []; // Reset quiz responses
        this.appState.topicListShown = false; // Reset topic list shown state
        this.appState.currentIndex = 0; // Reset index when choosing another topic
        console.log("topicListShown 1: ", this.appState.topicListShown);
        await this.message.createTopicButtonsFromQuizData(from, this.appState);
        console.log("topicListShown 2: ", this.appState.topicListShown);
      } else if (button_response.body === "Not right now.") {
        this.message.endSession(from, button_response.body);
      } else if (this.appState.quizResponse.length > 0) {
        await this.message.handleQuizResponse(from, button_response, this.appState);
      } else if (this.appState.topicListShown && button_response.body === "Tell me more.") {
        await this.message.handleTellMeMore(from, this.appState);
      } else if (this.appState.topicListShown && button_response.body === "Got it, let's quiz!") {
        this.appState.currentIndex = 0; // Reset index when starting a new quiz
        await this.message.startQuiz(from, this.appState);
      } else if (this.appState.topicListShown) {
        await this.message.handleTopicClick(from, button_response, this.appState);
      }
    } else {
      if (userData.language === 'english' || userData.language === 'hindi') {
        // await this.userService.saveUser(userData);
      }
      if (intent === 'greeting') {
        await this.userService.createUser(from, botId, userData.language);
        await this.message.sendWelcomeMessage(from, userData.language);
        await this.message.createYesNoButton(from);
      } else if (intent === 'select_language') {
        const selectedLanguage = entities[0];
        userData.language = selectedLanguage;
        await this.userService.saveUser(userData);
        await this.message.sendLanguageChangedMessage(from, userData.language);
      }
    }
    return 'ok';
  }
}

export default ChatbotService;

// import { Injectable } from '@nestjs/common';
// import IntentClassifier from '../intent/intent.classifier';
// import { MessageService } from 'src/message/message.service';
// import { UserService } from 'src/model/user.service';

// @Injectable()
// export class ChatbotService {
//   private readonly intentClassifier: IntentClassifier;
//   private readonly message: MessageService;
//   private readonly userService: UserService;

//   constructor(
//     intentClassifier: IntentClassifier,
//     message: MessageService,
//     userService: UserService,
//   ) {
//     this.intentClassifier = intentClassifier;
//     this.message = message;
//     this.userService = userService;
//   }

//   private async getAppState(from: string, botId: string) {
//     const userData = await this.userService.findUserByMobileNumber(from, botId);
//     return {
//       topicListShown: userData?.topicListShown || false,
//       quizResponse: userData?.quizResponse || [],
//       topicSelected: userData?.topicSelected || null,
//       setSelected: userData?.setSelected || null,
//       currentIndex: userData?.currentIndex || 0,
//     };
//   }
  

//   public async processMessage(body: any): Promise<any> {
//     const { from, button_response, text } = body;
//     const botId = process.env.BOT_ID;
//     const appState = await this.getAppState(from, botId); // Retrieve app state from database
//     const { intent = undefined, entities = undefined } = text ? this.intentClassifier.getIntent(text.body) : {};

//     if (button_response) {
//       if (button_response.body === "Retake Quiz") {
//         appState.currentIndex = 0; // Reset index when retaking the quiz
//         await this.message.startQuiz(from, appState);
//       } else if (["Choose Another Topic", "Yes, let's start!", "Go to topic selection"].includes(button_response.body)) {
//         appState.quizResponse = []; // Reset quiz responses
//         appState.topicListShown = false; // Reset topic list shown state
//         // appState.currentIndex = 0; // Reset index when choosing another topic
//         console.log("topicListShown 1: ", appState.topicListShown);
//         await this.message.createTopicButtonsFromQuizData(from, appState);
//         console.log("topicListShown 2: ", appState.topicListShown);
//       } else if (button_response.body === "Not right now.") {
//         await this.message.endSession(from, button_response.body);
//       } else if (appState.quizResponse.length > 0) {
//         console.log("1");
//         await this.message.handleQuizResponse(from, button_response, appState);
//       } else if (appState.topicListShown && button_response.body === "Tell me more.") {
//         await this.message.handleTellMeMore(from, appState);
//       } else if (appState.topicListShown && button_response.body === "Got it, let's quiz!") {
//         appState.currentIndex = 0; // Reset index when starting a new quiz
//         console.log("Quiz started");
//         await this.message.startQuiz(from, appState);
//       } else if (["Recycling", "Solar power", "Ecosystem", "Regenrative Agriculture", "Climate Change"].includes(button_response.body)) {
//         console.log("hi");
//         await this.message.handleTopicClick(from, button_response, appState);
//       }
//     } else {
//       const userData = await this.userService.findUserByMobileNumber(from, botId);

//       // if (!userData) {
//       //   // Handle case where user is not found in database
//       //   return 'User not found';
//       // }
//       if (userData) {
//         if (userData.language === 'english' || userData.language === 'hindi') {
//           // Assuming you need to update user data here
//           await this.userService.saveUser({
//             ...appState,
//             id: from, // Use the mobile number as the ID
//             mobileNumber: from,
//             Botid: botId,
//             language: userData.language || 'English', // Default language if not set
//           });
//         }
//       }

//       if (userData.language) {
//         if (intent === 'greeting') {
//           await this.userService.createUser(from, userData.language, botId);
//           await this.message.sendWelcomeMessage(from, userData.language);
//           await this.message.createYesNoButton(from);
//         } else if (intent === 'select_language') {
//           const selectedLanguage = entities[0];
//           userData.language = selectedLanguage;
//           await this.userService.saveUser(userData);
//           await this.message.sendLanguageChangedMessage(from, userData.language);
//         }
//       } else {
//         await this.message.sendTextMessage(from, 'Please select a language to continue.');
//       }
//     }

//     return 'ok';
//   }
// }

// export default ChatbotService;
