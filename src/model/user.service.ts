import { Injectable } from '@nestjs/common';
import { dynamoDBClient } from 'src/config/database-config.service';
import { v4 as uuidv4 } from 'uuid';
const { USERS_TABLE } = process.env;
@Injectable()
export class UserService {
  async createUser(
    mobileNumber: string,
    language: string,
    botID: string,
  ): Promise<any> {
    try {
      const existingUser = await this.findUserByMobileNumber(
        mobileNumber,
        botID,
      );
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
            language: 'English',
            Botid: botID,
            button_response: null,
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
          language: 'English',
          Botid: botID,
          chatHistory: [],
          transaction: [],
          credit: '100',
          button_response: null,
          paymentId: null,
          paymentStatus: null,
        },
      };
      await dynamoDBClient().put(newUser).promise();
    }
  }

  async findUserByMobileNumber(
    mobileNumber: string,
    botID?: string,
  ): Promise<any> {
    const params: any = {
      TableName: USERS_TABLE,
      KeyConditionExpression: 'mobileNumber = :mobileNumber and Botid=:Botid',
      ExpressionAttributeValues: {
        ':mobileNumber': mobileNumber,
        ':Botid': botID,
      },
    };
    try {
      const result = await dynamoDBClient().query(params).promise();
      let user =
        result.Items && result.Items.length > 0 ? result.Items[0] : null;

      if (
        !user ||
        user?.language === '' ||
        user?.credit == 'NaN' ||
        user?.credit == undefined
      ) {
        user = {
          ...user,
          id: uuidv4(),
          mobileNumber,
          language: 'English',
          Botid: botID,
          button_response: null,
        };

        const setLanguage = {
          TableName: USERS_TABLE,
          Item: user,
        };

        await dynamoDBClient().put(setLanguage).promise();
      }
      return user;
    } catch (error) {
      console.error('Error querying user from DynamoDB:', error);
      return null;
    }
  }
}
