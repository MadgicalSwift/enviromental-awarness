// // import { Injectable } from '@nestjs/common';
// // import { dynamoDBClient } from 'src/config/database-config.service';
// // import { v4 as uuidv4 } from 'uuid';
// // const { USERS_TABLE } = process.env;

// // @Injectable()
// // export class UserService {
// //   // Initialize appState structure
// //   private initializeAppState(): any {
// //     return {
// //       topicListShown: false,
// //       quizResponse: [],
// //       topicSelected: undefined,
// //       setSelected: undefined,
// //       currentIndex: 0,
// //     };
// //   }

// //   // Create or update user
// //   async createUser(
// //     mobileNumber: string,
// //     language: string,
// //     botID: string,
// //   ): Promise<any> {
// //     try {
// //       const existingUser = await this.findUserByMobileNumber(mobileNumber, botID);
// //       if (existingUser) {
// //         existingUser.language = language;
// //         const updateUser = {
// //           TableName: USERS_TABLE,
// //           Item: existingUser,
// //         };
// //         await dynamoDBClient().put(updateUser).promise();
// //         return existingUser;
// //       } else {
// //         const newUser = {
// //           TableName: USERS_TABLE,
// //           Item: {
// //             id: uuidv4(),
// //             mobileNumber: mobileNumber,
// //             language: language || 'English',
// //             Botid: botID,
// //             button_response: null,
// //             appState: this.initializeAppState(), // Initialize appState
// //           },
// //         };
// //         await dynamoDBClient().put(newUser).promise();
// //         return newUser;
// //       }
// //     } catch (error) {
// //       console.error('Error in createUser:', error);
// //       throw error;
// //     }
// //   }

// //   // Set user preferred language
// //   async setUserPreferredLanguage(
// //     mobileNumber: string,
// //     language: string,
// //     botID: string,
// //   ): Promise<void> {
// //     const user = await this.findUserByMobileNumber(mobileNumber, botID);
// //     if (user) {
// //       user.language = language;
// //       const setLanguage = {
// //         TableName: USERS_TABLE,
// //         Item: user,
// //       };
// //       await dynamoDBClient().put(setLanguage).promise();
// //     } else {
// //       const newUser = {
// //         TableName: USERS_TABLE,
// //         Item: {
// //           id: uuidv4(),
// //           mobileNumber,
// //           language: language || 'English',
// //           Botid: botID,
// //           chatHistory: [],
// //           transaction: [],
// //           credit: '100',
// //           button_response: null,
// //           paymentId: null,
// //           paymentStatus: null,
// //           appState: this.initializeAppState(), // Initialize appState
// //         },
// //       };
// //       await dynamoDBClient().put(newUser).promise();
// //     }
// //   }

// //   // Find user by mobile number
// //   async findUserByMobileNumber(
// //     mobileNumber: string,
// //     botID?: string,
// //   ): Promise<any> {
// //     const params: any = {
// //       TableName: USERS_TABLE,
// //       KeyConditionExpression: 'mobileNumber = :mobileNumber and Botid = :Botid',
// //       ExpressionAttributeValues: {
// //         ':mobileNumber': mobileNumber,
// //         ':Botid': botID,
// //       },
// //     };
// //     try {
// //       const result = await dynamoDBClient().query(params).promise();
// //       let user =
// //         result.Items && result.Items.length > 0 ? result.Items[0] : null;

// //       if (!user) {
// //         return null;
// //       }

// //       // Ensure appState exists
// //       if (!user.appState) {
// //         user.appState = this.initializeAppState();
// //         const setAppState = {
// //           TableName: USERS_TABLE,
// //           Item: user,
// //         };
// //         await dynamoDBClient().put(setAppState).promise();
// //       }

// //       return user;
// //     } catch (error) {
// //       console.error('Error querying user from DynamoDB:', error);
// //       return null;
// //     }
// //   }

  

import { Injectable } from '@nestjs/common';
import { dynamoDBClient } from 'src/config/database-config.service';
import { User } from './user.entity';
import { v4 as uuidv4 } from 'uuid';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const { USERS_TABLE } = process.env;

@Injectable()
export class UserService {

  async createUser(
    mobileNumber: string,
    language: string,
    botID: string,
  ): Promise<User | any> {
    try {
      const existingUser = await this.findUserByMobileNumber(mobileNumber, botID);
      if (existingUser) {
        existingUser.language = language;
        await this.saveUser(existingUser);
        return existingUser;
      } else {
        const newUser: User = {
          id: uuidv4(),
          mobileNumber: mobileNumber,
          language: language,
          Botid: botID,
          currentTopic: null,
          currentQuestIndex: null,
          setNumber: null,
          score: null,
        };
        await this.saveUser(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async setUserPreferredLanguage(
    mobileNumber: string,
    language: string,
    botID: string,
  ): Promise<void> {
    const user = await this.findUserByMobileNumber(mobileNumber, botID);
    if (user) {
      user.language = language;
      await this.saveUser(user);
    } else {
      const newUser: User = {
        id: uuidv4(),
        mobileNumber,
        language: 'English',
        Botid: botID,
        currentTopic: null,
        currentQuestIndex: null,
        setNumber: null,
        score: null,
      };
      await this.saveUser(newUser);
    }
  }

  async saveQuestIndex(
    mobileNumber: string,
    botID: string,
    currentQuestIndex: number
  ): Promise<User | any> {
    try {
      const existingUser = await this.findUserByMobileNumber(mobileNumber, botID);
      if (existingUser) {
        existingUser.currentQuestIndex = currentQuestIndex;
        await this.saveUser(existingUser);
        return existingUser;
      } else {
        const newUser: Partial<User> = {
          mobileNumber,
          currentQuestIndex,
        };
        await this.saveUser(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Error in saveQuestIndex:', error);
      throw error;
    }
  }

  async saveCurrentSetNumber(
    mobileNumber: string,
    botID: string,
    setNumber: number
  ): Promise<User | any> {
    try {
      const existingUser = await this.findUserByMobileNumber(mobileNumber, botID);
      if (existingUser) {
        existingUser.setNumber = setNumber;
        await this.saveUser(existingUser);
        return existingUser;
      } else {
        const newUser: Partial<User> = {
          mobileNumber,
          setNumber,
        };
        await this.saveUser(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Error in saveCurrentSetNumber:', error);
      throw error;
    }
  }

  async saveCurrentTopic(
    mobileNumber: string,
    botID: string,
    currentTopic: string
  ): Promise<User | any> {
    try {
      const existingUser = await this.findUserByMobileNumber(mobileNumber, botID);
      if (existingUser) {
        existingUser.currentTopic = currentTopic;
        await this.saveUser(existingUser);
        return existingUser;
      } else {
        const newUser: Partial<User> = {
          mobileNumber,
          currentTopic,
        };
        await this.saveUser(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Error in saveCurrentTopic:', error);
      throw error;
    }
  }

  async saveCurrentScore(
    mobileNumber: string,
    botID: string,
    score: number
  ): Promise<User | any> {
    try {
      const existingUser = await this.findUserByMobileNumber(mobileNumber, botID);
      if (existingUser) {
        existingUser.score = score;
        await this.saveUser(existingUser);
        return existingUser;
      } else {
        const newUser: Partial<User> = {
          mobileNumber,
          score,
        };
        await this.saveUser(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Error in saveCurrentScore:', error);
      throw error;
    }
  }

  async findUserByMobileNumber(mobileNumber: string, botID: string): Promise<User | null> {
    try {
      const params = {
        TableName: USERS_TABLE,
        KeyConditionExpression: 'mobileNumber = :mobileNumber and Botid = :Botid',
        ExpressionAttributeValues: {
          ':mobileNumber': mobileNumber,
          ':Botid': botID,
        },
      };
      const result = await dynamoDBClient().query(params).promise();
      
      if (result.Items?.[0]) {
        return this.mapDynamoDBItemToUser(result.Items[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error querying user from DynamoDB:', error);
      return null;
    }
  }

   async saveUser(user: Partial<User>): Promise<void> {
    const params = {
      TableName: USERS_TABLE,
      Item: user,
    };
    await dynamoDBClient().put(params).promise();
  }

  private mapDynamoDBItemToUser(item: DocumentClient.AttributeMap): User {
    return {
      id: item.id,
      mobileNumber: item.mobileNumber,
      language: item.language,
      Botid: item.Botid,
      currentTopic: item.currentTopic,
      currentQuestIndex: item.currentQuestIndex,
      setNumber: item.setNumber,
      score: item.score,
    };
  }
}
