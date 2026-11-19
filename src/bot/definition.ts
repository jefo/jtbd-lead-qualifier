import type { BotPersonaDefinition } from "persona-forge";

/**
 * JTBD qualification flow for custom bot development.
 * The scenario is adapted from the dlg-ngind JTBD spec: job, context,
 * struggles, outcomes, extras, timeline, budget, pre-offer, examples,
 * booking. The engine is PersonaForge.
 */
export const jtbdLeadQualifier = {
	name: "JTBD Lead Qualifier",
	fsm: {
		initialState: "welcome",
		states: [
			{
				id: "welcome",
				on: [{ event: "START", target: "ask_name" }],
			},
			{
				id: "ask_name",
				on: [
					{
						event: "text",
						target: "ask_job",
						assign: { name: "payload.text" },
					},
				],
			},
			{
				id: "ask_job",
				on: [
					{
						event: "ADD_JOB",
						target: "ask_job",
						assign: { job: { op: "add", value: "payload.value" } },
					},
					{ event: "SUBMIT_JOBS", target: "ask_context" },
				],
			},
			{
				id: "ask_context",
				on: [
					{
						event: "ADD_CONTEXT",
						target: "ask_context",
						assign: { context: { op: "add", value: "payload.value" } },
					},
					{ event: "SUBMIT_CONTEXTS", target: "ask_struggles" },
				],
			},
			{
				id: "ask_struggles",
				on: [
					{
						event: "SELECT_STRUGGLE",
						target: "ask_outcomes",
						assign: { struggles: "payload.value" },
					},
				],
			},
			{
				id: "ask_outcomes",
				on: [
					{
						event: "SELECT_OUTCOME",
						target: "ask_extras",
						assign: { outcomes: "payload.value" },
					},
				],
			},
			{
				id: "ask_extras",
				on: [
					{
						event: "ADD_EXTRA",
						target: "ask_extras",
						assign: { extras: { op: "add", value: "payload.value" } },
					},
					{ event: "SUBMIT_EXTRAS", target: "ask_timeline" },
				],
			},
			{
				id: "ask_timeline",
				on: [
					{
						event: "SELECT_TIMELINE",
						target: "ask_budget",
						assign: { timeline: "payload.value" },
					},
				],
			},
			{
				id: "ask_budget",
				on: [
					{
						event: "SELECT_BUDGET",
						target: "pre_offer",
						assign: {
							budget: "payload.value",
							estimate: {
								model: "Бот для SaaS-триала",
								price: "$1500–2500",
								timeline: "4–6 недель",
							},
						},
						cond: {
							field: "extras",
							operator: "contains",
							value: "Интеграция с CRM",
						},
					},
					{
						event: "SELECT_BUDGET",
						target: "pre_offer",
						assign: {
							budget: "payload.value",
							estimate: {
								model: "Бот для вебинарной воронки",
								price: "$800–1200",
								timeline: "3–4 недели",
							},
						},
					},
				],
			},
			{
				id: "pre_offer",
				on: [
					{ event: "CONTINUE", target: "ask_examples" },
					{ event: "TOO_EXPENSIVE", target: "nurturing" },
				],
			},
			{
				id: "ask_examples",
				on: [
					{ event: "SHOW_EXAMPLES", target: "show_examples" },
					{ event: "BOOK_CALL", target: "book_call" },
					{ event: "NURTURE", target: "nurturing" },
				],
			},
			{
				id: "show_examples",
				on: [
					{ event: "BOOK_CALL", target: "book_call" },
					{ event: "NURTURE", target: "nurturing" },
				],
			},
			{
				id: "book_call",
				on: [
					{
						event: "text",
						target: "booked",
						assign: { phone: "payload.text" },
					},
				],
			},
			{ id: "booked", on: [] },
			{ id: "nurturing", on: [] },
		],
	},
	viewMap: {
		nodes: [
			{
				id: "welcome",
				component: "message",
				props: {
					text: "Привет! Я JTBD-квалификатор.\n\nЗа 3–5 минут разберу задачу и покажу, какой бот вам подходит.",
					buttons: [{ label: "Поехали", event: "START" }],
				},
			},
			{
				id: "ask_name",
				component: "message",
				props: {
					text: "Как к вам обращаться?\n\nНапишите имя одним сообщением.",
				},
			},
			{
				id: "ask_job",
				component: "message",
				props: {
					text: "Какую задачу должен решать бот?\n\nМожно выбрать несколько.\n\nВыбрано: {{job}}",
					buttons: [
						{
							label: "Квалификация лидов",
							event: "ADD_JOB",
							payload: { value: "Квалификация лидов" },
						},
						{
							label: "Поддержка (FAQ)",
							event: "ADD_JOB",
							payload: { value: "Поддержка (FAQ)" },
						},
						{
							label: "Продажи",
							event: "ADD_JOB",
							payload: { value: "Продажи" },
						},
						{ label: "Далее", event: "SUBMIT_JOBS" },
					],
				},
			},
			{
				id: "ask_context",
				component: "message",
				props: {
					text: "Где бот будет работать?\n\nВыбрано: {{context}}",
					buttons: [
						{
							label: "Telegram",
							event: "ADD_CONTEXT",
							payload: { value: "Telegram" },
						},
						{
							label: "Веб-сайт",
							event: "ADD_CONTEXT",
							payload: { value: "Веб-сайт" },
						},
						{
							label: "Instagram",
							event: "ADD_CONTEXT",
							payload: { value: "Instagram" },
						},
						{ label: "Далее", event: "SUBMIT_CONTEXTS" },
					],
				},
			},
			{
				id: "ask_struggles",
				component: "message",
				props: {
					text: "Что сейчас болит сильнее всего?",
					buttons: [
						{
							label: "Долго отвечаем на заявки",
							event: "SELECT_STRUGGLE",
							payload: { value: "Долго отвечаем на заявки" },
						},
						{
							label: "Теряем лиды",
							event: "SELECT_STRUGGLE",
							payload: { value: "Теряем лиды" },
						},
						{
							label: "Много рутины",
							event: "SELECT_STRUGGLE",
							payload: { value: "Много рутины" },
						},
					],
				},
			},
			{
				id: "ask_outcomes",
				component: "message",
				props: {
					text: "Какой результат будет идеальным?",
					buttons: [
						{
							label: "Рост конверсии",
							event: "SELECT_OUTCOME",
							payload: { value: "Рост конверсии" },
						},
						{
							label: "Быстрее отвечать",
							event: "SELECT_OUTCOME",
							payload: { value: "Быстрее отвечать" },
						},
						{
							label: "Меньше рутины",
							event: "SELECT_OUTCOME",
							payload: { value: "Меньше рутины" },
						},
					],
				},
			},
			{
				id: "ask_extras",
				component: "message",
				props: {
					text: "Что важно учесть?\n\nВыбрано: {{extras}}",
					buttons: [
						{
							label: "Интеграция с CRM",
							event: "ADD_EXTRA",
							payload: { value: "Интеграция с CRM" },
						},
						{
							label: "Аналитика",
							event: "ADD_EXTRA",
							payload: { value: "Аналитика" },
						},
						{
							label: "Оплата",
							event: "ADD_EXTRA",
							payload: { value: "Оплата" },
						},
						{ label: "Далее", event: "SUBMIT_EXTRAS" },
					],
				},
			},
			{
				id: "ask_timeline",
				component: "message",
				props: {
					text: "Когда хотите запустить?",
					buttons: [
						{
							label: "1–2 недели",
							event: "SELECT_TIMELINE",
							payload: { value: "1–2 недели" },
						},
						{
							label: "В течение месяца",
							event: "SELECT_TIMELINE",
							payload: { value: "В течение месяца" },
						},
						{
							label: "Позже",
							event: "SELECT_TIMELINE",
							payload: { value: "Позже" },
						},
					],
				},
			},
			{
				id: "ask_budget",
				component: "message",
				props: {
					text: "Какой бюджет закладываете?",
					buttons: [
						{
							label: "до $1000",
							event: "SELECT_BUDGET",
							payload: { value: "до $1000" },
						},
						{
							label: "$1000–2500",
							event: "SELECT_BUDGET",
							payload: { value: "$1000–2500" },
						},
						{
							label: "$2500+",
							event: "SELECT_BUDGET",
							payload: { value: "$2500+" },
						},
					],
				},
			},
			{
				id: "pre_offer",
				component: "offer",
				props: {
					text: "Предварительно вам подходит: {{estimate.model}}.\n\nОриентир: {{estimate.price}}, {{estimate.timeline}}.\n\nЭто оценка по вашим ответам, не оферта.",
					buttons: [
						{ label: "Продолжить", event: "CONTINUE" },
						{ label: "Дорого", event: "TOO_EXPENSIVE" },
					],
				},
			},
			{
				id: "ask_examples",
				component: "message",
				props: {
					text: "Показать примеры похожих ботов?",
					buttons: [
						{ label: "Да", event: "SHOW_EXAMPLES" },
						{ label: "Сразу к звонку", event: "BOOK_CALL" },
						{ label: "Пока не надо", event: "NURTURE" },
					],
				},
			},
			{
				id: "show_examples",
				component: "message",
				props: {
					text: "Кейс: бот-квалификатор для SaaS.\n\nСократил время ответа и собрал 42 заявки за месяц.\n\nЧто дальше?",
					buttons: [
						{ label: "Забронировать звонок", event: "BOOK_CALL" },
						{ label: "Пока не надо", event: "NURTURE" },
					],
				},
			},
			{
				id: "book_call",
				component: "message",
				props: {
					text: "Оставьте телефон — менеджер свяжется в течение рабочего дня.\n\nНапишите номер одним сообщением.",
				},
			},
			{
				id: "booked",
				component: "receipt",
				props: {
					text: "Готово.\n\n{{name}}, заявка у менеджера. Позвоним на {{phone}}.\n\nЗадача: {{job}}\nБюджет: {{budget}}\nСроки: {{timeline}}",
				},
			},
			{
				id: "nurturing",
				component: "receipt",
				props: {
					text: "Понял. Пришлю полезные материалы по ботам для вашей задачи.\n\nНачать заново — /start.",
				},
			},
		],
	},
	form: {
		fields: {
			name: { type: "string", required: true },
			job: { type: "array", items: "string" },
			context: { type: "array", items: "string" },
			struggles: { type: "string" },
			outcomes: { type: "string" },
			extras: { type: "array", items: "string" },
			timeline: { type: "string" },
			budget: { type: "string" },
			estimate: { type: "object" },
			phone: { type: "string", required: true },
		},
	},
} satisfies BotPersonaDefinition;
