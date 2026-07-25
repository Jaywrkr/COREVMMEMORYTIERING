import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
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
import nvmeDeviceSelection from "./assets/nvme-device-selection.png";
import nvmeSizingRatios from "./assets/nvme-sizing-ratios.png";
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

const activeMemoryEvidence = [
  {
    value: "Real-time",
    label: "Ventana de observacion",
    body: "La captura confirma que Active aparece en la vista de rendimiento en tiempo real. No es una metrica historica por defecto.",
  },
  {
    value: "KB",
    label: "Unidad de la metrica",
    body: "Active se reporta en KB. Convierte el valor antes de compararlo con la DRAM del host, que normalmente se planifica en GB o TB.",
  },
  {
    value: "125,828",
    label: "Pico de la captura",
    body: "El maximo es muy superior al ultimo valor. Una lectura aislada puede ocultar picos; mide durante la carga real del workload.",
  },
];

const statisticsEvidence = [
  {
    value: "5 min / 1 dia",
    label: "Detalle inmediato",
    body: "La captura conserva Level 2 para la ventana corta, donde el diagnostico necesita mayor granularidad.",
  },
  {
    value: "30 min / 1 semana",
    label: "Detalle semanal",
    body: "Tambien se mantiene Level 2 para una semana, ampliando el analisis sin elevar todos los intervalos.",
  },
  {
    value: "43 GB",
    label: "Base de datos estimada",
    body: "Con 50 hosts y 2,000 VMs, el ejemplo visual estima 43 GB. El incremento de retencion debe presupuestarse.",
  },
];

const guideFilters = [
  {
    step: "01",
    title: "Tipo de dispositivo",
    body: "Parte de NVMe. Evita mezclar la busqueda con SATA, SAS o categorias que no aportan el tier requerido.",
  },
  {
    step: "02",
    title: "Resistencia y escritura",
    body: "Aplica Endurance Class D y Performance Class F o G. Son los filtros de aptitud, antes del formato fisico.",
  },
  {
    step: "03",
    title: "Encaje en el servidor",
    body: "Solo entonces decide Form Factor y DWPD segun bahias, backplane, OEM y estrategia de redundancia.",
  },
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

const ratioOptions = [
  {
    value: 1,
    label: "1:1",
    description: "Default seguro para la mayoria de workloads evaluados.",
  },
  {
    value: 2,
    label: "1:2",
    description: "Usa mas NVMe cuando la memoria activa es baja y consistente.",
  },
  {
    value: 4,
    label: "1:4",
    description: "Configuracion avanzada para workloads con actividad muy baja.",
  },
];

const greenfieldVariables = [
  {
    label: "DRAM",
    body: "Cantidad fisica de memoria rapida que compras por host.",
    tip: "En greenfield puedes comprar DRAM pensando en memoria activa, no necesariamente en todo el pool historico.",
  },
  {
    label: "NVMe",
    body: "Dispositivo o conjunto de dispositivos que aportan capacidad al tier secundario.",
    tip: "Puede ser un dispositivo standalone o varios detras de RAID, pero Memory Tiering necesita ver un dispositivo logico.",
  },
  {
    label: "Particion",
    body: "Espacio reservado en NVMe para que Memory Tiering lo consuma.",
    tip: "Hoy la particion se crea antes de configurar Memory Tiering y puede llegar hasta 4 TB.",
  },
  {
    label: "Ratio",
    body: "Relacion DRAM:NVMe que define cuanto NVMe se usa para ampliar memoria.",
    tip: "El default 1:1 es conservador. 1:2 y 1:4 son avanzados y requieren validar memoria activa.",
  },
];

const formFactors = [
  {
    label: "2.5 pulgadas",
    body: "Buena opcion cuando el servidor todavia tiene bahias frontales disponibles.",
    tip: "Es el formato clasico de muchos SSD empresariales. Facilita reemplazo fisico y mantenimiento.",
  },
  {
    label: "E3.S pluggable",
    body: "Formato moderno, removible y pensado para densidad en plataformas nuevas.",
    tip: "E3.S es comun en servidores recientes que buscan mas densidad y mejor flujo de aire que formatos anteriores.",
  },
  {
    label: "M.2",
    body: "Util cuando las bahias de 2.5 pulgadas ya estan ocupadas.",
    tip: "M.2 puede ser practico, pero valida siempre endurance, performance y soporte del OEM. No asumas que cualquier M.2 sirve.",
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

const workloadProfiles = [
  { id: "vdi", label: "VDI estable", peak: 256, note: "Actividad baja y consistente" },
  { id: "general", label: "Aplicacion general", peak: 480, note: "Patron comun de produccion" },
  { id: "spiky", label: "Con picos", peak: 768, note: "La media puede enganar" },
  { id: "latency", label: "Latencia critica", peak: 1024, note: "Revisar limitaciones primero" },
];

function App() {
  const [dramCapacity, setDramCapacity] = useState(1024);
  const [activeMemory, setActiveMemory] = useState(420);
  const [selectedRatio, setSelectedRatio] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState("general");
  const [observationPoint, setObservationPoint] = useState(68);
  const [reportCopied, setReportCopied] = useState(false);
  const [evidenceChecks, setEvidenceChecks] = useState({ realtime: false, busyWindow: false, peakRecorded: false });
  const [hardwareChecks, setHardwareChecks] = useState({ nvme: true, endurance: false, performance: false, dwpd: false, oem: false });

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

  const exploration = useMemo(() => {
    const samples = Array.from({ length: 25 }, (_, index) => {
      const wave = Math.sin((index / 24) * Math.PI * 3 - 0.7) * 0.24;
      const pulse = index === 16 || index === 17 ? 0.22 : 0;
      return Math.round(Math.max(activeMemory * 0.36, activeMemory * (0.58 + wave + pulse)));
    });
    const pointIndex = Math.round((observationPoint / 100) * (samples.length - 1));
    const observed = samples[pointIndex];
    const peak = Math.max(...samples);
    const warmInDram = Math.min(observed, dramCapacity);
    const coldToNvme = Math.max(0, dramCapacity - warmInDram);
    const candidate = peak <= dramCapacity / 2;
    const line = samples
      .map((sample, index) => `${(index / (samples.length - 1)) * 100},${100 - Math.min(92, (sample / Math.max(dramCapacity, peak)) * 100)}`)
      .join(" ");

    return { samples, pointIndex, observed, peak, warmInDram, coldToNvme, candidate, line };
  }, [activeMemory, dramCapacity, observationPoint]);

  const sizing = useMemo(() => {
    const partitionSize = 4096;
    const ratioRows = ratioOptions.map((ratio) => ({
      ...ratio,
      nvmeUsed: Math.min(partitionSize, dramCapacity * ratio.value),
    }));
    const currentNvmeUsed = Math.min(partitionSize, dramCapacity * selectedRatio);
    const suggestedNvmeSize = Math.max(dramCapacity, currentNvmeUsed);
    const activePercentAfterRatio = Math.round((activeMemory / dramCapacity) * 100);

    return {
      partitionSize,
      ratioRows,
      currentNvmeUsed,
      suggestedNvmeSize,
      activePercentAfterRatio,
    };
  }, [activeMemory, dramCapacity, selectedRatio]);

  const greenfield = useMemo(() => {
    const requiredMemory = 1024;
    const activeMemoryTarget = Math.round(requiredMemory * 0.3);
    const conservativeDram = requiredMemory / 2;
    const conservativeNvme = requiredMemory / 2;
    const denseTotal = requiredMemory * 2;
    const activeFitsInReducedDram = activeMemoryTarget <= conservativeDram;

    return {
      requiredMemory,
      activeMemoryTarget,
      conservativeDram,
      conservativeNvme,
      denseTotal,
      activeFitsInReducedDram,
    };
  }, []);

  const copyAssessment = async () => {
    const summary = [
      "NVMe Memory Tiering - diagnostico inicial",
      `Perfil: ${workloadProfiles.find((profile) => profile.id === selectedProfile)?.label ?? "Personalizado"}`,
      `DRAM del host: ${dramCapacity} GB`,
      `Pico de memoria activa: ${exploration.peak} GB`,
      `Umbral recomendado (50% DRAM): ${tiering.dramTierBudget} GB`,
      `Resultado: ${exploration.candidate ? "Candidato inicial; validar en periodos de carga reales." : "No activar aun; medir mas, aumentar DRAM o excluir el workload."}`,
    ].join("\n");

    await navigator.clipboard.writeText(summary);
    setReportCopied(true);
    window.setTimeout(() => setReportCopied(false), 2200);
  };

  const evidenceCompleted = Object.values(evidenceChecks).filter(Boolean).length;
  const hardwareCompleted = Object.values(hardwareChecks).filter(Boolean).length;
  const hardwareReady = hardwareCompleted === Object.keys(hardwareChecks).length;

  return (
    <main>
      <header className="appHeader" id="top" aria-labelledby="hero-title">
        <nav className="topbar" aria-label="Principal">
          <a className="brand" href="#top" aria-label="Inicio">
            <span className="brandMark" />
            <span>CORE VM Memory Tiering</span>
          </a>
          <div className="topbarLinks">
            <span className="liveIndicator">Laboratorio interactivo</span>
            <a href="#assessment">Evidencia</a>
            <a href="#sizing">Sizing</a>
            <a href="#nvme">Hardware</a>
          </div>
        </nav>
        <div className="appTitlebar">
          <div>
            <p className="eyebrow">VCF 9 / Memory Tiering</p>
            <h1 id="hero-title">Memory Tiering Workbench</h1>
            <p>Construye una recomendacion con tus datos. No asumas que mas capacidad equivale a un workload apto.</p>
          </div>
          <div className="appFacts" aria-label="Criterios de la herramienta">
            <span><b>1</b> Mide el pico, no la media</span>
            <span><b>2</b> Protege la memoria activa en DRAM</span>
            <span><b>3</b> Dimensiona NVMe con evidencia</span>
          </div>
        </div>
      </header>

      <section className="ruleBand" id="simulator" aria-labelledby="sim-title">
        <div className="sectionHeader">
          <p className="eyebrow">Diagnostico guiado</p>
          <h2 id="sim-title">
            Ingresa una evidencia. Obten una recomendacion. Entiende por que.
          </h2>
        </div>

        <div className="decisionStudio">
          <aside className="studioControls" aria-label="Controles de exploracion">
            <div className="studioLabel"><span>Entrada</span><strong>01 / Perfil</strong></div>
            <p>Elige un comportamiento y luego ajusta sus variables. No hay un workload universalmente bueno: hay evidencia suficiente o insuficiente.</p>
            <div className="profilePicker" role="group" aria-label="Perfil del workload">
              {workloadProfiles.map((profile) => (
                <button
                  className={selectedProfile === profile.id ? "profileButton active" : "profileButton"}
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setSelectedProfile(profile.id);
                    setActiveMemory(profile.peak);
                  }}
                >
                  <span>{profile.label}</span>
                  <small>{profile.note}</small>
                </button>
              ))}
            </div>

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
              <span>Pico de memoria activa observado</span>
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
          </aside>

          <div className="studioCanvas" aria-label="Simulacion de memoria activa">
            <div className="studioHeader">
              <div><span>Observacion</span><strong>02 / Carga a traves del tiempo</strong></div>
              <p>Arrastra el marcador. Esta lectura puntual ilustra lo que verias en Real-time; el veredicto usa el pico de la muestra.</p>
            </div>
            <div className="timelineChart">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Linea de memoria activa durante una ventana de observacion">
                <line x1="0" x2="100" y1="50" y2="50" className="thresholdLine" />
                <polyline points={exploration.line} className="activeLine" />
                <line x1={observationPoint} x2={observationPoint} y1="0" y2="100" className="cursorLine" />
                <circle cx={observationPoint} cy={100 - Math.min(92, (exploration.observed / Math.max(dramCapacity, exploration.peak)) * 100)} r="2.4" className="cursorDot" />
              </svg>
              <div className="chartScale"><span>Inicio</span><span>Umbral 50% DRAM</span><span>Fin</span></div>
            </div>
            <input
              className="observationSlider"
              type="range"
              min="0"
              max="100"
              value={observationPoint}
              onChange={(event) => setObservationPoint(Number(event.target.value))}
              aria-label="Momento observado de la carga"
            />
            <div className="studioMetrics">
              <article><span>Ahora</span><strong>{exploration.observed} GB</strong><p>Lectura puntual</p></article>
              <article><span>Pico de muestra</span><strong>{exploration.peak} GB</strong><p>Base de la decision</p></article>
              <article><span>Presupuesto DRAM</span><strong>{tiering.dramTierBudget} GB</strong><p>50% de DRAM</p></article>
            </div>
            <div className="tierScene">
              <div className="tierSceneHeader"><span>Que esta ocurriendo en este instante</span><strong>{exploration.observed} GB activos</strong></div>
              <div className="tierTrack dramTrack"><span>DRAM / Tier 0</span><i style={{ width: `${Math.min((exploration.warmInDram / dramCapacity) * 100, 100)}%` }} /><b>{exploration.warmInDram} GB activos permanecen en el tier rapido</b></div>
              <div className="tierTrack nvmeTrack"><span>NVMe / Tier 1</span><i style={{ width: `${Math.min((exploration.coldToNvme / dramCapacity) * 100, 100)}%` }} /><b>{exploration.coldToNvme} GB quedan disponibles para paginas frias</b></div>
            </div>
          </div>

          <aside className={exploration.candidate ? "studioVerdict good" : "studioVerdict caution"} aria-live="polite">
            <div className="studioLabel"><span>Salida</span><strong>03 / Decision</strong></div>
            {exploration.candidate ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
            <h3>{exploration.candidate ? "Candidato inicial" : "No activar todavia"}</h3>
            <p>
              {exploration.candidate
                ? `El pico de ${exploration.peak} GB cabe dentro del presupuesto de ${tiering.dramTierBudget} GB. Aun valida periodos de carga reales.`
                : `El pico de ${exploration.peak} GB supera el presupuesto de ${tiering.dramTierBudget} GB. Medir mas, aumentar DRAM o excluir este workload.`}
            </p>
            <div className="verdictRule"><span>Regla aplicada</span><strong>{exploration.peak} GB / {tiering.dramTierBudget} GB</strong></div>
            <button className="copyAssessment" type="button" onClick={copyAssessment}>
              <Copy size={16} />
              {reportCopied ? "Resumen copiado" : "Copiar resumen para el equipo"}
            </button>
            <a href="#assessment">Ver como obtener la evidencia en vCenter <ArrowRight size={16} /></a>
          </aside>
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

        <div className="evidenceRail" aria-label="Lectura de la captura de memoria activa">
          <div className="evidenceLead">
            <span>Lectura de la evidencia</span>
            <p>
              La grafica no es un adorno: revela que <strong>Active</strong> cambia con el tiempo.
              Para sizing, no tomes el ultimo punto como respuesta; busca una muestra que incluya
              horas de carga y picos representativos.
            </p>
          </div>
          {activeMemoryEvidence.map((item) => (
            <article key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="evidenceGate" aria-label="Checklist de evidencia para sizing">
          <div className="gateIntro">
            <p className="eyebrow">Gate 01 / Evidencia</p>
            <h3>No avances a sizing hasta cerrar esta evidencia.</h3>
            <p>Marca solo lo que ya verificaste en tu entorno. El objetivo es evitar que una muestra bonita se convierta en una compra equivocada.</p>
          </div>
          <div className="checklist">
            {[
              ["realtime", "Vi Active en Real-time", "La metrica aparece en la VM correcta y en KB."],
              ["busyWindow", "Inclui una ventana ocupada", "La muestra cubre carga real, no solo un momento tranquilo."],
              ["peakRecorded", "Registre el pico", "Tengo un valor maximo para comparar contra 50% de DRAM."],
            ].map(([key, label, description]) => (
              <label className={evidenceChecks[key as keyof typeof evidenceChecks] ? "checkItem done" : "checkItem"} key={key}>
                <input
                  type="checkbox"
                  checked={evidenceChecks[key as keyof typeof evidenceChecks]}
                  onChange={(event) => setEvidenceChecks((current) => ({ ...current, [key]: event.target.checked }))}
                />
                <span><strong>{label}</strong><small>{description}</small></span>
              </label>
            ))}
          </div>
          <div className={evidenceCompleted === 3 ? "gateResult ready" : "gateResult"}>
            <span>{evidenceCompleted}/3 verificado</span>
            <strong>{evidenceCompleted === 3 ? "Evidencia lista para dimensionar" : "Aun no hay evidencia suficiente"}</strong>
            <p>{evidenceCompleted === 3 ? "Lleva el pico al Workbench y prueba ratios en el siguiente paso." : "Completa los puntos pendientes antes de usar el resultado del Workbench como recomendacion."}</p>
          </div>
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

        <div className="evidenceRail statisticsRail" aria-label="Lectura de la configuracion de estadisticas">
          <div className="evidenceLead">
            <span>Lo que cambia al subir el nivel</span>
            <p>
              La captura ilustra una estrategia selectiva: mas detalle para los intervalos cortos,
              retencion mas liviana para los largos. Es una decision de observabilidad y capacidad,
              no un interruptor inocuo.
            </p>
          </div>
          {statisticsEvidence.map((item) => (
            <article key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <p>{item.body}</p>
            </article>
          ))}
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

      <section className="sizing" id="sizing" aria-labelledby="sizing-title">
        <div className="sectionHeader">
          <p className="eyebrow">Sizing brownfield</p>
          <h2 id="sizing-title">En infraestructura existente, compra NVMe pensando en el ratio que podrias necesitar despues.</h2>
        </div>

        <div className="sizingGrid">
          <div className="sizingPanel">
            <p>
              En un despliegue <Hint tip="Brownfield significa adoptar la capacidad en infraestructura existente, no disenar todo desde cero.">brownfield</Hint>, el punto de partida simple es comprar un dispositivo NVMe al menos del mismo tamano que la DRAM del host.
            </p>
            <p>
              La razon es el ratio por defecto <Hint tip="1:1 significa que por cada unidad de DRAM se usa una unidad equivalente de NVMe para Memory Tiering.">DRAM:NVMe 1:1</Hint>. Si un host tiene 1 TB de DRAM, necesitas al menos 1 TB de NVMe para duplicar la memoria disponible.
            </p>
            <p>
              Pero si tus workloads tienen memoria activa muy baja, por ejemplo VDI con 10% activo de forma consistente, puedes planear para ratios avanzados como 1:2 o 1:4.
            </p>
          </div>

          <div className="ratioPanel" aria-label="Calculadora de sizing por ratio DRAM a NVMe">
            <div className="ratioHeader">
              <span>Ratio activo</span>
              <strong>1:{selectedRatio}</strong>
            </div>

            <div className="ratioButtons" role="group" aria-label="Seleccion de ratio DRAM a NVMe">
              {ratioOptions.map((ratio) => (
                <button
                  className={selectedRatio === ratio.value ? "ratioButton active" : "ratioButton"}
                  key={ratio.label}
                  type="button"
                  onClick={() => setSelectedRatio(ratio.value)}
                >
                  <span>{ratio.label}</span>
                  <small>{ratio.description}</small>
                </button>
              ))}
            </div>

            <div className="sizingMetrics">
              <article>
                <span>DRAM del host</span>
                <strong>{dramCapacity} GB</strong>
              </article>
              <article>
                <span>Particion NVMe</span>
                <strong>{sizing.partitionSize} GB</strong>
              </article>
              <article>
                <span>NVMe usado</span>
                <strong>{sizing.currentNvmeUsed} GB</strong>
              </article>
              <article>
                <span>Compra minima sugerida</span>
                <strong>{sizing.suggestedNvmeSize} GB</strong>
              </article>
            </div>
          </div>
        </div>

        <div className="ratioTableWrap">
          <table className="ratioTable">
            <thead>
              <tr>
                <th>DRAM:NVMe</th>
                <th>DRAM size</th>
                <th>NVMe partition size</th>
                <th>NVMe used</th>
              </tr>
            </thead>
            <tbody>
              {sizing.ratioRows.map((row) => (
                <tr className={selectedRatio === row.value ? "selectedRow" : ""} key={row.label}>
                  <td>{row.label}</td>
                  <td>{dramCapacity} GB</td>
                  <td>{sizing.partitionSize} GB</td>
                  <td>{row.nvmeUsed} GB</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            La particion puede quedar grande desde el inicio. Si compras 4 TB NVMe para un host
            con 1 TB DRAM, el default 1:1 usara 1 TB. Si luego cambias a 1:2, usara 2 TB sin
            recrear la particion.
          </p>
        </div>

        <div className="sizingEvidence">
          <article>
            <AlertTriangle size={22} />
            <h3>No cambies el ratio sin validar memoria activa.</h3>
            <p>
              El ratio DRAM:NVMe es una configuracion avanzada. Antes de subirlo, confirma que
              la memoria activa de tus workloads cabe en la DRAM disponible. Si no, puedes mover
              paginas calientes fuera del tier rapido.
            </p>
          </article>
          <figure className="screenshotFrame">
            <img
              src={nvmeSizingRatios}
              alt="Tabla y diagrama de sizing para ratios DRAM a NVMe 1:1, 1:2 y 1:4."
            />
            <figcaption>
              El sizing debe considerar el maximo de particion soportado, los ratios posibles y
              la actividad real de memoria.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="greenfield" aria-labelledby="greenfield-title">
        <div className="sectionHeader">
          <p className="eyebrow">Sizing greenfield</p>
          <h2 id="greenfield-title">Si vas a comprar servidores nuevos, Memory Tiering entra directo en el calculo de costo.</h2>
        </div>

        <div className="greenfieldGrid">
          <article className="greenfieldIntro">
            <h3>Greenfield cambia la pregunta.</h3>
            <p>
              En un despliegue <Hint tip="Greenfield significa disenar y comprar infraestructura nueva con Memory Tiering considerado desde el inicio.">greenfield</Hint>, ya sabes que Memory Tiering existe antes de comprar servidores. Eso permite decidir cuanta DRAM comprar, cuanto NVMe agregar y que densidad quieres por host.
            </p>
            <p>
              La condicion sigue siendo la misma: primero califica workloads. Si la mayoria ronda 30% de memoria activa, puedes planificar con mas precision y aun asi mantener una postura conservadora.
            </p>
          </article>

          <div className="scenarioGrid" aria-label="Comparacion de estrategias greenfield">
            <article className="scenarioCard">
              <span>Escenario A</span>
              <h3>Reducir DRAM y completar capacidad con NVMe.</h3>
              <p>
                Si necesitas {greenfield.requiredMemory} GB de memoria por host, puedes comprar{" "}
                {greenfield.conservativeDram} GB de DRAM y {greenfield.conservativeNvme} GB de NVMe con ratio 1:1.
              </p>
              <strong>
                {greenfield.activeFitsInReducedDram ? "La memoria activa estimada cabe en DRAM." : "Revisa la memoria activa antes de reducir DRAM."}
              </strong>
            </article>

            <article className="scenarioCard dark">
              <span>Escenario B</span>
              <h3>Mantener DRAM y sumar densidad por host.</h3>
              <p>
                Tambien puedes conservar {greenfield.requiredMemory} GB de DRAM y sumar otro{" "}
                {greenfield.requiredMemory} GB via NVMe. Obtienes {greenfield.denseTotal} GB efectivos por host.
              </p>
              <strong>Menos servidores pueden cubrir el mismo pool de workloads.</strong>
            </article>
          </div>
        </div>

        <div className="greenfieldMath">
          <article>
            <span>Memoria requerida por host</span>
            <strong>{greenfield.requiredMemory} GB</strong>
          </article>
          <article>
            <span>Memoria activa estimada</span>
            <strong>{greenfield.activeMemoryTarget} GB</strong>
          </article>
          <article>
            <span>DRAM conservadora</span>
            <strong>{greenfield.conservativeDram} GB</strong>
          </article>
          <article>
            <span>NVMe conservador</span>
            <strong>{greenfield.conservativeNvme} GB</strong>
          </article>
        </div>

        <div className="variableGrid">
          {greenfieldVariables.map((variable) => (
            <article className="variableCard" key={variable.label}>
              <strong><Hint tip={variable.tip}>{variable.label}</Hint></strong>
              <p>{variable.body}</p>
            </article>
          ))}
        </div>

        <p className="note light">
          El ahorro puede venir de comprar menos DRAM, o de comprar menos servidores al aumentar
          densidad por host. En ambos casos, la decision debe basarse en memoria activa real,
          tamano NVMe, tamano de particion y ratio DRAM:NVMe.
        </p>
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

        <div className="hardwareGate" aria-label="Validador de requisitos de hardware">
          <div className="gateIntro">
            <p className="eyebrow">Gate 03 / Hardware</p>
            <h3>Califica el dispositivo antes de aprobar la compra.</h3>
            <p>Usa este filtro como una lista de salida. Una respuesta pendiente no es una aprobacion: es una investigacion pendiente.</p>
          </div>
          <div className="hardwareChecklist">
            {[
              ["nvme", "El dispositivo es NVMe"],
              ["endurance", "Endurance Class D o 7300 TBW+"],
              ["performance", "Performance Class F o G"],
              ["dwpd", "Mixed Use con 3 DWPD+ si no hay clase"],
              ["oem", "Validado en Broadcom / OEM"],
            ].map(([key, label]) => (
              <label className={hardwareChecks[key as keyof typeof hardwareChecks] ? "hardwareCheck done" : "hardwareCheck"} key={key}>
                <input
                  type="checkbox"
                  checked={hardwareChecks[key as keyof typeof hardwareChecks]}
                  onChange={(event) => setHardwareChecks((current) => ({ ...current, [key]: event.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className={hardwareReady ? "gateResult ready" : "gateResult"}>
            <span>{hardwareCompleted}/5 confirmado</span>
            <strong>{hardwareReady ? "Especificacion lista para compra" : "No aprobar el dispositivo todavia"}</strong>
            <p>{hardwareReady ? "El drive supera los criterios tecnicos iniciales. Confirma capacidad y formato fisico con el servidor." : "Usa la guia de compatibilidad para cerrar las condiciones pendientes."}</p>
          </div>
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

        <div className="selectionBlock">
          <div className="selectionCopy">
            <p className="eyebrow">Seleccion del dispositivo</p>
            <h3>Primero filtra por calidad. Despues elige el formato que calza en tu servidor.</h3>
            <p>
              En el Broadcom Compatibility Guide, selecciona <Hint tip="Device Type limita la busqueda a dispositivos NVMe, no SATA, SAS o PCI-E genericos.">Device Type: NVMe</Hint>,{" "}
              <Hint tip="Endurance Class D equivale a 7300 TBW o mas. Es una senal de durabilidad para cargas con muchas escrituras.">Endurance Class D</Hint> y{" "}
              <Hint tip="Class F y G agrupan dispositivos con alto volumen de escrituras por segundo.">Performance Class F o G</Hint>. Luego usa filtros como{" "}
              <Hint tip="Form Factor describe el formato fisico: 2.5 pulgadas, E3.S, M.2 u otros.">Form Factor</Hint> y{" "}
              <Hint tip="DWPD mide cuantas veces puedes escribir toda la capacidad del disco cada dia durante su garantia.">DWPD</Hint> para escoger el mejor drive para tu ambiente.
            </p>
          </div>

          <div className="formFactorGrid">
            {formFactors.map((factor) => (
              <article className="formFactorCard" key={factor.label}>
                <strong><Hint tip={factor.tip}>{factor.label}</Hint></strong>
                <p>{factor.body}</p>
              </article>
            ))}
          </div>

          <figure className="screenshotFrame">
            <img
              src={nvmeDeviceSelection}
              alt="Seleccion de dispositivos NVMe en Broadcom Compatibility Guide filtrando Device Type, Endurance Class y Performance Class."
            />
            <figcaption>
              La seleccion correcta combina compatibilidad, durabilidad, rendimiento y formato fisico.
            </figcaption>
          </figure>
        </div>

        <div className="filterJourney" aria-label="Orden recomendado para filtrar dispositivos NVMe">
          <div className="filterJourneyLead">
            <p className="eyebrow">Como leer la guia</p>
            <h3>Filtrar es una secuencia de decisiones, no una lista de especificaciones.</h3>
          </div>
          {guideFilters.map((filter) => (
            <article key={filter.step}>
              <span>{filter.step}</span>
              <h4>{filter.title}</h4>
              <p>{filter.body}</p>
            </article>
          ))}
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
