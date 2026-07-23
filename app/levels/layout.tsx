export default function LevelsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="fixed inset-0 overflow-hidden">{children}</div>;
}
