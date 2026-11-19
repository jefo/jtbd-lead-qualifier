import { createEngine } from "persona-forge";
import { jtbdLeadQualifier } from "./bot/definition";
import { formatLeadCard } from "./scoring/lead-score";

const engine = createEngine();
const persona = await engine.definePersona(jtbdLeadQualifier);
const chatId = "demo-jtbd";
const started = await engine.start({ personaId: persona.id, chatId });

function printBot(text: string, buttons: Array<{ label: string }> = []): void {
	console.log("\nБот:");
	for (const line of text.split("\n")) console.log(`  ${line}`);
	if (buttons.length > 0) {
		console.log(`  ${buttons.map((button) => `[ ${button.label} ]`).join(" ")}`);
	}
}

printBot(started.message.text, started.message.buttons);

const steps: Array<{
	label: string;
	event: string;
	payload?: Record<string, unknown>;
}> = [
	{ label: "Поехали", event: "START" },
	{ label: "Иван", event: "text", payload: { text: "Иван" } },
	{ label: "Квалификация лидов", event: "ADD_JOB", payload: { value: "Квалификация лидов" } },
	{ label: "Продажи", event: "ADD_JOB", payload: { value: "Продажи" } },
	{ label: "Далее", event: "SUBMIT_JOBS" },
	{ label: "Telegram", event: "ADD_CONTEXT", payload: { value: "Telegram" } },
	{ label: "Далее", event: "SUBMIT_CONTEXTS" },
	{ label: "Теряем лиды", event: "SELECT_STRUGGLE", payload: { value: "Теряем лиды" } },
	{ label: "Рост конверсии", event: "SELECT_OUTCOME", payload: { value: "Рост конверсии" } },
	{ label: "Интеграция с CRM", event: "ADD_EXTRA", payload: { value: "Интеграция с CRM" } },
	{ label: "Далее", event: "SUBMIT_EXTRAS" },
	{ label: "1–2 недели", event: "SELECT_TIMELINE", payload: { value: "1–2 недели" } },
	{ label: "$2500+", event: "SELECT_BUDGET", payload: { value: "$2500+" } },
	{ label: "Продолжить", event: "CONTINUE" },
	{ label: "Да", event: "SHOW_EXAMPLES" },
	{ label: "Забронировать звонок", event: "BOOK_CALL" },
	{ label: "+7 999 123-45-67", event: "text", payload: { text: "+7 999 123-45-67" } },
];

let finished = false;

for (const step of steps) {
	console.log(`\nВы: ${step.label}`);
	const result = await engine.handle({
		chatId,
		event: step.event,
		payload: step.payload,
	});

	if (!result.ok) {
		console.error(`\nОшибка: ${result.reason}`);
		process.exit(1);
	}

	printBot(result.message.text, result.message.buttons);
	finished = result.finished;
}

const form = started.conversation.form.toJSON();

console.log(`\nstatus: ${finished ? "finished" : "active"}`);
console.log("\nКарточка лида для менеджера:\n");
console.log(formatLeadCard(form));

if (!finished) process.exit(1);
