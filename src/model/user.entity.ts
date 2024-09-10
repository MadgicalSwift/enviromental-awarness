// export interface User {
//     id: string;
//     mobileNumber: string;
//     language: string;
//     Botid: string;
//     button_response: string | null;
//     topicListShown: boolean; // Add this
//     quizResponse: any[]; // Add this
//     topicSelected: string | undefined; // Add this
//     setSelected: number | undefined; // Add this
//     currentIndex: number; // Add this
//   }
  
import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class User {
  @IsString()
  id: string;

  @IsString()
  mobileNumber: string;

  @IsString()
  language: string;
  
  @IsString()
  Botid: string;

  // AppState fields
  @IsOptional() // Marked as optional since these may not always be present
  @IsString()
  topicSelected?: string;

  @IsOptional()
  @IsString()
  setSelected?: string;

  @IsOptional()
  @IsArray()
  quizResponse?: any[];

  @IsOptional()
  @IsNumber()
  currentIndex?: number;

  @IsOptional()
  @IsNumber()
  topicListShown?: boolean;

  // Progress tracking fields
  @IsOptional()
  @IsString()
  currentTopic?: string;

  @IsOptional()
  @IsNumber()
  currentQuestIndex?: number;

  @IsOptional()
  @IsNumber()
  setNumber?: number;

  @IsOptional()
  @IsNumber()
  score?: number;
}
