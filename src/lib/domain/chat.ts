export type Message = {
	id: number;
	chatId: number;
	sender: string;
	message: string;
	sentAt: Date;
};

export type Chat = {
	id: number;
	userOne: string;
	userTwo: string;
	messages: Message[];
};

export type ChatPreview = {
	id: number;
	userOne: string;
	userTwo: string;
	lastMessage?: Message;
};

export type SerializableMessage = {
	id: number;
	chatId: number;
	sender: string;
	message: string;
	sentAt: string;
};

export type SerializableChat = {
	id: number;
	userOne: string;
	userTwo: string;
	messages: SerializableMessage[];
};

export type SerializableChatPreview = {
	id: number;
	userOne: string;
	userTwo: string;
	lastMessage?: SerializableMessage;
};

export const messageToSerializable = (message: Message): SerializableMessage => ({
	...message,
	sentAt: message.sentAt.toISOString()
});

export const messageFromSerializable = (message: SerializableMessage): Message => ({
	...message,
	sentAt: new Date(message.sentAt)
});

export const chatToSerializable = (chat: Chat): SerializableChat => ({
	...chat,
	messages: chat.messages.map(messageToSerializable)
});

export const chatFromSerializable = (chat: SerializableChat): Chat => ({
	...chat,
	messages: chat.messages.map(messageFromSerializable)
});

export const chatPreviewToSerializable = (preview: ChatPreview): SerializableChatPreview => ({
	...preview,
	lastMessage: preview.lastMessage ? messageToSerializable(preview.lastMessage) : undefined
});

export const chatPreviewFromSerializable = (preview: SerializableChatPreview): ChatPreview => ({
	...preview,
	lastMessage: preview.lastMessage ? messageFromSerializable(preview.lastMessage) : undefined
});
