import { describe, expect, it } from "bun:test";
import { createEngine, type RenderedMessage } from "persona-forge";
import { jtbdLeadQualifier } from "../src/bot/definition";
import { JtbdTelegramBot, type TelegramApi } from "../src/telegram/adapter";

const createFakeApi = () => {
	const sent: Array<{ chatId: number | string; message: RenderedMessage }> = [];
	const answered: string[] = [];

	const api: TelegramApi = {
		async getUpdates() {
			return [];
		},
		async sendMessage(chatId, message) {
			sent.push({ chatId, message });
		},
		async answerCallbackQuery(id) {
			answered.push(id);
		},
	};

	return { api, sent, answered };
};

const createBot = async (managerChatId?: string) => {
	const fake = createFakeApi();
	const bot = new JtbdTelegramBot(
		jtbdLeadQualifier,
		fake.api,
		managerChatId,
		createEngine(),
	);
	await bot.init();
	return { bot, ...fake };
};

describe("Telegram adapter", () => {
	it("starts a conversation on /start", async () => {
		const { bot, sent } = await createBot();
		await bot.handleUpdate({
			update_id: 1,
			message: { chat: { id: 42 }, text: "/start" },
		});

		expect(sent).toHaveLength(1);
		expect(sent[0]?.chatId).toBe(42);
		expect(sent[0]?.message.text).toContain("JTBD-квалификатор");
		expect(sent[0]?.message.buttons[0]?.label).toBe("Поехали");
	});

	it("routes a callback button to the next state", async () => {
		const { bot, sent, answered } = await createBot();
		await bot.handleUpdate({
			update_id: 1,
			message: { chat: { id: 42 }, text: "/start" },
		});
		await bot.handleUpdate({
			update_id: 2,
			callback_query: {
				id: "cb-1",
				data: "START",
				message: { chat: { id: 42 } },
			},
		});

		expect(answered).toEqual(["cb-1"]);
		expect(sent.at(-1)?.message.text).toContain("Как к вам обращаться");
	});

	it("sends the lead card to the manager after the flow", async () => {
		const { bot, sent } = await createBot("999");

		await bot.handleUpdate({
			update_id: 1,
			message: { chat: { id: 42 }, text: "/start" },
		});
		for (const [index, update] of [
			{ callback_query: { id: "1", data: "START", message: { chat: { id: 42 } } } },
			{ message: { chat: { id: 42 }, text: "Иван" } },
			{
				callback_query: {
					id: "2",
					data: `ADD_JOB|{"value":"Квалификация лидов"}`,
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "3",
					data: "SUBMIT_JOBS",
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "4",
					data: `ADD_CONTEXT|{"value":"Telegram"}`,
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "5",
					data: "SUBMIT_CONTEXTS",
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "6",
					data: `SELECT_STRUGGLE|{"value":"Теряем лиды"}`,
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "7",
					data: `SELECT_OUTCOME|{"value":"Рост конверсии"}`,
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "8",
					data: `ADD_EXTRA|{"value":"Интеграция с CRM"}`,
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "9",
					data: "SUBMIT_EXTRAS",
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "10",
					data: `SELECT_TIMELINE|{"value":"1–2 недели"}`,
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: {
					id: "11",
					data: `SELECT_BUDGET|{"value":"$2500+"}`,
					message: { chat: { id: 42 } },
				},
			},
			{
				callback_query: { id: "12", data: "CONTINUE", message: { chat: { id: 42 } } },
			},
			{
				callback_query: { id: "13", data: "BOOK_CALL", message: { chat: { id: 42 } } },
			},
			{ message: { chat: { id: 42 }, text: "+7 999 123-45-67" } },
		].entries()) {
			await bot.handleUpdate({
				update_id: index + 2,
				...update,
			} as never);
		}

		const managerMessages = sent.filter((item) => item.chatId === "999");
		expect(managerMessages).toHaveLength(1);
		expect(managerMessages[0]?.message.text).toContain("Лид: горячий");
		expect(managerMessages[0]?.message.text).toContain("+7 999 123-45-67");
	});
});
