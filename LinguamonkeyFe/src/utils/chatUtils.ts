import type { ChatMessage } from '../types/entity';

const isSameMessage = (localMsg: ChatMessage, serverMsg: ChatMessage): boolean => {
    if (localMsg.id.chatMessageId === serverMsg.id.chatMessageId) return true;

    if (localMsg.senderId === serverMsg.senderId && localMsg.isLocal) {

        const timeDiff = Math.abs(new Date(localMsg.id.sentAt).getTime() - new Date(serverMsg.id.sentAt).getTime());

        if (localMsg.messageType === serverMsg.messageType && timeDiff < 60000) {
            if (localMsg.mediaUrl && localMsg.mediaUrl === serverMsg.mediaUrl) return true;

            if (localMsg.messageType === 'TEXT' && timeDiff < 5000) {
                return true;
            }
        }
    }
    return false;
};

export const upsertMessageList = (currentList: ChatMessage[], newMessage: ChatMessage): { list: ChatMessage[], isNew: boolean } => {
    let list = [...currentList];

    const idMatchIndex = list.findIndex(m => m.id.chatMessageId === newMessage.id.chatMessageId);

    if (idMatchIndex > -1) {
        const existing = list[idMatchIndex];
        list[idMatchIndex] = {
            ...existing,
            ...newMessage,
            decryptedContent: newMessage.decryptedContent || existing.decryptedContent,
            isLocal: false
        };
        return { list, isNew: false };
    }

    if (!newMessage.isLocal) {
        const localMatchIndex = list.findIndex(m => m.isLocal && isSameMessage(m, newMessage));
        if (localMatchIndex > -1) {
            const existing = list[localMatchIndex];
            list[localMatchIndex] = {
                ...newMessage,
                decryptedContent: existing.decryptedContent,
            };
            return { list, isNew: false };
        }
    }

    list = [newMessage, ...list];

    list.sort((a, b) => new Date(b.id.sentAt).getTime() - new Date(a.id.sentAt).getTime());

    return { list, isNew: true };
};