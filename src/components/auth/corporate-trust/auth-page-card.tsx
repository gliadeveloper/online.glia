type AuthPageCardProps = {
  title: string;
  titleAccent?: string;
  description: string;
  children: React.ReactNode;
};

export function AuthPageCard({ title, titleAccent, description, children }: AuthPageCardProps) {
  return (
    <section className="auth-trust-card mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
      <header className="space-y-2 border-b border-slate-100 px-6 py-6 sm:space-y-3 sm:px-8 sm:py-7 lg:px-10">
        <h1 className="text-2xl font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-3xl">
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span className="auth-trust-gradient-text">{titleAccent}</span>
            </>
          ) : null}
        </h1>
        <p className="text-sm leading-relaxed text-slate-500 sm:text-base">{description}</p>
      </header>

      <div className="auth-trust-card-body px-6 py-6 sm:px-8 sm:py-7 lg:px-10">{children}</div>
    </section>
  );
}
