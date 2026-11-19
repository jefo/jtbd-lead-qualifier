import { jtbdLeadQualifier } from "./bot/definition";
import { startTelegramBot } from "./telegram/adapter";

const token = process.env.BOT_TOKEN;
if (!token) {
	console.error("BOT_TOKEN is not set. Copy .env.example to .env and fill it.");
	process.exit(1);
}

await startTelegramBot({
	token,
	managerChatId: process.env.MANAGER_CHAT_ID,
	definition: jtbdLeadQualifier,
});
