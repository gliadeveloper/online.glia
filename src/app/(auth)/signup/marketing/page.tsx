import { redirect } from "next/navigation";

type SignupMarketingPageProps = {
  searchParams: Promise<{ next?: string; marketing?: string }>;
};

export default async function SignupMarketingPage({ searchParams }: SignupMarketingPageProps) {
  const { next, marketing } = await searchParams;
  const params = new URLSearchParams();
  if (marketing) params.set("marketing", marketing);
  if (next) params.set("next", next);
  const query = params.toString();
  redirect(query ? `/signup/terms?${query}` : "/signup/terms");
}
