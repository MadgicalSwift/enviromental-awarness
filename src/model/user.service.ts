import { Injectable } from '@nestjs/common';
import { dynamoDBClient } from 'src/config/database-config.service';
import { v4 as uuidv4 } from 'uuid';
const { USERS_TABLE } = process.env;

@Injectable()
export class UserService {
  // Initialize appState structure
  private initializeAppState(): any {
    return {
      topicListShown: false,
      quizResponse: [],
      topicSelected: undefined,
      setSelected: undefined,
      currentIndex: 0,
    };
  }

  // Create or update user
  async createUser(
    mobileNumber: string,
    language: string,
    botID: string,
  ): Promise<any> {
    try {
      const existingUser = await this.findUserByMobileNumber(mobileNumber, botID);
      if (existingUser) {
        existingUser.language = language;
        const updateUser = {
          TableName: USERS_TABLE,
          Item: existingUser,
        };
        await dynamoDBClient().put(updateUser).promise();
        return existingUser;
      } else {
        const newUser = {
          TableName: USERS_TABLE,
          Item: {
            id: uuidv4(),
            mobileNumber: mobileNumber,
            language: language || 'English',
            Botid: botID,
            button_response: null,
            appState: this.initializeAppState(), // Initialize appState
          },
        };
        await dynamoDBClient().put(newUser).promise();
        return newUser;
      }
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  // Set user preferred language
  async setUserPreferredLanguage(
    mobileNumber: string,
    language: string,
    botID: string,
  ): Promise<void> {
    const user = await this.findUserByMobileNumber(mobileNumber, botID);
    if (user) {
      user.language = language;
      const setLanguage = {
        TableName: USERS_TABLE,
        Item: user,
      };
      await dynamoDBClient().put(setLanguage).promise();
    } else {
      const newUser = {
        TableName: USERS_TABLE,
        Item: {
          id: uuidv4(),
          mobileNumber,
          language: language || 'English',
          Botid: botID,
          chatHistory: [],
          transaction: [],
          credit: '100',
          button_response: null,
          paymentId: null,
          paymentStatus: null,
          appState: this.initializeAppState(), // Initialize appState
        },
      };
      await dynamoDBClient().put(newUser).promise();
    }
  }

  // Find user by mobile number
  async findUserByMobileNumber(
    mobileNumber: string,
    botID?: string,
  ): Promise<any> {
    const params: any = {
      TableName: USERS_TABLE,
      KeyConditionExpression: 'mobileNumber = :mobileNumber and Botid = :Botid',
      ExpressionAttributeValues: {
        ':mobileNumber': mobileNumber,
        ':Botid': botID,
      },
    };
    try {
      const result = await dynamoDBClient().query(params).promise();
      let user =
        result.Items && result.Items.length > 0 ? result.Items[0] : null;

      if (!user) {
        return null;
      }

      // Ensure appState exists
      if (!user.appState) {
        user.appState = this.initializeAppState();
        const setAppState = {
          TableName: USERS_TABLE,
          Item: user,
        };
        await dynamoDBClient().put(setAppState).promise();
      }

      return user;
    } catch (error) {
      console.error('Error querying user from DynamoDB:', error);
      return null;
    }
  }

  // Get appState for a user
  async getAppState(mobileNumber: string, botID: string): Promise<any> {
    const user = await this.findUserByMobileNumber(mobileNumber, botID);
    return user?.appState || this.initializeAppState(); // Return existing appState or initialize
  }

  // Set appState for a user
  async setAppState(mobileNumber: string, appState: any, botID: string): Promise<void> {
    const user = await this.findUserByMobileNumber(mobileNumber, botID);
    if (user) {
      user.appState = appState;
      const params = {
        TableName: USERS_TABLE,
        Item: user,
      };
      await dynamoDBClient().put(params).promise();
    } else {
      const newUser = {
        id: uuidv4(),
        mobileNumber,
        language: 'English', // Default language
        Botid: botID,
        appState: appState || this.initializeAppState(),
        // other default values
      };
      const params = {
        TableName: USERS_TABLE,
        Item: newUser,
      };
      await dynamoDBClient().put(params).promise();
    }
  }
}
