import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { Noto_Sans_SC } from "next/font/google";
import { notFound } from "next/navigation";
import { HtmlLang } from "@/components/HtmlLang";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { routing } from "@/i18n/routing";

const notoSansSc = Noto_Sans_SC({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sc",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <HtmlLang />
      <JsonLd />
      <div
        className={
          locale === "zh"
            ? `${notoSansSc.className} min-w-0`
            : "min-w-0"
        }
      >
        <div className="flex min-h-screen flex-col bg-white text-slate-900">
          <SiteHeader />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <SiteFooter />
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
