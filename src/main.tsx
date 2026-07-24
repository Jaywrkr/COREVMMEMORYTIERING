import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Blocks,
  BrainCircuit,
  GitBranch,
  MousePointer2,
  Sparkles,
} from "lucide-react";
import "./styles.css";

const stages = [
  {
    label: "Idea cruda",
    text: "Tomamos conceptos densos, dudas y materiales sueltos.",
  },
  {
    label: "Modelo mental",
    text: "Los convertimos en una estructura visual que se pueda recorrer.",
  },
  {
    label: "Interaccion",
    text: "El usuario manipula, compara, revela y entiende por capas.",
  },
  {
    label: "Publicacion",
    text: "Cada avance vive en GitHub con PR, revision y merge.",
  },
];

const principles = [
  {
    icon: BrainCircuit,
    title: "Primero claridad",
    body: "Cada pantalla debe responder una pregunta concreta antes de pedir atencion a la siguiente.",
  },
  {
    icon: MousePointer2,
    title: "Aprender haciendo",
    body: "Usaremos interacciones pequenas: sliders, estados, comparaciones y simulaciones ligeras.",
  },
  {
    icon: Blocks,
    title: "Modular por partes",
    body: "Cada tema entra como un bloque independiente para poder iterar, revisar y mejorar sin romper lo anterior.",
  },
];

function App() {
  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="heroBackdrop" aria-hidden="true">
          <div className="orbit orbitOne" />
          <div className="orbit orbitTwo" />
          <div className="signal signalA" />
          <div className="signal signalB" />
        </div>

        <nav className="topbar" aria-label="Principal">
          <a className="brand" href="#top" aria-label="TE inicio">
            <Sparkles size={20} />
            <span>TE Web Lab</span>
          </a>
          <a className="navAction" href="#workflow">
            <GitBranch size={18} />
            <span>Flujo PR</span>
          </a>
        </nav>

        <div className="heroContent">
          <p className="eyebrow">Laboratorio creativo para ideas complejas</p>
          <h1 id="hero-title">Una web que ensena por exploracion, no por paredes de texto.</h1>
          <p className="lede">
            Vamos a construir una experiencia por capas: visual, interactiva y lista para
            crecer seccion por seccion con un flujo sano de GitHub.
          </p>
          <div className="heroActions">
            <a className="primaryButton" href="#canvas">
              <span>Ver base inicial</span>
              <ArrowRight size={18} />
            </a>
            <a className="secondaryButton" href="#workflow">
              Preparar PR flow
            </a>
          </div>
        </div>
      </section>

      <section className="canvas" id="canvas" aria-labelledby="canvas-title">
        <div className="sectionHeader">
          <p className="eyebrow">Canvas de trabajo</p>
          <h2 id="canvas-title">Cada tema entrara con una forma propia.</h2>
        </div>

        <div className="principleGrid">
          {principles.map(({ icon: Icon, title, body }) => (
            <article className="principle" key={title}>
              <div className="iconBox">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow" id="workflow" aria-labelledby="workflow-title">
        <div className="sectionHeader compact">
          <p className="eyebrow">Metodo de avance</p>
          <h2 id="workflow-title">Del concepto al merge.</h2>
        </div>

        <div className="timeline">
          {stages.map((stage, index) => (
            <article className="step" key={stage.label}>
              <span className="stepNumber">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{stage.label}</h3>
                <p>{stage.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
