export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body style={{ maxWidth: 1000, margin: "32px auto", padding: 16 }}>{children}</body></html>;
}
