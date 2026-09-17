export function AccessMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-center">
      <p className="text-body-lg text-muted-foreground">{children}</p>
    </div>
  )
}
