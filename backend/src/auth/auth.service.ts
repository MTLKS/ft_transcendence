import { Injectable, Param, Headers } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/entity/user.entity";
import { Repository } from "typeorm";
import * as CryptoJS from 'crypto-js';

@Injectable()
export class AuthService {
	constructor(@InjectRepository(User) private userRepository: Repository<User>, private userService: UserService) {}

	// Starts the login process
	async startLogin(@Headers() header: any): Promise<any> {
		const COOKIES = header.cookie ? header.cookie.split("; ") : [];
		const LINK = "https://api.intra.42.fr/oauth/authorize/";
		const REDIRECT_URI = "http%3A%2F%2Flocalhost%3A5173"
		if (COOKIES.length === 0)
			return { redirectUrl: LINK + "?client_id=" + process.env.APP_UID + "&redirect_uri=" + REDIRECT_URI + "&response_type=code"};
		const AUTH_CODE = COOKIES.find((cookie) => cookie.startsWith('access_token=')).split('=')[1];
		if (AUTH_CODE === "null")
			return { redirectUrl: LINK + "?client_id=" + process.env.APP_UID + "&redirect_uri=" + REDIRECT_URI + "&response_type=code"};
		try {
			let accessToken = CryptoJS.AES.decrypt(AUTH_CODE, process.env.ENCRYPT_KEY).toString(CryptoJS.enc.Utf8);
			const DATA = await this.userRepository.find({ where: {accessToken} })
			return (DATA.length !== 0) ? { redirectUrl: "http://localhost:5173" } : { redirectUrl: LINK + "?client_id=" + process.env.APP_UID + "&redirect_uri=" + REDIRECT_URI + "&response_type=code"};
		}
		catch {
			return { redirectUrl: "http://localhost:5173" };
		}
	}

	// Use the code from query to get token info
	async postCode(@Param('code') code: string): Promise<any> {
		const DATA = {
			"grant_type": "authorization_code",
			"client_id": process.env.APP_UID,
			"client_secret": process.env.APP_SECRET,
			"code": code,
			"redirect_uri": "http://localhost:5173"
		};
		const API_RESPONSE = await fetch("https://api.intra.42.fr/oauth/token", {
			method: 'POST',
			headers:{ 'Content-Type': 'application/json' },
			body : JSON.stringify(DATA),
		});
		const RETURN_DATA = await API_RESPONSE.json();
		if (RETURN_DATA.access_token == null)
			return { accessToken: null };
		let accessToken = CryptoJS.AES.encrypt(RETURN_DATA.access_token, process.env.ENCRYPT_KEY).toString()
		const INTRA_DTO = await this.userService.getMyIntraData(accessToken);
		const ENTITY_USER = new User();
		ENTITY_USER.accessToken = RETURN_DATA.access_token;
		ENTITY_USER.intraId = INTRA_DTO.id;
		ENTITY_USER.tfaSecret = null;
		this.userRepository.save(ENTITY_USER);
		return { accessToken };
	}
}