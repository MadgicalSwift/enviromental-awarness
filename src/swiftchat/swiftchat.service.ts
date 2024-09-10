import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { LocalizationService } from 'src/localization/localization.service';
import { UserService } from 'src/model/user.service';
import { MessageService } from 'src/message/message.service';
import axios from 'axios';
import data from "../quiz.json";
import { generateRandomIntegerUpToMax } from 'src/utils/utils';

dotenv.config();

@Injectable()
export class SwiftchatMessageService extends MessageService {
  botId = process.env.BOT_ID;
  apiKey = process.env.API_KEY;
  apiUrl = process.env.API_URL;
  baseUrl = `${this.apiUrl}/${this.botId}/messages`;

  constructor(private readonly userService: UserService) {
    super();
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
    try {
      const localisedStrings = LocalizationService.getLocalisedString(language);
      const requestData = this.prepareRequestData(from, localisedStrings.language_changed);
      // update users's preferred language
      await this.userService.setUserPreferredLanguage(from, language, this.botId);

      const response = await this.sendMessage(this.baseUrl, requestData, this.apiKey);
      console.log('Language change message sent:', response.data);
      return response;
    } catch (error) {
      console.error('Error sending language change message:', error);
    }
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

  // async startQuiz(from: string, appState: any): Promise<void> {
  //   try {
  //     const topic = data.topics[appState.topicSelected];
  //     if (!topic) {
  //       throw new Error('Topic not found');
  //     }
  //     console.log(topic);
  //     appState.setSelected = generateRandomIntegerUpToMax(topic?.sets?.length-1)
  //     appState.currentQuestionIndex = 0;
  //     const selectedSet = topic.sets[appState.setSelected];
  //     console.log('set',selectedSet)
  //     if (!selectedSet) {
  //       throw new Error('Set not found');
  //     }

  //     const questions = selectedSet.questions;
  //     if (!questions) {
  //       throw new Error('Questions not found');
  //     }

  //     let currentQuestionIndex = 0;
  //     appState.quizResponse = []; // Reset quiz responses
  //     appState.currentQuestionIndex = currentQuestionIndex; // Set current question index

  //     await this.askQuestion(from, currentQuestionIndex, appState);
  //   } catch (error) {
  //     console.error('Error starting quiz:', error);
  //   }
  // }
  async startQuiz(from: string, appState: any): Promise<void> {
    try {
      const topic = data.topics[appState.topicSelected];
      if (!topic) {
        throw new Error('Topic not found');
      }

      appState.setSelected = generateRandomIntegerUpToMax(topic?.sets?.length - 1);
      appState.currentQuestionIndex = 0;
      const selectedSet = topic.sets[appState.setSelected];
      if (!selectedSet) {
        throw new Error('Set not found');
      }

      const questions = selectedSet.questions;
      if (!questions) {
        throw new Error('Questions not found');
      }

      appState.quizResponse = []; // Reset quiz responses
      appState.currentQuestionIndex = 0;

      // Save current state in the database
      await this.userService.saveCurrentSetNumber(from, this.botId, appState.setSelected);
      await this.userService.saveQuestIndex(from, this.botId, appState.currentQuestionIndex);
      await this.userService.saveCurrentTopic(from, this.botId, topic.name);

      await this.askQuestion(from, appState.currentQuestionIndex, appState);
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }

//  async askQuestion(from: string, questionIndex: number, appState: any) {
//     try {
//       const topic = data.topics[appState.topicSelected];
//       if (!topic) {
//         throw new Error('Topic not found');
//       }

//       const selectedSet = topic.sets[appState.setSelected];
//       if (!selectedSet) {
//         throw new Error('Set not found');
//       }

//       const questions = selectedSet.questions;
//       if (!questions) {
//         throw new Error('Questions not found');
//       }

//       if (questionIndex < questions.length) {
//         const question = questions[questionIndex];
//         const button_data = {
//           buttons: question.options.map(option => ({
//             type: 'solid',
//             body: option,
//             reply: option,
//           })),
//           body: question.question
//         };
//         appState.currentQuestionIndex = questionIndex;
//         appState.quizResponse.push({});
//         await this.createButtons(from, button_data);
//       } else {
//         await this.endQuiz(from, appState); // All questions have been answered
//       }
//     } catch (error) {
//       console.error('Error asking question:', error);
//     }
//   }

async askQuestion(from: string, questionIndex: number, appState: any) {
  try {
    const topic = data.topics[appState.topicSelected];
    if (!topic) {
      throw new Error('Topic not found');
    }

    const selectedSet = topic.sets[appState.setSelected];
    if (!selectedSet) {
      throw new Error('Set not found');
    }

    const questions = selectedSet.questions;
    if (!questions) {
      throw new Error('Questions not found');
    }

    if (questionIndex < questions.length) {
      const question = questions[questionIndex];
      const button_data = {
        buttons: question.options.map(option => ({
          type: 'solid',
          body: option,
          reply: option,
        })),
        body: question.question,
      };

      appState.currentQuestionIndex = questionIndex;
      appState.quizResponse.push({});

      // Save current question index
      await this.userService.saveQuestIndex(from, this.botId, questionIndex);

      await this.createButtons(from, button_data);
    } else {
      await this.endQuiz(from, appState); // All questions have been answered
    }
  } catch (error) {
    console.error('Error asking question:', error);
  }
}

  // async handleQuizResponse(from: string, button_response: any, appState: any): Promise<void> {
  //   try {
  //     const topic = data.topics[appState.topicSelected];
  //     if (!topic) {
  //       throw new Error('Topic not found');
  //     }

  //     const selectedSet = topic.sets[appState.setSelected];
  //     if (!selectedSet) {
  //       throw new Error('Set not found');
  //     }

  //     const questions = selectedSet.questions;
  //     if (!questions) {
  //       throw new Error('Questions not found');
  //     }

  //     const currentQuestionIndex = appState.currentQuestionIndex;
  //     appState.currentQuestionIndex++;
  //     const currentQuestion = questions[currentQuestionIndex];

  //     appState.quizResponse[currentQuestionIndex] = {
  //       userAnswer: button_response.body,
  //       isCorrect: button_response.body === currentQuestion.correctAnswer
  //     };

  //     if (button_response.body === currentQuestion.correctAnswer) {
  //       await this.sendTextMessage(from, currentQuestion.responseMessage);
  //       await this.sendTextMessage(from, currentQuestion.explanation);
  //     } else {
  //       await this.sendTextMessage(from, `❌Not quite. The correct answer is: ${currentQuestion.correctAnswer}`);
  //       await this.sendTextMessage(from, currentQuestion.explanation);
  //     }

  //     if (currentQuestionIndex === questions.length - 1) {
  //       await this.endQuiz(from, appState);
  //     } else {
  //       await this.askQuestion(from, currentQuestionIndex + 1, appState);
  //     }
  //   } catch (error) {
  //     console.error('Error handling quiz response:', error);
  //   }
  // }

  async handleQuizResponse(from: string, button_response: any, appState: any): Promise<void> {
    try {
      const topic = data.topics[appState.topicSelected];
      if (!topic) {
        throw new Error('Topic not found');
      }

      const selectedSet = topic.sets[appState.setSelected];
      if (!selectedSet) {
        throw new Error('Set not found');
      }

      const questions = selectedSet.questions;
      if (!questions) {
        throw new Error('Questions not found');
      }

      const currentQuestionIndex = appState.currentQuestionIndex;
      appState.currentQuestionIndex++;
      const currentQuestion = questions[currentQuestionIndex];

      const isCorrect = button_response.body === currentQuestion.correctAnswer;

      appState.quizResponse[currentQuestionIndex] = {
        userAnswer: button_response.body,
        isCorrect: isCorrect,
      };

      // Update the user's quiz response in the database
      await this.userService.saveCurrentScore(from, this.botId, appState.quizResponse.filter(r => r.isCorrect).length);

      if (isCorrect) {
        await this.sendTextMessage(from, currentQuestion.responseMessage);
        await this.sendTextMessage(from, currentQuestion.explanation);
      } else {
        await this.sendTextMessage(from, `❌ Not quite. The correct answer is: ${currentQuestion.correctAnswer}`);
        await this.sendTextMessage(from, currentQuestion.explanation);
      }

      if (currentQuestionIndex === questions.length - 1) {
        await this.endQuiz(from, appState);
      } else {
        await this.askQuestion(from, currentQuestionIndex + 1, appState);
      }
    } catch (error) {
      console.error('Error handling quiz response:', error);
    }
  }

  // async endQuiz(from: string, appState: any): Promise<void> {
  //   try {
  //     let correctAnsCount = 0;
  //     appState.quizResponse.forEach(response => {
  //       if (response.isCorrect) {
  //         correctAnsCount++;
  //       }
  //     });

  //     const topic = data.topics[appState.topicSelected];
  //     if (!topic) {
  //       throw new Error('Topic not found')
  //     }

  //     const selectedSet = topic.sets[appState.setSelected];
  //     await this.sendTextMessage(from, `You’ve completed the quiz on ${topic.name}! Here’s how you did:`);
  //     await this.sendTextMessage(from, `You answered ${correctAnsCount} out of ${selectedSet.questions.length} questions correctly!`);
  //     appState.quizResponse = []; // Reset quiz responses
  //     appState.topicListShown = false; // Reset topic list shown state

  //     const button_data = {
  //       buttons: [
  //         {
  //           type: 'solid',
  //           body: "Retake Quiz",
  //           reply: "Retake Quiz",
  //         },
  //         {
  //           type: 'solid',
  //           body: "Choose Another Topic",
  //           reply: "Choose Another Topic",
  //         }
  //       ],
  //       body: " "
  //     };

  //     await this.createButtons(from, button_data);
  //   } catch (error) {
  //     console.error('Error ending quiz:', error);
  //   }
  // }

  async endQuiz(from: string, appState: any): Promise<void> {
    try {
      const correctAnsCount = appState.quizResponse.filter(response => response.isCorrect).length;

      const topic = data.topics[appState.topicSelected];
      if (!topic) {
        throw new Error('Topic not found');
      }

      const selectedSet = topic.sets[appState.setSelected];
      await this.sendTextMessage(from, `You’ve completed the quiz on ${topic.name}! Here’s how you did:`);
      await this.sendTextMessage(from, `You answered ${correctAnsCount} out of ${selectedSet.questions.length} questions correctly!`);

      // Reset user state in the database after quiz ends
      await this.userService.saveCurrentTopic(from, this.botId, null);
      await this.userService.saveCurrentScore(from, this.botId, correctAnsCount);

      const button_data = {
        buttons: [
          {
            type: 'solid',
            body: "Retake Quiz",
            reply: "Retake Quiz",
          },
          {
            type: 'solid',
            body: "End Session",
            reply: "End Session",
          },
        ],
        body: "Would you like to retake the quiz or end the session?",
      };

      await this.createButtons(from, button_data);
    } catch (error) {
      console.error('Error ending quiz:', error);
    }
  }


  async handleTellMeMore(from: string, appState: any): Promise<void> {
    try {
      const topic = data.topics[appState.topicSelected];
      if (!topic) {
        throw new Error('Topic not found');
      }

      await this.sendTextMessage(from, `Great choice! Here’s what you need to know about ${topic.name}:`);
      await this.sendTextMessage(from, topic.fullExplanation);
      const button_data = {
        buttons: [
          {
            type: 'solid',
            body: "Got it, let's quiz!",
            reply: "Got it, let's quiz!",
          }
        ],
        body: "Choose Option"
      };
      await this.createButtons(from, button_data);
    } catch (error) {
      console.error('Error handling tell me more:', error);
    }
  }

  async handleTopicClick(from: string, button_response: any, appState: any): Promise<void> {
    try {
      const { button_index } = button_response;

      const topic = data.topics[button_index];
      if (!topic) {
        throw new Error('Topic not found');
      }

      await this.sendTextMessage(from, `Explanation is: ${topic.explanation}`);
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
      };
      appState.topicSelected = button_index;
      await this.createButtons(from, button_data);
    } catch (error) {
      console.error('Error handling topic click:', error);
    }
  }

  async createTopicButtonsFromQuizData(from: string, appState: any): Promise<void> {
    try {
      const buttons = data.topics.map(item => ({
        type: "solid",
        body: item.name,
        reply: item.name
      }));
      const button_data = {
        buttons: buttons,
        body: "Choose Topics"
      };
      appState.topicListShown = true;
      await this.createTopicButtonsFromQuizData(from, button_data);
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
