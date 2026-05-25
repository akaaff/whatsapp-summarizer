export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  ChatList: undefined;
  SummaryRequest: { chatId: string };
  SummaryResult: { requestId: string; chatName: string; language: string };
  SummaryHistory: undefined;
  LinkWhatsApp: undefined;
  Search: { chatId: string; chatName: string };
};
