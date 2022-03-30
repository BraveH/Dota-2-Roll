export class MessageUtils {
    static sendMessages = (channel: { send: (arg0: any) => Promise<any>; }, messages: string | any[], index: number) => {
        if(index >= messages.length)
            return;

        let text = messages[index]
        channel.send(text).then(_ => MessageUtils.sendMessages(channel, messages, index+1));
    }
}