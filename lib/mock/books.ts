import type { SourceBook } from "@/types";

// Arabic-only corpus data — no English values (see types/index.ts note).
export const MOCK_BOOKS: SourceBook[] = [
  {
    id: "bulugh",
    title: "بلوغ المرام من أدلة الأحكام",
    muhaqqiq: "تحقيق: محمد صبحي حسن حلاق",
    edition: "الطبعة الأولى",
    publisher: "دار ابن الجوزي",
    volumes: 1,
    hadithCount: 1358,
    status: "active",
  },
  {
    id: "umda",
    title: "عمدة الأحكام من كلام خير الأنام",
    muhaqqiq: "تحقيق: محمود الأرناؤوط",
    edition: "الطبعة الثانية",
    publisher: "دار ابن كثير",
    volumes: 1,
    hadithCount: 430,
    status: "active",
  },
  {
    id: "muntaqa",
    title: "المنتقى من أحاديث الأحكام (مجد الدين ابن تيمية)",
    muhaqqiq: "تحقيق: عبد القادر الأرناؤوط",
    edition: "الطبعة الثالثة",
    publisher: "مكتبة المعارف",
    volumes: 2,
    hadithCount: 2100,
    status: "active",
  },
  {
    id: "nayl",
    title: "نيل الأوطار شرح منتقى الأخبار",
    muhaqqiq: "تحقيق: عصام الصبابطي",
    edition: "الطبعة الأولى",
    publisher: "دار الحديث",
    volumes: 8,
    hadithCount: 3400,
    status: "suspended",
  },
];
