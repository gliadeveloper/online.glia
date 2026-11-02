import { ContactPrompt } from "@/components/account/contact-prompt";
import { getMemberContact } from "@/lib/member-contact-server";
import { getSessionUserId } from "@/lib/session";

export async function ContactPromptGate() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const contact = await getMemberContact(userId);
  if (!contact?.name.trim() || !contact.phoneNumber.trim()) {
    if (!contact) return null;
    return <ContactPrompt userId={userId} contact={contact} />;
  }

  return null;
}
