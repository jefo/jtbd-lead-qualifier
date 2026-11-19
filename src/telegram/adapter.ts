import {
	createEngine,
	toTelegram,
	type BotPersona,
	type BotPersonaDefinition,
	type Engine,
	type RenderedMessage,
} from "persona-forge";
import { formatLeadCard } from "../scoring/lead-score";

interface TelegramUpdate {
	update_id: number;
	message?: {
		chat: { id: number };
		from?: { id: number; first_name?: string };
		text?: string;
	};
	callback_query?: {
		id: string;
		data?: string;
		message?: { chat: { id: number } };
	};
}

export interface TelegramApi {
	getUpdates(offset: number): Promise<TelegramUpdate[]>;
	sendMessage(chatId: number | string, message: RenderedMessage): Promise<void>;
	answerCallbackQuery(id: string): Promise<void>;
}

function createTelegramApi(token: string): TelegramApi {
	const base = `https://api.telegram.org/bot${token}`;

	async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
		const response = await fetch(`${base}/${method}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		const data = (await response.json()) as { ok: boolean; result?: T; description?: string };
		if (!data.ok) {
			throw new Error(`Telegram ${method} failed: ${data.description ?? "unknown error"}`);
		}
		return data.result as T;
	}

	return {
		getUpdates(offset) {
			return call<TelegramUpdate[]>("getUpdates", {
				offset,
				timeout: 25,
				allowed_updates: ["message", "callback_query"],
			});
		},
		async sendMessage(chatId, message) {
			await call("sendMessage", {
				chat_id: chatId,
				...toTelegram(message),
			});
		},
		answerCallbackQuery(id) {
			return call("answerCallbackQuery", { callback_query_id: id }).then(() => undefined);
		},
	};
}

export class JtbdTelegramBot {
	private readonly engine: Engine;
	private persona?: BotPersona;

	constructor(
		private readonly definition: BotPersonaDefinition,
		private readonly api: TelegramApi,
		private readonly managerChatId?: string,
		engine: Engine = createEngine(),
	) {
		this.engine = engine;
	}

	async init(): Promise<void> {
		this.persona = await this.engine.definePersona(this.definition);
	}

	async handleUpdate(update: TelegramUpdate): Promise<void> {
		if (update.message?.text) {
			await this.handleMessage(update.message.chat.id, update.message.text);
			return;
		}

		if (update.callback_query) {
			const chatId = update.callback_query.message?.chat.id;
			await this.api.answerCallbackQuery(update.callback_query.id);
			if (chatId && update.callback_query.data) {
				await this.handleCallback(chatId, update.callback_query.data);
			}
		}
	}

	private async handleMessage(chatId: number, text: string): Promise<void> {
		const key = String(chatId);

		if (text.trim() === "/start") {
			const active = await this.engine.getActiveConversation(key);
			if (active && this.persona) {
				const screen = this.engine.screen(this.persona, active);
				await this.api.sendMessage(chatId, screen);
				return;
			}
			if (!this.persona) throw new Error("Bot is not initialized.");
			const started = await this.engine.start({ personaId: this.persona.id, chatId: key });
			await this.api.sendMessage(chatId, started.message);
			return;
		}

		const active = await this.engine.getActiveConversation(key);
		if (!active) {
			await this.api.sendMessage(chatId, {
				component: "message",
				text: "Нажмите /start, чтобы начать.",
				buttons: [],
			});
			return;
		}

		await this.apply(chatId, key, "text", { text });
	}

	private async handleCallback(chatId: number, data: string): Promise<void> {
		const [event, json] = data.split("|", 2);
		if (!event) return;

		let payload: Record<string, unknown> = {};
		if (json) {
			try {
				payload = JSON.parse(json) as Record<string, unknown>;
			} catch {
				await this.api.sendMessage(chatId, {
					component: "message",
					text: "Не удалось прочитать кнопку. Попробуйте ещё раз.",
					buttons: [],
				});
				return;
			}
		}

		await this.apply(chatId, String(chatId), event, payload);
	}

	private async apply(
		chatId: number,
		key: string,
		event: string,
		payload: Record<string, unknown>,
	): Promise<void> {
		const result = await this.engine.handle({ chatId: key, event, payload });

		if (!result.ok) {
			await this.api.sendMessage(chatId, {
				component: "message",
				text: "Здесь нужно выбрать вариант кнопкой. Попробуйте ещё раз.",
				buttons: [],
			});
			return;
		}

		await this.api.sendMessage(chatId, result.message);

		if (result.finished) {
			const card = formatLeadCard(result.conversation.form.toJSON());
			if (this.managerChatId) {
				await this.api.sendMessage(this.managerChatId, {
					component: "message",
					text: card,
					buttons: [],
				});
			}
			console.log(`[lead] ${card.replace(/\n/g, " | ")}`);
		}
	}
}

export async function startTelegramBot(options: {
	token: string;
	managerChatId?: string;
	definition: BotPersonaDefinition;
}): Promise<void> {
	const api = createTelegramApi(options.token);
	const bot = new JtbdTelegramBot(options.definition, api, options.managerChatId);
	await bot.init();

	console.log("JTBD Lead Qualifier is running. Send /start to the bot.");

	let offset = 0;
	while (true) {
		try {
			const updates = await api.getUpdates(offset);
			for (const update of updates) {
				offset = update.update_id + 1;
				try {
					await bot.handleUpdate(update);
				} catch (error) {
					console.error("[update]", error);
				}
			}
		} catch (error) {
			console.error("[polling]", error);
			await Bun.sleep(3000);
		}
	}
}

export { createTelegramApi };
