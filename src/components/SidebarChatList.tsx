"use client";

import { pusherClient } from '@/lib/pusher';
import { chatHrefConstructor, toPusherKey } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { FC, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import UnseenChatToast from './UnseenChatToast';

interface SidebarChatListProps {
  friends: User[]
  sessionId: string
}

interface ExtendedMessage extends Message {
  senderName: string,
  senderImg: string
}

const SidebarChatList: FC<SidebarChatListProps> = ({ friends, sessionId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [unseenMessages, setUnseenMessages] = useState<Message[]>([]);
  const [activeChats, setActiveChats] = useState<User[]>(friends)

  useEffect(() => {
    pusherClient.subscribe(toPusherKey(`user:${sessionId}:chats`));

    const chatHandler = (message: ExtendedMessage) => {
      const shouldNotify = pathname !== `/dashboard/chat/${chatHrefConstructor(sessionId, message.senderId)}`;
      if(!shouldNotify) return;
      toast.custom((t) => (
        <UnseenChatToast
          t={t}
          sessionId={sessionId}
          senderId={message.senderId}
          senderImg={message.senderImg}
          senderName={message.senderName}
          senderMessage={message.text}
        />
      ));
      setUnseenMessages(prev => [...prev, message]);
    };

    pusherClient.bind('new_message', chatHandler);

    pusherClient.subscribe(toPusherKey(`user:${sessionId}:friends`));

    const newFriendHandler = (newFriend: User) => {
      setActiveChats((prev) => [...prev, newFriend])
    };

    pusherClient.bind('new_friend', newFriendHandler);

    return () => {
        pusherClient.unsubscribe(toPusherKey(`user:${sessionId}:chats`));
        pusherClient.unsubscribe(toPusherKey(`user:${sessionId}:friends`));
        pusherClient.unbind('new_message', chatHandler);
        pusherClient.unbind('new_friend', newFriendHandler);
    }
  }, [pathname, sessionId, router])

  useEffect(() => {
    if(pathname?.includes('chat')){
      setUnseenMessages((prev) => prev.filter(msg => !pathname.includes(msg.senderId)))
    }
  }, [pathname]);

  const onClick = (friendId: string) => {
    router.push(`/dashboard/chat/${chatHrefConstructor(sessionId, friendId)}`);
  }

  return (
    <ul role='list' className='max-h-[25rem] overflow-y-auto'>
        {activeChats.sort().map(friend => {
          const unseenMessagesCount = unseenMessages.filter((unseenMessage) => {
            return unseenMessage.senderId === friend.id;
          }).length;
          return (
            <li key={friend.id}>
              <div
                role='presentation'
                onClick={() => onClick(friend.id)}
                className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold" >
                {friend.name}
                {unseenMessagesCount > 0 ? <div className='bg-indigo-600 font-medium text-xs text-white w-4 h-4 rounded-full flex justify-center items-center' >{unseenMessagesCount}</div> : null}
              </div>
            </li>
          );
        })}
    </ul>
  );
}

export default SidebarChatList