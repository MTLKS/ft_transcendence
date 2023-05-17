import { Friendship } from 'src/entity/friendship.entity';
import { Channel } from 'src/entity/channel.entity';
import { UserService } from 'src/user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Member } from 'src/entity/member.entity';
import { User } from 'src/entity/users.entity';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

@Injectable()
export class FriendshipService {
	constructor(@InjectRepository(Friendship) private friendshipRepository: Repository<Friendship>, @InjectRepository(User) private userRepository: Repository<User>, @InjectRepository(Member) private memberRepository: Repository<Member>, @InjectRepository(Channel) private channelRepository: Repository<Channel>, private userService: UserService) {}

	// User connect to friendship socket
	async userConnect(client: any, server: any): Promise<any> {
		client.join((await this.userService.getMyUserData(client.handshake.headers.authorization)).intraName);
	}

	// User send friend request to friendship room
	async friendshipRoom(client: any, server: any, intraName: string): Promise<any> {
		if (intraName === undefined)
			return { error: "Invalid body - body must include intraName(string)" };
		const USER_DATA = await this.userService.getMyUserData(client.handshake.headers.authorization);
		client.join(intraName);
		const FRIENDSHIP = await this.friendshipRepository.findOne({ where: {sender: {intraName: USER_DATA.intraName}, receiver: {intraName: intraName}} });
		if (FRIENDSHIP === null)
			return { error: "Friendship does not exist" };
		server.to(intraName).emit('friendshipRoom', { "intraName": USER_DATA.intraName, "status": FRIENDSHIP.status });
	}

	// Check if the JSON body is valid
	async checkJson(senderIntraName: string, receiverIntraName: string, status:string): Promise<any> {
		if (receiverIntraName == undefined || status == undefined)
			return { error: "Invalid body - body must include receiverIntraName(string) and status(stirng)" }
		if (senderIntraName == receiverIntraName)
			return { error: "Invalid intraName - no friends so you friend yourself?" }
		if (status.toUpperCase() != "PENDING" && status.toUpperCase() != "ACCEPTED" && status.toUpperCase() != "BLOCKED")
			return { error: "Invalid status - status must be PENDING, ACCEPTED or BLOCKED"}
	}

	// Get all friendship by accessToken
	async getFriendship(accessToken: string): Promise<any> {
		return await this.getFriendshipByIntraNAme((await this.userService.getMyUserData(accessToken)).intraName);
	}

	// Gets all friendship by intraName
	async getFriendshipByIntraNAme(intraName: string): Promise<any> {
		const RECEIVER = await this.friendshipRepository.find({ where: {receiver: {intraName: intraName}}, relations: ['sender', 'receiver'] });
		for (let receiver of RECEIVER) {
			const USER = await this.userRepository.findOne({ where: {intraName: receiver.receiver.intraName} });
			if (USER === null)
				continue;
			receiver['userName'] = USER.userName;
			receiver['elo'] = USER.elo;
			receiver['avatar'] = USER.avatar;
		}
		const SENDER = await this.friendshipRepository.find({ where: {sender: {intraName: intraName}}, relations: ['sender', 'receiver'] });
		for (let sender of SENDER) {
			const USER = await this.userRepository.findOne({ where: {intraName: sender.receiver.intraName} });
			if (USER === null)
				continue;
			sender['userName'] = USER.userName;
			sender['elo'] = USER.elo;
			sender['avatar'] = USER.avatar;
		}
		return this.userService.hideData([...RECEIVER, ...SENDER]);
	}

	// Creates a new friendship
	async newFriendship(accessToken: string, receiverIntraName: string, status: string): Promise<any> {
		const USER_DATA = await this.userService.getMyUserData(accessToken);
		const ERROR = await this.checkJson(USER_DATA.intraName, receiverIntraName, status);
		if (ERROR)
			return ERROR;
		if (status.toUpperCase() == "ACCEPTED")
			return { error: "Invalid status - friendship status (ACCEPTED) is not supported" }
		if (await this.getFriendshipStatus(accessToken, receiverIntraName) !== null)
			return { error: "Invalid receiverIntraName - friendship already exist" }
		const RECEIVER = await this.userRepository.findOne({ where: {intraName: receiverIntraName} });
		if (RECEIVER === null)
			return { error: "Invalid receiverIntraName - user does not exist" };
		const NEW_FRIENDSHIP = new Friendship(USER_DATA, RECEIVER, status.toUpperCase());
		await this.friendshipRepository.save(NEW_FRIENDSHIP);
		return this.userService.hideData(NEW_FRIENDSHIP);
	}

	// Updates a friendship
	async updateFriendship(accessToken: string, receiverIntraName: string, status: string): Promise<any> {
		const USER_DATA = await this.userService.getMyUserData(accessToken);
		const ERROR = await this.checkJson(USER_DATA.intraName, receiverIntraName, status);
		if (ERROR)
			return ERROR;

		const FRIEND_DATA = await this.userRepository.findOne({ where: {intraName: receiverIntraName} });
		if (FRIEND_DATA === null)
			return { error: "Invalid receiverIntraName - friendship does not exist"};
		const RECEIVER = await this.friendshipRepository.findOne({ where: {sender: {intraName: receiverIntraName}, receiver: {intraName: USER_DATA.intraName}} });
		if (status.toUpperCase() == "ACCEPTED") {
			if (RECEIVER === null)
				return { error: "Invalid receiverIntraName - friendship does not exist" }
			RECEIVER.status = "ACCEPTED";
			const MY_CHANNEL = await this.channelRepository.findOne({ where: {owner: {intraName: USER_DATA.intraName}, isRoom: true} });
			const MY_MEMBER = await this.memberRepository.findOne({ where: { user: {intraName: USER_DATA.intraName}, channel: MY_CHANNEL}})
			const FRIEND_CHANNEL = await this.channelRepository.findOne({ where: {owner: {intraName: receiverIntraName}} });
			if (FRIEND_CHANNEL === null)
				return { error: "Invalid receiverIntraName - friendship does not exist" }
			const FRIEND_MEMBER = await this.memberRepository.findOne({ where: { user: {intraName: FRIEND_DATA.intraName}, channel: FRIEND_CHANNEL}})
			if (MY_MEMBER === null)
				await this.memberRepository.save(new Member(USER_DATA, FRIEND_CHANNEL, true, false, false, new Date().toISOString()));
			if (FRIEND_MEMBER === null)
				await this.memberRepository.save(new Member(FRIEND_DATA, MY_CHANNEL, true, false, false, new Date().toISOString()));
			await this.friendshipRepository.save(RECEIVER)
			return this.userService.hideData(RECEIVER);
		}

		if (status.toUpperCase() == "BLOCKED")
		{
			const FRIENDSHIP = await this.getFriendshipStatus(accessToken, receiverIntraName);
			if (FRIENDSHIP === null) {
				return this.userService.hideData(await this.friendshipRepository.save(new Friendship(USER_DATA, FRIEND_DATA, "BLOCKED")));
			} else {
				if (FRIENDSHIP.status == "BLOCKED")
					return { error: "Invalid receiverIntraName - friendship already exist" }
				await this.friendshipRepository.delete(FRIENDSHIP);
				return this.userService.hideData(await this.friendshipRepository.save(new Friendship(USER_DATA, FRIEND_DATA, status.toUpperCase())));
			}
		}
		return { error: "Invalid status - friendship status (PENDING) is not supported" }
	}

	// Deletes a friendship
	async	deleteFriendship(accessToken: string, receiverIntraName: string): Promise<any> {
		const USER_DATA = await this.userService.getMyUserData(accessToken);
		const ERROR = await this.checkJson(USER_DATA.intraName, receiverIntraName, "ACCEPTED");
		if (ERROR)
			return ERROR;
		const FRIENDSHIP = await this.getFriendshipStatus(accessToken, receiverIntraName);
		if (FRIENDSHIP === null)
			return { error: "Friendship does not exist - use POST method to create" }
		if (FRIENDSHIP.status === "BLOCKED" && FRIENDSHIP.receiver.intraName === USER_DATA.intraName)
			return { error: "Invalid receiverIntraName - you really thought you can unblock yourself like this?"}
		await this.friendshipRepository.delete(FRIENDSHIP);
		return this.userService.hideData(FRIENDSHIP);
	}

	// Helper function that returns current friendship with a user
	async getFriendshipStatus(accessToken: string, receiverIntraName: string): Promise<any> {
		const USER_DATA = await this.userService.getMyUserData(accessToken);
		if (USER_DATA === null || USER_DATA.intraName === receiverIntraName)
			return null;
		return await this.friendshipRepository.findOne({ where: [{sender: {intraName: USER_DATA.intraName}, receiver: {intraName: receiverIntraName}}, {sender: {intraName: receiverIntraName}, receiver: {intraName: USER_DATA.intraName}}], relations: ["sender", "receiver"] });
	}
}
