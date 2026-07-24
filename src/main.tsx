import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  HardDrive,
  Info,
  Layers3,
  Monitor,
  Server,
  ShieldCheck,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import vcenterActiveMemory from "./assets/vcenter-active-memory.png";
import vcenterStatisticsLevels from "./assets/vcenter-statistics-levels.png";
import "./styles.css";

type HintProps = {
  children: string;
  tip: string;
};

function Hint({ children, tip }: HintProps) {
  return (
    <span className="hint" tabIndex={0}>
      <span>{children}</span>
      <Info size={14} aria-hidden="true" />
      <span className="hintBubble" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

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
    tip: "Piensa en memoria activa como las paginas que la aplicacion esta usando de verdad ahora mismo.",
  },
  {
    icon: Layers3,
    title: "Entiende el modelo 2x",
    body: "Con la configuracion por defecto, el host expone 100% mas memoria: una mitad en DRAM y otra mitad en NVMe.",
    tip: "2x no significa que todo sea igual de rapido. DRAM sigue siendo el tier rapido.",
  },
  {
    icon: Gauge,
    title: "Busca 50% o menos",
    body: "Si la memoria activa cabe dentro de la mitad DRAM, el workload tiene mas probabilidad de conservar latencia consistente.",
    tip: "El 50% es una regla de evaluacion inicial, no una garantia absoluta de rendimiento.",
  },
];

const limitationCards = [
  "VMs de alto rendimiento o sensibles a latencia.",
  "VMs de seguridad como SEV, SGX o TDX.",
  "VMs con Fault Tolerance.",
  "Monster VMs con 512 GB o mas de memoria.",
];

const softwareCards = [
  {
    icon: Server,
    title: "Version 9.0 o superior",
    body: "vCenter y los hosts ESX deben estar en vSphere 9.0 o posterior dentro de VCF/VVF 9.0.",
    tip: "La version importa porque Memory Tiering depende de mejoras de resiliencia, seguridad y vMotion awareness.",
  },
  {
    icon: TerminalSquare,
    title: "Particion NVMe",
    body: "En VCF/VVF 9.0 se debe crear una particion en el dispositivo NVMe para que Memory Tiering pueda consumirla.",
    tip: "Hoy se hace con ESXCLI o PowerCLI. Por eso necesitas terminal, permisos y normalmente SSH habilitado.",
  },
  {
    icon: ShieldCheck,
    title: "Automatizacion posible",
    body: "La configuracion puede ejecutarse a nivel host o cluster con vCenter UI, ESXCLI, PowerCLI o Desired State Configuration.",
    tip: "En muchos hosts conviene automatizar para evitar pasos manuales repetitivos y reducir errores.",
  },
];

const nvmeRequirements = [
  {
    label: "Endurance Class D o superior",
    value: "7300 TBW o mas",
    tip: "TBW significa Total Bytes Written: cuanto puede escribirse en el SSD durante su vida util estimada.",
  },
  {
    label: "Performance Class F",
    value: "100,000 a 349,999 writes/sec",
    tip: "Writes/sec mide cuantas escrituras por segundo puede sostener el dispositivo.",
  },
  {
    label: "Performance Class G",
    value: "350,000+ writes/sec",
    tip: "Clase G es mas exigente y apunta a dispositivos con mayor capacidad de escritura.",
  },
  {
    label: "Enterprise Mixed Use",
    value: "3 DWPD recomendado",
    tip: "DWPD indica cuantas veces puedes escribir toda la capacidad del disco cada dia durante la garantia.",
  },
];

const lenovoDrives = [
  "ThinkSystem CD8P Mixed Use NVMe PCIe 5.0",
  "ThinkSystem PM1745 Mixed Use NVMe PCIe 5.0",
  "ThinkSystem P5620 Mixed Use NVMe",
  "ThinkSystem 7450 MAX Mixed Use NVMe",
  "ThinkSystem Vendor Agnostic Mixed Use NVMe",
  "ThinkSystem PS1030 Mixed Use NVMe PCIe 5.0",
  "ThinkSystem Solidigm P5620 Mixed Use NVMe PCIe 4.0",
  "ThinkSystem Intel P5600 Mainstream NVMe PCIe 4.0",
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
            <p className="eyebrow">VCF 9 - Parte 1</p>
            <h1 id="hero-title">
              Antes de activar <Hint tip="NVMe Memory Tiering usa dispositivos NVMe como un segundo nivel de memoria para paginas frias.">NVMe Memory Tiering</Hint>, mide la memoria activa.
            </h1>
            <p className="lede">
              La pregunta inicial no es si NVMe puede ampliar la capacidad. La pregunta es si
              el workload mantiene su <Hint tip="Memoria caliente es la memoria que la aplicacion consulta o modifica con frecuencia.">memoria caliente</Hint> dentro de <Hint tip="DRAM es la memoria principal del host. Es mucho mas rapida que NVMe y debe absorber lo activo.">DRAM</Hint>.
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
              <span><Hint tip="Tier 0 es el nivel rapido. Aqui queremos que viva la memoria activa.">Tier 0 - DRAM</Hint></span>
              <strong>Latencia baja</strong>
            </div>
            <div className="diagramTier nvmeTier">
              <HardDrive size={22} />
              <span><Hint tip="Tier 1 usa NVMe para paginas frias o dormidas. Aporta capacidad, pero no reemplaza la velocidad de DRAM.">Tier 1 - NVMe</Hint></span>
              <strong>Paginas frias</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="ruleBand" id="simulator" aria-labelledby="sim-title">
        <div className="sectionHeader">
          <p className="eyebrow">Prerrequisito practico</p>
          <h2 id="sim-title">
            La <Hint tip="Active memory representa la memoria que la VM esta usando activamente en el momento medido.">memoria activa</Hint> debe ser 50% o menos de la capacidad DRAM.
          </h2>
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
                <span>DRAM - Tier 0</span>
                <strong>{dramCapacity} GB</strong>
              </div>
              <i style={{ width: `${Math.min(tiering.activePercentOfDram, 100)}%` }} />
            </div>

            <div className="budgetLine">
              <span><Hint tip="Este umbral representa la mitad de DRAM. Es el punto de referencia para decidir si el workload es buen candidato.">Umbral recomendado</Hint></span>
              <strong>{tiering.dramTierBudget} GB activos</strong>
            </div>

            <div className="tierBar nvmeBar">
              <div>
                <span>NVMe - Tier 1</span>
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
          {compatibilitySignals.map(({ icon: Icon, title, body, tip }) => (
            <article className="signalCard" key={title}>
              <div className="iconBox">
                <Icon size={22} />
              </div>
              <h3><Hint tip={tip}>{title}</Hint></h3>
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
              La metrica <Hint tip="Active solo aparece como estadistica de nivel 1 cuando el periodo esta en Real-time.">Active</Hint> aparece en la vista avanzada de memoria cuando el periodo esta
              en Real-time. El valor se muestra en KB.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="statistics" aria-labelledby="stats-title">
        <div className="sectionHeader">
          <p className="eyebrow">Medicion extendida</p>
          <h2 id="stats-title">Si necesitas mas historia, sube el nivel de estadisticas con cuidado.</h2>
        </div>

        <div className="riskGrid">
          <article className="riskPanel">
            <AlertTriangle size={24} />
            <h3>Hazlo bajo tu propio riesgo</h3>
            <p>
              Para recolectar memoria activa por mas tiempo puedes entrar al vCenter Server,
              ir a Configure, Edit, Statistics y cambiar algunos intervalos de{" "}
              <Hint tip="Level 1 guarda menos metricas. Level 2 guarda mas detalle, incluyendo metricas necesarias para analizar memoria activa historica.">Level 1 a Level 2</Hint>.
            </p>
            <p>
              El costo es espacio de base de datos. En el ejemplo compartido, la estimacion paso
              de 16 GB a 43 GB.
            </p>
          </article>

          <figure className="screenshotFrame">
            <img
              src={vcenterStatisticsLevels}
              alt="Pantalla Edit vCenter general settings mostrando Statistics Level 2 y espacio estimado de base de datos."
            />
            <figcaption>
              Cambiar el nivel de estadisticas aumenta el detalle historico, pero tambien aumenta
              el consumo de base de datos de vCenter.
            </figcaption>
          </figure>
        </div>

        <div className="toolStrip">
          <article>
            <h3><Hint tip="VCF Operations ayuda a observar capacidad, rendimiento y comportamiento de workloads desde una vista operacional.">VCF Operations</Hint></h3>
            <p>Puede ayudarte a analizar memoria activa y comportamiento de workloads con mas contexto operacional.</p>
          </article>
          <article>
            <h3><Hint tip="RVTools es una herramienta popular para extraer inventario y metricas de entornos VMware.">RVTools</Hint></h3>
            <p>Tambien recolecta activeness en tiempo real. Incluye periodos ocupados y picos para no subestimar.</p>
          </article>
        </div>
      </section>

      <section className="limitations" aria-labelledby="limits-title">
        <div className="sectionHeader">
          <p className="eyebrow">Limitaciones en VCF 9.0</p>
          <h2 id="limits-title">No todos los workloads deben usar Memory Tiering desde el dia uno.</h2>
        </div>

        <div className="limitGrid">
          {limitationCards.map((item) => (
            <article className="limitCard" key={item}>
              <AlertTriangle size={20} />
              <p>{item}</p>
            </article>
          ))}
        </div>

        <p className="note">
          En ambientes mixtos, considera hosts dedicados o deshabilitar Memory Tiering a nivel de VM.
          Esta compatibilidad puede cambiar en futuras mejoras.
        </p>
      </section>

      <section className="software" aria-labelledby="software-title">
        <div className="sectionHeader">
          <p className="eyebrow">Prerequisitos de software</p>
          <h2 id="software-title">La plataforma tambien debe estar lista.</h2>
        </div>

        <div className="signalGrid">
          {softwareCards.map(({ icon: Icon, title, body, tip }) => (
            <article className="signalCard" key={title}>
              <div className="iconBox">
                <Icon size={22} />
              </div>
              <h3><Hint tip={tip}>{title}</Hint></h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nvme" aria-labelledby="nvme-title">
        <div className="sectionHeader">
          <p className="eyebrow">Compatibilidad NVMe</p>
          <h2 id="nvme-title">Aqui no conviene ahorrar en el dispositivo equivocado.</h2>
        </div>

        <div className="requirementsGrid">
          {nvmeRequirements.map((requirement) => (
            <article className="requirementCard" key={requirement.label}>
              <span><Hint tip={requirement.tip}>{requirement.label}</Hint></span>
              <strong>{requirement.value}</strong>
            </article>
          ))}
        </div>

        <div className="copyBlock">
          <p>
            VMware recomienda NVMe con alta durabilidad y alto rendimiento porque Memory Tiering
            puede leer y escribir grandes cantidades de paginas. Si el OEM no lista clases D/F/G,
            usa discos Enterprise Mixed Use con al menos <Hint tip="3 DWPD significa que el disco puede escribir tres veces toda su capacidad por dia durante la garantia.">3 DWPD</Hint>.
          </p>
          <a
            className="textLink"
            href="https://compatibilityguide.broadcom.com/search?program=ssd&persona=live&column=partnerName&order=asc&deviceType=%5BNVMe%5D&enduranceClass=%5BEndurance+Class+D+%3E%3D7300+TBW%5D&performanceClass=%5BClass+F%3A+100%2C000-349%2C999+Writes+Per+Second%7C%7CClass+G%3A+350%2C000%2B+Writes+Per+Second%5D&activePage=1&activeDelta=20"
            target="_blank"
            rel="noreferrer"
          >
            Abrir Broadcom Compatibility Guide
          </a>
        </div>

        <div className="lenovoBlock">
          <div>
            <p className="eyebrow">Lenovo Servers</p>
            <h3>Selecciona Mixed Use NVMe con 3 DWPD.</h3>
            <p>
              En una compra Lenovo, selecciona el NVMe backplane y discos Enterprise-class o
              Advanced Data-Center class. Valida siempre contra la guia de compatibilidad.
            </p>
          </div>
          <ul>
            {lenovoDrives.map((drive) => (
              <li key={drive}>{drive}</li>
            ))}
          </ul>
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
