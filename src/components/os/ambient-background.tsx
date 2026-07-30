export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#08080A]">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(76,29,149,0.28),transparent_60%)]" />
      <div
        className="os-blob os-blob-a"
        style={{
          top: "-12%",
          left: "8%",
          width: "42vw",
          height: "42vw",
          background:
            "radial-gradient(circle at 35% 35%, rgba(99,102,241,0.42), rgba(99,102,241,0) 68%)",
        }}
      />
      <div
        className="os-blob os-blob-b"
        style={{
          bottom: "-18%",
          right: "2%",
          width: "48vw",
          height: "48vw",
          background:
            "radial-gradient(circle at 60% 40%, rgba(139,92,246,0.34), rgba(139,92,246,0) 70%)",
        }}
      />
      <div
        className="os-blob os-blob-c"
        style={{
          top: "28%",
          right: "26%",
          width: "34vw",
          height: "34vw",
          background:
            "radial-gradient(circle at 50% 50%, rgba(56,189,248,0.16), rgba(56,189,248,0) 70%)",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,8,10,0.35),rgba(8,8,10,0.8))]" />
    </div>
  );
}
