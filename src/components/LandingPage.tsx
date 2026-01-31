import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  ClipboardList,
  Lock,
  Zap,
  Logs,
  HandCoins,
} from "lucide-react";
import { Link } from "react-router-dom";

interface LandingPageProps {
  onGetStarted?: () => void;
}

interface Orb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

export const LandingPage = ({ onGetStarted = () => {} }: LandingPageProps) => {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const colors = [
      "rgba(239, 68, 68, 0.2)",
      "rgba(59, 130, 246, 0.2)",
      "rgba(16, 185, 129, 0.2)",
      "rgba(168, 85, 247, 0.2)",
      "rgba(245, 158, 11, 0.2)",
      "rgba(236, 72, 153, 0.2)",
    ];

    const initialOrbs: Orb[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: Math.random() * 45 + 15,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.3 + 0.1,
    }));

    setOrbs(initialOrbs);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const animate = () => {
      setOrbs((prevOrbs) =>
        prevOrbs.map((orb) => {
          let { x, y, vx, vy } = orb;

          const dx = mousePos.x - x;
          const dy = mousePos.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const force = (150 - distance) / 120;
            vx -= (dx / distance) * force * 1.5;
            vy -= (dy / distance) * force * 1.5;
          }

          x += vx;
          y += vy;

          if (x <= 0 || x >= window.innerWidth) {
            vx *= -0.8;
            x = Math.max(0, Math.min(window.innerWidth, x));
          }
          if (y <= 0 || y >= window.innerHeight) {
            vy *= -0.8;
            y = Math.max(0, Math.min(window.innerHeight, y));
          }

          vx *= 0.98;
          vy *= 0.98;

          vx += (Math.random() - 0.5) * 0.05;
          vy += (Math.random() - 0.5) * 0.05;

          return { ...orb, x, y, vx, vy };
        }),
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    if (isLoaded) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mousePos, isLoaded]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
    >
      <style>
        {`
          @keyframes fadeSlideInLeft {
            0% { opacity: 0; transform: translateX(-20px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeSlideInRight {
            0% { opacity: 0; transform: translateX(20px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes pulseBtn {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
            50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.5); }
          }
          @keyframes heroAppear {
            0% { opacity: 0; transform: translateY(30px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }

          .animate-fadeSlideInLeft {
            opacity: 0;
            animation: fadeSlideInLeft 1s ease-out forwards;
          }
          .animate-fadeSlideInRight {
            opacity: 0;
            animation: fadeSlideInRight 1s ease-out forwards;
          }
          .animate-pulseBtn {
            animation: pulseBtn 3s ease-in-out infinite;
          }
          .animate-fadeUp {
            opacity: 0;
            animation: fadeUp 1s ease-out forwards;
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-glow {
            animation: glow 4s ease-in-out infinite;
          }
          .animate-heroAppear {
            opacity: 0;
            animation: heroAppear 1.2s ease-out forwards;
          }

          .header-icon-wrapper {
            display: inline-block;
            transition: transform 0.3s ease;
            will-change: transform;
          }
          .header-icon-wrapper:hover {
            transform: scale(1.2) rotate(-15deg);
          }

          .feature-card {
            transition: all 0.4s ease;
            will-change: transform, box-shadow;
            backdrop-filter: blur(10px);
          }
          .feature-card:hover {
            transform: scale(1.08) translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          }

          .feature-card-icon {
            transition: all 0.3s ease;
            will-change: transform;
          }
          .feature-card-icon:hover {
            transform: scale(1.3) rotate(10deg);
          }

          .social-link {
            transition: all 0.3s ease;
            transform-origin: center;
          }
          .social-link:hover {
            transform: scale(1.1) translateY(-2px);
            filter: brightness(1.2);
          }

          .hero-text {
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            color: white !important;
            opacity: 1 !important;
          }

          .floating-orb {
            position: fixed;
            border-radius: 50%;
            pointer-events: none;
            filter: blur(5px);
            z-index: 1;
            transition: transform 1s ease-out;
          }

          .content-layer {
            position: relative;
            z-index: 10;
          }

          .hero-main-text {
            color: white !important;
            opacity: 1 !important;
            text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
            position: relative;
            z-index: 15;
          }
        `}
      </style>

      {}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="floating-orb"
          style={{
            left: `${orb.x}px`,
            top: `${orb.y}px`,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            backgroundColor: orb.color,
            opacity: orb.opacity,
          }}
        />
      ))}

      {}
      <div className="content-layer">
        {}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 animate-fadeSlideInLeft">
              <div className="p-2 bg-red-500/20 rounded-lg header-icon-wrapper animate-glow">
                <Shield className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white hero-text">
                NGINX Shield
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {}
              <Link to="/">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-slate-700/50"
                >
                  Torna al Login
                </Button>
              </Link>

              {}
              <div className="flex items-center space-x-3">
                <a
                  href="https://github.com/MaxlonPlay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link p-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600"
                  title="GitHub"
                >
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link p-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600"
                  title="Donazione"
                >
                  <HandCoins className="w-5 h-5 text-green-400" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-6xl font-bold text-white mb-6 hero-main-text animate-heroAppear animate-float">
              Protezione <span className="text-red-400">Automatica</span>
              <br />
              per i tuoi Server <span className="text-red-400">NGINX</span>
            </h2>
            <p
              className="text-xl text-slate-300 mb-8 leading-relaxed animate-fadeUp"
              style={{ animationDelay: "0.4s" }}
            >
              NGINX Shield è una soluzione di sicurezza avanzata progettata per
              monitorare in modo continuo e automatizzato i log del server
              NGINX. Grazie all'analisi in tempo reale dei dati di log, il
              sistema è in grado di identificare tempestivamente comportamenti
              sospetti e attività potenzialmente dannose. Al rilevamento di
              pattern anomali o tentativi di intrusione, NGINX Shield procede al
              blocco immediato degli indirizzi IP compromessi, garantendo così
              una protezione proattiva e robusta dell'infrastruttura. Questo
              approccio consente di prevenire efficacemente attacchi informatici
              quali tentativi di accesso non autorizzato, attacchi DDoS, e altre
              minacce comuni, assicurando la continuità e la sicurezza dei
              servizi web.
            </p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-3 inline-flex items-center justify-center animate-fadeUp hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300"
              style={{ animationDelay: "0.6s" }}
            >
              <Shield className="h-5 w-5 mr-2" />
              Inizia Ora
            </Button>
          </div>
        </div>

        {}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4 animate-fadeSlideInLeft hero-text">
              Funzionalità Principali
            </h3>
            <p
              className="text-slate-300 text-lg animate-fadeSlideInLeft"
              style={{ animationDelay: "0.2s" }}
            >
              Tutto quello che ti serve per proteggere i tuoi server
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <ShieldAlert className="h-6 w-6 text-red-400 feature-card-icon" />
                ),
                bg: "bg-red-500/20",
                title: "Rilevamento Automatico",
                desc: "Analizza automaticamente i log di NGINX e rileva comportamenti sospetti",
                items: [
                  "Monitoraggio 24/7",
                  "Pattern recognition avanzato",
                  "Integrazione con fail2ban",
                ],
              },
              {
                icon: (
                  <Activity className="h-6 w-6 text-blue-400 feature-card-icon" />
                ),
                bg: "bg-blue-500/20",
                title: "Analisi in Tempo Reale",
                desc: "Dashboard completa per monitorare minacce e attività",
                items: [
                  "Statistiche dettagliate",
                  "Grafici e timeline",
                  "Alerting configurabile",
                ],
              },
              {
                icon: (
                  <ClipboardList className="h-6 w-6 text-green-400 feature-card-icon" />
                ),
                bg: "bg-green-500/20",
                title: "Gestione Whitelist",
                desc: "Proteggi IP fidati e gestisci eccezioni",
                items: [
                  "IP e intere reti CIDR autorizzate",
                  "Domini in whitelisted nel caso di IP dinamici",
                ],
              },
              {
                icon: (
                  <ShieldCheck className="h-6 w-6 text-purple-400 feature-card-icon" />
                ),
                bg: "bg-purple-500/20",
                title: "Ban Intelligente",
                desc: "Sistema di ban automatico basato su regole configurabili dall'utente via WEBUI",
                items: [
                  "Ban automatico per troppe richieste errate",
                  "Rilevamento brute force",
                  "Rilevamento User-Agent e pattern URL pericolosi",
                ],
              },
              {
                icon: (
                  <Zap className="h-6 w-6 text-orange-400 feature-card-icon" />
                ),
                bg: "bg-orange-500/20",
                title: "Configurazione Flessibile",
                desc: "Personalizza soglie, pattern e comportamenti",
                items: [
                  "Soglie prima del ban personalizzabili",
                  "Pattern regex UA-URL custom",
                  "Notifiche email",
                ],
              },
              {
                icon: (
                  <Logs className="h-6 w-6 text-yellow-400 feature-card-icon" />
                ),
                bg: "bg-yellow-500/20",
                title: "Log Avanzati",
                desc: "Logging completo e visualizzazione in WEBUI",
                items: [
                  "Presentazione dei log chiara e immediata",
                  "Maggiore leggibilità e comprensione degli eventi",
                  "Analisi strutturata più efficiente",
                  "Funzionalità di esportazione e analisi approfondita",
                ],
              },
            ].map(({ icon, bg, title, desc, items }, idx) => (
              <Card
                key={idx}
                className="feature-card bg-slate-800/30 border-slate-600 hover:bg-slate-700/40 transition-all duration-500 animate-fadeUp backdrop-blur-md"
                style={{ animationDelay: `${0.2 * idx}s` }}
              >
                <CardHeader>
                  <div
                    className={`p-3 ${bg} rounded-lg w-fit animate-float`}
                    style={{ animationDelay: `${idx * 0.5}s` }}
                  >
                    {icon}
                  </div>
                  <CardTitle className="text-white text-lg">{title}</CardTitle>
                  <CardDescription className="text-slate-300">
                    {desc}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-slate-300 space-y-2 text-sm">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-center">
                        <span className="text-red-400 mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4 animate-fadeSlideInLeft hero-text">
              Come Funziona
            </h3>
            <p
              className="text-slate-300 text-lg animate-fadeSlideInLeft"
              style={{ animationDelay: "0.2s" }}
            >
              Protezione automatica in 3 semplici passi
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: 1,
                color: "text-red-400",
                bg: "bg-red-500/20",
                title: "Monitoraggio",
                desc: "NGINX Shield analizza continuamente i log di NGINX, rilevando pattern sospetti e comportamenti anomali",
                anim: "fadeSlideInLeft",
              },
              {
                number: 2,
                color: "text-orange-400",
                bg: "bg-orange-500/20",
                title: "Analisi",
                desc: "Il sistema valuta la gravità delle minacce utilizzando regole intelligenti e Intrusion Detection and Prevention System (IDPS)",
                anim: "fadeUp",
              },
              {
                number: 3,
                color: "text-green-400",
                bg: "bg-green-500/20",
                title: "Protezione",
                desc: "Gli indirizzi IP malevoli vengono automaticamente bloccati tramite Fail2Ban, garantendo una protezione efficace della tua infrastruttura.",
                anim: "fadeSlideInRight",
              },
            ].map(({ number, color, bg, title, desc, anim }, idx) => (
              <div
                key={number}
                className={`text-center animate-${anim} hover:scale-105 transition-transform duration-300`}
                style={{
                  animationDuration: "1s",
                  animationFillMode: "forwards",
                  animationDelay: `${0.3 * idx}s`,
                }}
              >
                <div
                  className={`p-6 ${bg} rounded-full w-fit mx-auto mb-4 animate-float backdrop-blur-md`}
                  style={{ animationDelay: `${idx * 0.8}s` }}
                >
                  <span className={`text-3xl font-bold ${color}`}>
                    {number}
                  </span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">
                  {title}
                </h4>
                <p className="text-slate-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="container mx-auto px-4 py-16">
          <div
            className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl p-12 text-center animate-fadeUp backdrop-blur-md border border-slate-600"
            style={{ animationDuration: "1s" }}
          >
            <h3 className="text-4xl font-bold text-white mb-4 hero-text animate-float">
              Pronto a Proteggere i tuoi Server?
            </h3>
            <p className="text-slate-300 text-lg mb-8">
              Inizia subito con NGINX Shield
            </p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-3 inline-flex items-center justify-center transition-all duration-300 ease-in-out animate-pulseBtn hover:shadow-xl hover:shadow-red-500/25"
            >
              <Shield className="h-5 w-5 mr-2" />
              Accedi al Sistema
            </Button>
          </div>
        </div>

        {}
        <div className="container mx-auto px-4 py-8 border-t border-slate-700">
          <div className="flex items-center justify-center text-slate-400">
            <p className="flex items-center space-x-2">
              © {new Date().getFullYear()} MaxlonPlay
              <a
                href="https://github.com/MaxlonPlay"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link p-1 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 ml-2"
                title="GitHub MaxlonPlay"
              >
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              . Distribuito sotto la{" "}
              <a
                href="https://www.gnu.org/licenses/gpl-3.0.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:underline"
              >
                GNU General Public License v3.0
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
