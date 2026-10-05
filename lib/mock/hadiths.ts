import type { HadithResult } from "@/types";

// Arabic-only corpus data — no English values (see types/index.ts note).
export const MOCK_HADITHS: HadithResult[] = [
  {
    id: "h1",
    bookId: "bulugh",
    bookTitle: "بلوغ المرام من أدلة الأحكام",
    edition: "تحقيق حلاق، الطبعة الأولى",
    volume: 1,
    page: 42,
    hadithNumber: "112",
    text: "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «إذا توضأ أحدكم فليجعل في أنفه ماءً ثم لينثر»",
    sanad: ["أبو هريرة", "سعيد بن المسيب", "الزهري", "مالك"],
    hukm: "صحيح",
    scholar: "الألباني",
    alternatives: [
      { hukm: "صحيح متفق عليه", scholar: "ابن حجر" },
    ],
    relevance: 0.94,
    pdfUrl: "#/scans/bulugh-v1-p42.pdf",
    topic: "الطهارة — الاستنشار",
  },
  {
    id: "h2",
    bookId: "umda",
    bookTitle: "عمدة الأحكام",
    edition: "تحقيق الأرناؤوط، الطبعة الثانية",
    volume: 1,
    page: 18,
    hadithNumber: "7",
    text: "عن عمر بن الخطاب رضي الله عنه قال: سمعت رسول الله ﷺ يقول: «إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى»",
    sanad: ["عمر بن الخطاب", "علقمة بن وقاص", "محمد بن إبراهيم", "يحيى بن سعيد"],
    hukm: "متفق عليه",
    scholar: "البخاري ومسلم",
    alternatives: [],
    relevance: 0.91,
    pdfUrl: "#/scans/umda-v1-p18.pdf",
    topic: "النية والإخلاص",
  },
  {
    id: "h3",
    bookId: "bulugh",
    bookTitle: "بلوغ المرام من أدلة الأحكام",
    edition: "تحقيق حلاق، الطبعة الأولى",
    volume: 1,
    page: 88,
    hadithNumber: "204",
    text: "عن عائشة رضي الله عنها قالت: قال رسول الله ﷺ: «من أحدث في أمرنا هذا ما ليس منه فهو رد»",
    sanad: ["عائشة", "القاسم بن محمد", "هشام بن عروة", "سفيان"],
    hukm: "صحيح",
    scholar: "النووي",
    alternatives: [
      { hukm: "صحيح", scholar: "ابن دقيق العيد" },
    ],
    relevance: 0.87,
    pdfUrl: "#/scans/bulugh-v1-p88.pdf",
    topic: "البدع والأحكام المستحدثة",
  },
  {
    id: "h4",
    bookId: "muntaqa",
    bookTitle: "المنتقى من أحاديث الأحكام",
    edition: "تحقيق الأرناؤوط، الطبعة الثالثة",
    volume: 1,
    page: 156,
    hadithNumber: "321",
    text: "عن ابن عباس رضي الله عنهما قال: قال رسول الله ﷺ: «البينة على المدعي، واليمين على من أنكر»",
    sanad: ["ابن عباس", "عكرمة", "قتادة", "شعبة"],
    hukm: "حسن",
    scholar: "البيهقي",
    alternatives: [
      { hukm: "صحيح", scholar: "الألباني" },
    ],
    relevance: 0.83,
    pdfUrl: "#/scans/muntaqa-v1-p156.pdf",
    topic: "القضاء والبينات",
  },
  {
    id: "h5",
    bookId: "umda",
    bookTitle: "عمدة الأحكام",
    edition: "تحقيق الأرناؤوط، الطبعة الثانية",
    volume: 1,
    page: 64,
    hadithNumber: "58",
    text: "عن جابر بن عبد الله رضي الله عنهما قال: قال رسول الله ﷺ: «أعطوا الأجير أجره قبل أن يجف عرقه»",
    sanad: ["جابر", "حنظلة", "الأعمش", "وكيع"],
    hukm: "حسن",
    scholar: "ابن ماجه",
    alternatives: [],
    relevance: 0.79,
    pdfUrl: "#/scans/umda-v1-p64.pdf",
    topic: "الإجارة وحقوق العمال",
  },
];

export function searchMockHadiths(query: string, bookScope: string): HadithResult[] {
  const q = query.trim();
  const pool = MOCK_HADITHS.filter((h) => (bookScope === "all" ? true : h.bookId === bookScope));
  if (!q) return pool.slice(0, 10);
  const scored = pool.map((h) => {
    let bonus = 0;
    if (h.text.includes(q) || h.topic.includes(q)) bonus += 0.1;
    return { h, score: Math.min(0.99, h.relevance + bonus) };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => ({ ...s.h, relevance: s.score }));
}

export function needsClarification(query: string): boolean {
  const t = query.trim();
  if (!t) return false;
  if (t.split(/\s+/).length < 2) return true;
  const broad = ["صلاة", "صوم", "زكاة", "prayer", "fasting", "hadith", "حديث", "فقه"];
  return broad.some((w) => t.toLowerCase() === w.toLowerCase());
}
