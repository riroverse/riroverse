import part1 from "../assets/part1.jpeg";

export default function Hero() {
  return (
    <section id="home" className="hero-section">
      <div className="hero-grid">
        <div className="hero-copy">
          <h1>
            Visual works rooted in <em>earth, form,</em> and quiet emotion.
          </h1>
          <p className="hero-lead">
            An international visual studio crafting bespoke digital illustrations, brand
            imagery, and tactile color studies shaped by warm, grounded palettes.
          </p>
        </div>

        <figure className="hero-exhibition">
          <div className="hero-frame">
            <img src={part1} alt="Dusk in the Studio — Riroverse illustration" />
          </div>
          <figcaption className="hero-plaque">
            <span>FIG. 01 — FEATURED STUDY</span>
            <strong>Dusk in the Studio, 2026</strong>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
