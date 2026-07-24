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
  Sparkles,
} from "lucide-react";
import vcenterActiveMemory from "./assets/vcenter-active-memory.png";
import "./styles.css";

const assessmentSteps = [
  "Open a VM in vCenter.",
  "Go to Monitor > Performance > Advanced.",
  "Switch the view to Memory.",
  "Set the period to Real-time.",
  "Enable Active in Chart Options if it is not visible.",
];

const compatibilitySignals = [
  {
    icon: Activity,
    title: "Workload active memory",
    body: "Look at the VM/app behavior, not host memory. Memory Tiering demotes cold VM pages, not vmkernel pages.",
  },
  {
    icon: Layers3,
    title: "Default 2x memory model",
    body: "With the default configuration, total available memory doubles: half DRAM as Tier 0, half NVMe as Tier 1.",
  },
  {
    icon: Gauge,
    title: "50% or less active",
    body: "The goal is to keep active pages inside DRAM so latency-sensitive reads and writes stay on the fastest tier.",
  },
];

function App() {
  const [dramCapacity, setDramCapacity] = useState(1024);
  const [activeMemory, setActiveMemory] = useState(420);

  const tiering = useMemo(() => {
    const totalAfterTiering = dramCapacity * 2;
    const activePercentOfTotal = Math.round((activeMemory / totalAfterTiering) * 100);
    const activePercentOfDram = Math.round((activeMemory / dramCapacity) * 100);
    const fitsInDram = activeMemory <= dramCapacity / 2;

    return {
      totalAfterTiering,
      activePercentOfTotal,
      activePercentOfDram,
      fitsInDram,
    };
  }, [activeMemory, dramCapacity]);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="heroBackdrop" aria-hidden="true">
          <div className="tier tierDram">
            <Database size={24} />
            <span>Tier 0 DRAM</span>
          </div>
          <div className="tier tierNvme">
            <HardDrive size={24} />
            <span>Tier 1 NVMe</span>
          </div>
          <div className="signal signalA" />
          <div className="signal signalB" />
        </div>

        <nav className="topbar" aria-label="Principal">
          <a className="brand" href="#top" aria-label="TE inicio">
            <Sparkles size={20} />
            <span>CORE VM Memory Tiering</span>
          </a>
          <a className="navAction" href="#assessment">
            <Monitor size={18} />
            <span>Assessment</span>
          </a>
        </nav>

        <div className="heroContent">
          <p className="eyebrow">VCF 9 memory tiering · Part 1</p>
          <h1 id="hero-title">Before you enable NVMe Memory Tiering, find the active memory.</h1>
          <p className="lede">
            The first decision is not about buying storage. It is about whether each workload
            keeps its hot memory small enough to live comfortably in DRAM.
          </p>
          <div className="heroActions">
            <a className="primaryButton" href="#simulator">
              <span>Test the 50% rule</span>
              <ArrowRight size={18} />
            </a>
            <a className="secondaryButton" href="#assessment">
              Find it in vCenter
            </a>
          </div>
        </div>
      </section>

      <section className="ruleBand" id="simulator" aria-labelledby="sim-title">
        <div className="sectionHeader">
          <p className="eyebrow">Workload fit</p>
          <h2 id="sim-title">The simple pre-check: active memory should be 50% or less of DRAM.</h2>
        </div>

        <div className="simulator">
          <div className="controlPanel" aria-label="Memory tiering calculator">
            <label>
              <span>Host DRAM capacity</span>
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
              <span>Workload active memory</span>
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

            <div className={tiering.fitsInDram ? "result good" : "result caution"}>
              <CheckCircle2 size={22} />
              <div>
                <strong>{tiering.fitsInDram ? "Strong candidate" : "Needs deeper review"}</strong>
                <span>
                  Active memory is {tiering.activePercentOfDram}% of DRAM and{" "}
                  {tiering.activePercentOfTotal}% of tiered memory.
                </span>
              </div>
            </div>
          </div>

          <div className="memoryStack" aria-label="Tiered memory visualization">
            <div className="stackHeader">
              <span>Total after tiering</span>
              <strong>{tiering.totalAfterTiering} GB</strong>
            </div>
            <div className="tierBar dramBar">
              <span>DRAM · Tier 0</span>
              <strong>{dramCapacity} GB</strong>
              <i style={{ width: `${Math.min(tiering.activePercentOfDram, 100)}%` }} />
            </div>
            <div className="tierBar nvmeBar">
              <span>NVMe · Tier 1</span>
              <strong>{dramCapacity} GB</strong>
            </div>
            <p>
              Cold or dormant VM pages can move down to NVMe. The active working set should
              remain small enough that DRAM carries the latency-sensitive work.
            </p>
          </div>
        </div>
      </section>

      <section className="signals" aria-labelledby="signals-title">
        <div className="sectionHeader compact">
          <p className="eyebrow">What to look for</p>
          <h2 id="signals-title">Compatibility starts with behavior, not a checkbox.</h2>
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
          <p className="eyebrow">vCenter path</p>
          <h2 id="assessment-title">How to find active memory consumption.</h2>
        </div>

        <div className="assessmentGrid">
          <ol className="pathList">
            {assessmentSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <figure className="screenshotFrame">
            <img src={vcenterActiveMemory} alt="vCenter Advanced Performance chart showing Active memory in KB." />
            <figcaption>
              Active memory appears in the Advanced Performance memory chart when the period is set to Real-time.
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
