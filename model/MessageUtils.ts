export class MessageUtils {
    static sendMessages = (channel: { send: (arg0: any) => Promise<any>; }, messages: string | any[], index: number, message ?: any)  : Promise<any> => {
        if(index >= messages.length)
            return Promise.resolve(message);

        let text = messages[index]
        return channel.send(text).then(message => MessageUtils.sendMessages(channel, messages, index+1, message));
    }

    static sendMessagesUnsplit = (channel: { send: (arg0: any) => Promise<any>; }, messages: string) => {
        let rollsTextArray = [messages]
        while(rollsTextArray[rollsTextArray.length-1].length > 2000) {
            const lastText = rollsTextArray[rollsTextArray.length-1];
            const lastNewLineIndex = lastText.lastIndexOf('\n', 2000)+1;
            rollsTextArray.pop();
            const firstHalf = lastText.substring(0, lastNewLineIndex);
            const finalHalf = lastText.substring(lastNewLineIndex, lastText.length);
            rollsTextArray = rollsTextArray.concat([firstHalf, finalHalf]);
        }
        return MessageUtils.sendMessages(channel, rollsTextArray, 0)
    }
}