import { Examples } from "./examples";
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  return <Examples mode={(await searchParams).mode ?? "lesson"} />;
}
