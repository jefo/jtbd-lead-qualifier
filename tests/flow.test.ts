import { describe, expect, it } from "bun:test";
import { createEngine } from "persona-forge";
import { jtbdLeadQualifier } from "../src/bot/definition";
import { formatLeadCard, scoreLead } from "../src/scoring/lead-score";

const start = async () => {
	const engine = createEngine();
	const persona = await engine.definePersona(jtbdLeadQualifier);
	const chatId = "test-chat";
	const started = await engine.start({ personaId: persona.id, chatId });
	return { engine, chatId, started };
};

const send = async (
	engine: ReturnType<typeof createEngine>,
	chatId: string,
	event: string,
	payload?: Record<string, unknown>,
) => {
	const result = await engine.handle({ chatId, event, payload });
	if (!result.ok) throw new Error(result.reason);
	return result;
};

describe("JTBD lead qualifier flow", () => {
	it("goes from /start to a booked call with a hot lead", async () => {
		const { engine, chatId, started } = await start();
		expect(started.message.text).toContain("JTBD-квалификатор");

		await send(engine, chatId, "START");
		await send(engine, chatId, "text", { text: "Иван" });
		await send(engine, chatId, "ADD_JOB", { value: "Квалификация лидов" });
		await send(engine, chatId, "ADD_JOB", { value: "Продажи" });
		await send(engine, chatId, "SUBMIT_JOBS");
		await send(engine, chatId, "ADD_CONTEXT", { value: "Telegram" });
		await send(engine, chatId, "SUBMIT_CONTEXTS");
		await send(engine, chatId, "SELECT_STRUGGLE", { value: "Теряем лиды" });
		await send(engine, chatId, "SELECT_OUTCOME", { value: "Рост конверсии" });
		await send(engine, chatId, "ADD_EXTRA", { value: "Интеграция с CRM" });
		await send(engine, chatId, "SUBMIT_EXTRAS");

		const offer = await send(engine, chatId, "SELECT_TIMELINE", { value: "1–2 недели" }).then(() =>
			send(engine, chatId, "SELECT_BUDGET", { value: "$2500+" }),
		);
		expect(offer.message.text).toContain("$1500–2500");
		expect(offer.message.text).toContain("SaaS-триала");

		await send(engine, chatId, "CONTINUE");
		await send(engine, chatId, "SHOW_EXAMPLES");
		await send(engine, chatId, "BOOK_CALL");
		const booked = await send(engine, chatId, "text", {
			text: "+7 999 123-45-67",
		});

		expect(booked.finished).toBe(true);
		expect(booked.message.text).toContain("Готово");
		expect(booked.message.text).toContain("+7 999 123-45-67");

		const form = started.conversation.form.toJSON();
		expect(form).toMatchObject({
			name: "Иван",
			job: ["Квалификация лидов", "Продажи"],
			context: ["Telegram"],
			extras: ["Интеграция с CRM"],
			budget: "$2500+",
			phone: "+7 999 123-45-67",
		});

		const score = scoreLead(form);
		expect(score.temperature).toBe("hot");
		expect(score.score).toBe(8);
	});

	it("uses the cheaper estimate without CRM", async () => {
		const { engine, chatId } = await start();
		await send(engine, chatId, "START");
		await send(engine, chatId, "text", { text: "Анна" });
		await send(engine, chatId, "SUBMIT_JOBS");
		await send(engine, chatId, "SUBMIT_CONTEXTS");
		await send(engine, chatId, "SELECT_STRUGGLE", { value: "Много рутины" });
		await send(engine, chatId, "SELECT_OUTCOME", { value: "Быстрее отвечать" });
		await send(engine, chatId, "SUBMIT_EXTRAS");
		await send(engine, chatId, "SELECT_TIMELINE", { value: "В течение месяца" });

		const offer = await send(engine, chatId, "SELECT_BUDGET", { value: "$1000–2500" });
		expect(offer.message.text).toContain("$800–1200");
		expect(offer.message.text).toContain("вебинарной воронки");
	});

	it("moves a price-sensitive lead to nurturing", async () => {
		const { engine, chatId, started } = await start();
		await send(engine, chatId, "START");
		await send(engine, chatId, "text", { text: "Олег" });
		await send(engine, chatId, "SUBMIT_JOBS");
		await send(engine, chatId, "SUBMIT_CONTEXTS");
		await send(engine, chatId, "SELECT_STRUGGLE", { value: "Много рутины" });
		await send(engine, chatId, "SELECT_OUTCOME", { value: "Меньше рутины" });
		await send(engine, chatId, "SUBMIT_EXTRAS");
		await send(engine, chatId, "SELECT_TIMELINE", { value: "Позже" });
		await send(engine, chatId, "SELECT_BUDGET", { value: "до $1000" });

		const result = await send(engine, chatId, "TOO_EXPENSIVE");
		expect(result.finished).toBe(true);
		expect(result.message.text).toContain("полезные материалы");
		expect(started.conversation.form.get("budget")).toBe("до $1000");
	});

	it("scores a cold lead and formats a manager card", () => {
		const form = {
			name: "Олег",
			phone: "+7",
			job: ["support"],
			context: ["website"],
			struggles: "routine",
			outcomes: "less_routine",
			extras: [],
			timeline: "later",
			budget: "<1000",
			estimate: { model: "Бот для вебинарной воронки", price: "$800–1200" },
		};

		const score = scoreLead(form);
		expect(score.temperature).toBe("cold");
		expect(score.score).toBe(1);

		const card = formatLeadCard(form);
		expect(card).toContain("Лид: холодный (1/9)");
		expect(card).toContain("Телефон: +7");
		expect(card).toContain("Поддержка (FAQ)");
	});
});
