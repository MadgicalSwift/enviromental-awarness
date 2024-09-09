export interface User {
    id: string;
    mobileNumber: string;
    language: string;
    Botid: string;
    button_response: string | null;
    topicListShown: boolean; // Add this
    quizResponse: any[]; // Add this
    topicSelected: string | undefined; // Add this
    setSelected: number | undefined; // Add this
    currentIndex: number; // Add this
  }
  