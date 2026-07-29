export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex h-full items-center justify-center overflow-y-auto w-full px-4 py-12 sm:py-20">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-6 sm:p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
