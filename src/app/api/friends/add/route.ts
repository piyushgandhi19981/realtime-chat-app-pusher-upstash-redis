import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { addFriendValidator } from "@/lib/validations/add-friend";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req: Request){
  try {
    const body = await req.json();
    const { email: emailToAdd } = addFriendValidator.parse(body);
    const id = await fetchRedis('get', `user:email:${emailToAdd}`) as string;
  if(!id){
    return new Response('This person does not exist.', { status: 400 });
  }
  const session = await getServerSession(authOptions);
  if(!session){
    return new Response('Unauthorised', { status: 401 });
  }

  if(id === session.user.id){
    return new Response('You cannot add yourself as friend', { status: 400 });
  }

  // check if user is already added

  const isAlreadyAdded = await fetchRedis('sismember', `user:${id}:incoming_friend_requests`, session.user.id) as 0 | 1;

  if(isAlreadyAdded){
    return new Response('Already added this User', { status: 400 });
  }

  const isAlreadyFriends = await fetchRedis('sismember', `user:${session.user.id}:friends`, id) as 0 | 1;

  if(isAlreadyFriends){
    return new Response('Already friends with this user', { status: 400 });
  }

  // valid request, send friend request

  pusherServer.trigger(toPusherKey(`user:${id}:incoming_friend_requests`), 'incoming_friend_requests', { senderId: session.user.id, senderEmail: session.user.email });

  db.sadd(`user:${id}:incoming_friend_requests`, session.user.id);

  return new Response('OK');

  } catch (error) {
    if(error instanceof z.ZodError){
        return new Response('Invalid request payload', { status: 422 });
    }
    return new Response('Invalid Request', { status: 400 });
  }
}