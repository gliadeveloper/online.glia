import { notFound, redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { CheckInShareRespondPanel } from "@/components/checkin/check-in-share-respond-panel";
import { getShareGrantPreviewForMember } from "@/lib/checkin-share/grants";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

export default async function CheckInSharePage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    const { id } = await params;
    redirect(`/login?next=/checkin/share/${id}`);
  }

  const { id } = await params;

  let preview;
  try {
    preview = await getShareGrantPreviewForMember(id, user.id);
  } catch {
    notFound();
  }

  return (
    <AppStackPage>
      <StackNavTitle title="체크인 공유" />

      <div className="check-in-share-page">
        <CheckInShareRespondPanel preview={preview} />
      </div>
    </AppStackPage>
  );
}
