export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backfaceVisibility: "hidden",
        opacity: 0.98,
      }}
    >
      {children}
    </div>
  );
}
