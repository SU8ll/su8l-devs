export default function Background() {
  return (
    <>
      <div className="app-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>
      <div className="grid-overlay" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
    </>
  );
}
