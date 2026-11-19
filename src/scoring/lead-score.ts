export type LeadTemperature = "hot" | "warm" | "cold";

export interface LeadScore {
	score: number;
	temperature: LeadTemperature;
	reasons: string[];
}

type LeadData = Record<string, unknown>;

const LABELS: Record<string, string> = {
	leadgen: "Квалификация лидов",
	support: "Поддержка (FAQ)",
	sales: "Продажи",
	telegram: "Telegram",
	website: "Веб-сайт",
	instagram: "Instagram",
	slow_response: "Долго отвечаем на заявки",
	lost_leads: "Теряем лиды",
	routine: "Много рутины",
	conversion: "Рост конверсии",
	speed: "Быстрее отвечать",
	less_routine: "Меньше рутины",
	crm: "Интеграция с CRM",
	analytics: "Аналитика",
	payments: "Оплата",
	urgent: "1–2 недели",
	month: "В течение месяца",
	later: "Позже",
	"<1000": "до $1000",
	"1000-2500": "$1000–2500",
	"2500+": "$2500+",
};

function strings(value: unknown): string[] {
	if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
	if (typeof value === "string") return [value];
	return [];
}

function label(value: string): string {
	return LABELS[value] ?? value;
}

function labels(value: unknown): string {
	const values = strings(value);
	return values.length > 0 ? values.map(label).join(", ") : "—";
}

function text(value: unknown): string {
	return typeof value === "string" && value.trim().length > 0 ? value : "—";
}

/**
 * A small, explainable scoring model. It is deliberately not an LLM:
 * every point and every reason can be checked by hand.
 */
export function scoreLead(data: LeadData): LeadScore {
	let score = 0;
	const reasons: string[] = [];

	const budget = typeof data.budget === "string" ? data.budget : "";
	if (budget === "2500+" || budget === "$2500+") {
		score += 3;
		reasons.push("бюджет $2500+");
	} else if (budget === "1000-2500" || budget === "$1000–2500") {
		score += 2;
		reasons.push("бюджет $1000–2500");
	} else if (budget === "<1000" || budget === "до $1000") {
		score += 1;
		reasons.push("бюджет до $1000");
	}

	const timeline = typeof data.timeline === "string" ? data.timeline : "";
	if (timeline === "urgent" || timeline === "1–2 недели") {
		score += 2;
		reasons.push("срочный запуск");
	} else if (timeline === "month" || timeline === "В течение месяца") {
		score += 1;
		reasons.push("запуск в течение месяца");
	}

	const extras = strings(data.extras);
	if (extras.includes("crm") || extras.includes("Интеграция с CRM")) {
		score += 1;
		reasons.push("нужна CRM");
	}
	if (extras.includes("payments") || extras.includes("Оплата")) {
		score += 1;
		reasons.push("нужны оплаты");
	}

	const jobs = strings(data.job);
	if (
		jobs.includes("leadgen") ||
		jobs.includes("sales") ||
		jobs.includes("Квалификация лидов") ||
		jobs.includes("Продажи")
	) {
		score += 1;
		reasons.push("задача про продажи");
	}

	const context = strings(data.context);
	if (context.includes("telegram") || context.includes("Telegram")) {
		score += 1;
		reasons.push("Telegram как канал");
	}

	const temperature: LeadTemperature =
		score >= 5 ? "hot" : score >= 3 ? "warm" : "cold";

	return { score, temperature, reasons };
}

export function temperatureLabel(temperature: LeadTemperature): string {
	if (temperature === "hot") return "горячий";
	if (temperature === "warm") return "тёплый";
	return "холодный";
}

export function formatLeadCard(data: LeadData): string {
	const result = scoreLead(data);
	const estimate = data.estimate as Record<string, unknown> | undefined;

	return [
		`Лид: ${temperatureLabel(result.temperature)} (${result.score}/9)`,
		`Имя: ${text(data.name)}`,
		`Телефон: ${text(data.phone)}`,
		`Задача: ${labels(data.job)}`,
		`Канал: ${labels(data.context)}`,
		`Боль: ${label(text(data.struggles))}`,
		`Результат: ${label(text(data.outcomes))}`,
		`Дополнительно: ${labels(data.extras)}`,
		`Сроки: ${label(text(data.timeline))}`,
		`Бюджет: ${label(text(data.budget))}`,
		`Пре-оффер: ${text(estimate?.model)} · ${text(estimate?.price)} · ${text(estimate?.timeline)}`,
		`Почему: ${result.reasons.length > 0 ? result.reasons.join(", ") : "сигналов нет"}`,
	].join("\n");
}
