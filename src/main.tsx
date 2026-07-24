import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  HardDrive,
  Layers3,
  Monitor,
  XCircle,
} from "lucide-react";
import vcenterActiveMemory from "./assets/vcenter-active-memory.png";
import "./styles.css";

const assessmentSteps = [
  "Abrir una maquina virtual en vCenter.",
  "Entrar a Monitor > Performance > Advanced.",
  "Cambiar la vista a Memory.",
  "Seleccionar el periodo Real-time.",
  "En Chart Options, habilitar Active si no aparece en la grafica.",
];

const compatibilitySignals = [
  {
    icon: Activity,
    title: "Mide la actividad de la aplicacion",
    body: "La senal importante es el working set activo de la VM. Memory Tiering mueve paginas frias de VM, no paginas vmkernel del host.",
  },
  {
    icon: Layers3,
    title: "Entiende el modelo 2x",
    body: "Con la configuracion por defecto, el host expone 100% mas memoria: una mitad en DRAM y otra mitad en NVMe.",
  },
  {
    icon: Gauge,
    title: "Busca 50% o menos",
    body: "Si la memoria activa cabe dentro de la mitad DRAM, el workload tiene mas probabilidad de conservar latencia consistente.",
  },
];

function App() {
  const [dramCapacity, setDramCapacity] = useState(1024);
  const [activeMemory, setActiveMemory] = useState(420);

  const tiering = useMemo(() => {
    const dramTierBudget = dramCapacity / 2;
    const nvmeCapacity = dramCapacity;
    const totalAfterTiering = dramCapacity + nvmeCapacity;
    const activePercentOfDram = Math.round((activeMemory / dramCapacity) * 100);
    const activePercentOfRecommendedBudget = Math.round((activeMemory / dramTierBudget) * 100);
    const fitsRecommendedBudget = activeMemory <= dramTierBudget;

    return {
      dramTierBudget,
      nvmeCapacity,
      totalAfterTiering,
      activePercentOfDram,
      activePercentOfRecommendedBudget,
      fitsRecommendedBudget,
    };
  }, [activeMemory, dramCapacity]);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <nav className="topbar" aria-label="Principal">
          <a className="brand" href="#top" aria-label="Inicio">
            <span className="brandMark" />
            <span>CORE VM Memory Tiering</span>
          </a>
          <a className="navAction" href="#assessment">
            <Monitor size={18} />
            <span>vCenter</span>
          </a>
        </nav>

        <div className="heroGrid">
          <div className="heroContent">
            <p className="eyebrow">VCF 9 · Parte 1</p>
            <h1 id="hero-title">Antes de activar NVMe Memory Tiering, mide la memoria activa.</h1>
            <p className="lede">
              La pregunta inicial no es si NVMe puede ampliar la capacidad. La pregunta es si
              el workload mantiene su memoria caliente dentro de DRAM.
            </p>
            <div className="heroActions">
              <a className="primaryButton" href="#simulator">
                <span>Probar regla 50%</span>
                <ArrowRight size={18} />
              </a>
              <a className="secondaryButton" href="#assessment">
                Ver ruta en vCenter
              </a>
            </div>
          </div>

          <div className="heroDiagram" aria-label="Modelo de memoria por tiers">
            <div className="diagramHeader">
              <span>Modelo por defecto</span>
              <strong>2x memoria</strong>
            </div>
            <div className="diagramTier dramTier">
              <Database size={22} />
              <span>Tier 0 · DRAM</span>
              <strong>Latencia baja</strong>
            </div>
            <div className="diagramTier nvmeTier">
              <HardDrive size={22} />
              <span>Tier 1 · NVMe</span>
              <strong>Paginas frias</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="ruleBand" id="simulator" aria-labelledby="sim-title">
        <div className="sectionHeader">
          <p className="eyebrow">Prerrequisito practico</p>
          <h2 id="sim-title">La memoria activa debe ser 50% o menos de la capacidad DRAM.</h2>
        </div>

        <div className="simulator">
          <div className="controlPanel" aria-label="Calculadora de Memory Tiering">
            <label>
              <span>Capacidad DRAM del host</span>
              <strong>{dramCapacity} GB</strong>
              <input
                type="range"
                min="256"
                max="2048"
                step="128"
                value={dramCapacity}
                onChange={(event) => setDramCapacity(Number(event.target.value))}
              />
            </label>

            <label>
              <span>Memoria activa del workload</span>
              <strong>{activeMemory} GB</strong>
              <input
                type="range"
                min="64"
                max="1536"
                step="32"
                value={activeMemory}
                onChange={(event) => setActiveMemory(Number(event.target.value))}
              />
            </label>

            <div className={tiering.fitsRecommendedBudget ? "result good" : "result caution"}>
              {tiering.fitsRecommendedBudget ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              <div>
                <strong>
                  {tiering.fitsRecommendedBudget
                    ? "Candidato favorable"
                    : "Requiere analisis adicional"}
                </strong>
                <span>
                  La memoria activa usa {tiering.activePercentOfDram}% de DRAM y{" "}
                  {tiering.activePercentOfRecommendedBudget}% del presupuesto recomendado.
                </span>
              </div>
            </div>
          </div>

          <div className="memoryStack" aria-label="Visualizacion de tiers de memoria">
            <div className="stackHeader">
              <span>Memoria total tras tiering</span>
              <strong>{tiering.totalAfterTiering} GB</strong>
            </div>

            <div className="tierBar dramBar">
              <div>
                <span>DRAM · Tier 0</span>
                <strong>{dramCapacity} GB</strong>
              </div>
              <i style={{ width: `${Math.min(tiering.activePercentOfDram, 100)}%` }} />
            </div>

            <div className="budgetLine">
              <span>Umbral recomendado</span>
              <strong>{tiering.dramTierBudget} GB activos</strong>
            </div>

            <div className="tierBar nvmeBar">
              <div>
                <span>NVMe · Tier 1</span>
                <strong>{tiering.nvmeCapacity} GB</strong>
              </div>
            </div>

            <p>
              Las paginas frias o dormidas pueden bajar a NVMe. Las paginas activas deben
              quedarse en DRAM para que las lecturas y escrituras sensibles a latencia sigan
              respondiendo rapido.
            </p>
          </div>
        </div>
      </section>

      <section className="signals" aria-labelledby="signals-title">
        <div className="sectionHeader compact">
          <p className="eyebrow">Criterios de evaluacion</p>
          <h2 id="signals-title">La compatibilidad empieza por el comportamiento del workload.</h2>
        </div>

        <div className="signalGrid">
          {compatibilitySignals.map(({ icon: Icon, title, body }) => (
            <article className="signalCard" key={title}>
              <div className="iconBox">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="assessment" id="assessment" aria-labelledby="assessment-title">
        <div className="sectionHeader">
          <p className="eyebrow">Ruta en vCenter</p>
          <h2 id="assessment-title">Como encontrar el consumo de memoria activa.</h2>
        </div>

        <div className="assessmentGrid">
          <ol className="pathList">
            {assessmentSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <figure className="screenshotFrame">
            <img
              src={vcenterActiveMemory}
              alt="Grafica Advanced Performance de vCenter mostrando la metrica Active memory en KB."
            />
            <figcaption>
              La metrica Active aparece en la vista avanzada de memoria cuando el periodo esta
              en Real-time. El valor se muestra en KB.
            </figcaption>
          </figure>
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
