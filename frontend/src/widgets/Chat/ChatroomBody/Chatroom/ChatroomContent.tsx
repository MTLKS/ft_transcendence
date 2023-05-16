import React, { useContext, useEffect, useRef, useState } from 'react'
import ChatroomHeader from './ChatroomHeader'
import ChatroomTextField from './ChatroomTextField'
import { ChatroomData, ChatroomMessageData, MemberData, NewMessageData } from '../../../../model/ChatRoomData';
import { getChatroomMessages, getMemberData } from '../../../../functions/chatAPIs';
import ChatroomMessage from './ChatroomMessage';
import UserContext from '../../../../contexts/UserContext';
import { ChatContext, ChatMessagesComponentContext, ChatroomMessagesContext, UnreadChatroomsContext } from '../../../../contexts/ChatContext';
import { UserData } from '../../../../model/UserData';
import { playNewMessageSound } from '../../../../functions/audio';
import ChatUnreadSeparator from './ChatUnreadSeparator';
import { set } from 'lodash';

interface ChatroomContentProps {
  chatroomData: ChatroomData;
}

// append new message but to the top of the list (index 0)
export function appendNewMessage(newMessage: ChatroomMessageData, messages: ChatroomMessageData[]) {
  const newMessages = [newMessage, ...messages];
  return newMessages;
}

function ChatroomContent(props: ChatroomContentProps) {

  const { chatroomData } = props;
  const { unreadChatrooms, setUnreadChatrooms } = useContext(UnreadChatroomsContext);
  const { chatSocket } = useContext(ChatContext);
  const { myProfile } = useContext(UserContext);
  const [allMessages, setAllMessages] = useState<ChatroomMessageData[]>([]);
  const [isMessagesSet, setIsMessagesSet] = useState<boolean>(false);
  const [chatMemberLastRead, setChatMemberLastRead] = useState<string>();
  const scrollToHereRef = useRef<HTMLDivElement>(null);
  const [separatorAtIndex, setSeparatorAtIndex] = useState<number>(-1);
  const [messagesComponent, setMessagesComponent] = useState<JSX.Element[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);

  useEffect(() => {
    // pop off this channel id from the list of unread channels
    if (unreadChatrooms.includes(chatroomData.channelId)) {
      const newUnreadChatrooms = unreadChatrooms.filter((channelId) => channelId !== chatroomData.channelId);
      setUnreadChatrooms(newUnreadChatrooms);
    }

    // fetch message history
    fetchMessageHistory();
    // get chatroom member data
    getChatroomMemberData();
    // listen for incoming messages
    return listenForIncomingMessages();
  }, []);

  useEffect(() => {
    if (!chatMemberLastRead) return;
    setMessagesComponent(displayMessages());
  }, [allMessages, chatMemberLastRead]);

  if (!chatMemberLastRead || !isMessagesSet) return <></>;

  return (
    <ChatroomMessagesContext.Provider value={{ messages: allMessages, setMessages: setAllMessages }}>
      <div className='w-full h-0 flex-1 flex flex-col box-border'>
        <ChatroomHeader chatroomData={chatroomData} />
        <div className='h-full overflow-scroll scrollbar-hide flex flex-col-reverse gap-y-4 px-5 pb-4 scroll-smooth'>
          { messagesComponent }
        </div>
        <ChatMessagesComponentContext.Provider value={{ separatorAtIndex, setSeparatorAtIndex, messagesComponent, setMessagesComponent, setIsFirstLoad }}>
          <ChatroomTextField chatroomData={chatroomData} pingServer={pingServerToUpdateLastRead} />
        </ChatMessagesComponentContext.Provider>
      </div>
    </ChatroomMessagesContext.Provider>
  )

  async function fetchMessageHistory() {
    const allMsgs: ChatroomMessageData[] = (await getChatroomMessages(chatroomData.channelId)).data;
    const sortedMsgs = allMsgs.sort((b, a) => new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime());
    setAllMessages(sortedMsgs);
    setIsMessagesSet(true);
  }

  async function getChatroomMemberData() {
    const memberData = (await getMemberData(chatroomData.channelId)).data as MemberData;
    setChatMemberLastRead(memberData.lastRead);
  }

  function pingServerToUpdateLastRead() {
    chatSocket.sendMessages("read", { channelId: chatroomData.channelId });
    chatSocket.listen("read", (data: MemberData) => {
      setChatMemberLastRead(data.lastRead);
    });
    chatSocket.removeListener("read");
  }

  function listenForIncomingMessages() {
    chatSocket.listen("message", (newMessage: ChatroomMessageData) => {
      setAllMessages((messages) => appendNewMessage(newMessage, messages));
      pingServerToUpdateLastRead();
      playNewMessageSound();
    });
  }

  function displayMessages() {

    if (!chatMemberLastRead) return [];

    const lastReadTime = new Date(chatMemberLastRead!);
    const oldMessages = allMessages.filter((message) => new Date(message.timeStamp) < lastReadTime);
    const newMessages = allMessages.filter((message) => new Date(message.timeStamp) >= lastReadTime);
    let messagesToDisplay: any[] = [];

    if (newMessages.length > 0 && isFirstLoad) {
      messagesToDisplay = [...newMessages, {type: "separator"}, ...oldMessages];
    } else if (newMessages.length > 0 && !isFirstLoad) {
      messagesToDisplay = [...newMessages, ...oldMessages];
    } else {
      messagesToDisplay = [...oldMessages];
    }

    let messagesComponent: JSX.Element[] = [];
    messagesToDisplay.map((message, index) => {
      if (message.type === "separator") {
        setSeparatorAtIndex(index);
        messagesComponent.push(<div ref={scrollToHereRef} key={"separator_div" + new Date().toDateString()}><ChatUnreadSeparator key={"separator" + new Date().toISOString()}/></div>);
      } else {
        const messageData = message as ChatroomMessageData;
        messagesComponent.push(<ChatroomMessage key={messageData.messageId + new Date().toDateString()} messageData={messageData} isMyMessage={myProfile.intraName === messageData.user.intraName} />);
      }
    });
    if (isFirstLoad) pingServerToUpdateLastRead();
    return messagesComponent;
  }
}

export default ChatroomContent