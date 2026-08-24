import Particles from './Particles';

export default function Background() {
  return (
    <>
      <div className="app-bg" aria-hidden="true">
        <div className="bg-nebula n1" />
        <div className="bg-nebula n2" />
        <div className="bg-nebula n3" />
      </div>
      <Particles />
      <div className="grid-overlay" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
    </>
  );
}
