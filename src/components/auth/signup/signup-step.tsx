import { GliaAuthPage } from "@/components/auth/glia/glia-auth-page";

type SignupStepProps = {
  title: string;
  titleAccent?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
};

export function SignupStep({
  title,
  titleAccent,
  description,
  backHref,
  backLabel,
  children,
}: SignupStepProps) {
  return (
    <GliaAuthPage
      eyebrow="Sign up"
      title={title}
      titleAccent={titleAccent}
      description={description}
      backHref={backHref}
      backLabel={backLabel}
    >
      {children}
    </GliaAuthPage>
  );
}

export function SignupSuspenseFallback() {
  return (
    <div className="glia-auth__skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}
