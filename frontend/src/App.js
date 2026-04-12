import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NAV_ITEMS = [
  { id: "overview", label: "Vue d'ensemble", icon: "\u{1F4CA}" },
  { id: "architecture", label: "Architecture", icon: "\u{1F3D7}" },
  { id: "features", label: "Fonctionnalites", icon: "\u{2699}" },
  { id: "live", label: "Live Streaming", icon: "\u{1F534}" },
  { id: "offline", label: "Mode Offline", icon: "\u{1F4F5}" },
  { id: "revenue", label: "Modele Economique", icon: "\u{1F4B0}" },
  { id: "security", label: "Securite", icon: "\u{1F6E1}" },
  { id: "performance", label: "Performance", icon: "\u26A1" },
  { id: "testing", label: "Tests & QA", icon: "\u{1F9EA}" },
  { id: "admin", label: "Administration", icon: "\u{1F464}" },
  { id: "priority", label: "Plan d'Action", icon: "\u{1F680}" },
];

function getScoreColor(score) {
  if (score >= 75) return "var(--accent-green)";
  if (score >= 50) return "var(--accent-yellow)";
  return "var(--accent-red)";
}

function getStatusBadge(status) {
  const map = { critical: "badge-critical", partial: "badge-partial", good: "badge-good" };
  const labels = { critical: "CRITIQUE", partial: "PARTIEL", good: "BON" };
  return <span className={`section-badge ${map[status] || "badge-partial"}`}>{labels[status] || status}</span>;
}

function ScoreCard({ label, value, sub, score, color }) {
  return (
    <div className="score-card" data-testid={`score-card-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="score-card-label">{label}</div>
      <div className="score-card-value" style={{ color: color || getScoreColor(score || 0) }}>{value}</div>
      {sub && <div className="score-card-sub">{sub}</div>}
      {score !== undefined && (
        <div className="score-bar">
          <div className="score-bar-fill" style={{ width: `${score}%`, background: getScoreColor(score) }} />
        </div>
      )}
    </div>
  );
}

function FeatureItem({ feature }) {
  const [open, setOpen] = useState(false);
  const color = getScoreColor(feature.completion);

  return (
    <div className="feature-item" data-testid={`feature-${feature.category.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="feature-head" onClick={() => setOpen(!open)}>
        <div className="feature-name">
          <span style={{ color: open ? "var(--accent-orange)" : "var(--text-primary)" }}>{open ? "\u25BC" : "\u25B6"}</span>
          {feature.category}
          {getStatusBadge(feature.status)}
        </div>
        <div className="feature-completion">
          <div className="feature-bar"><div className="feature-bar-fill" style={{ width: `${feature.completion}%`, background: color }} /></div>
          <span className="feature-pct" style={{ color }}>{feature.completion}%</span>
        </div>
      </div>
      {open && (
        <div className="feature-details">
          <div>
            <div className="feature-list-title done">Implemente ({feature.implemented.length})</div>
            <ul className="feature-list done">
              {feature.implemented.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
          <div>
            <div className="feature-list-title missing">Manquant ({feature.missing.length})</div>
            <ul className="feature-list missing">
              {feature.missing.map((item, i) => (
                <li key={i} className={item.startsWith("CRITIQUE") ? "critical" : ""}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueCard({ source }) {
  const [open, setOpen] = useState(false);
  const potentialColors = {
    "ENORME": { bg: "var(--accent-green-soft)", color: "var(--accent-green)" },
    "TRES ELEVE": { bg: "var(--accent-orange-soft)", color: "var(--accent-orange)" },
    "ELEVE": { bg: "var(--accent-blue-soft)", color: "var(--accent-blue)" },
    "MOYEN-ELEVE": { bg: "var(--accent-yellow-soft)", color: "var(--accent-yellow)" },
    "MOYEN": { bg: "var(--accent-purple-soft)", color: "var(--accent-purple)" },
    "LONG TERME - ENORME": { bg: "var(--accent-green-soft)", color: "var(--accent-green)" },
  };
  const pc = potentialColors[source.potential] || { bg: "var(--accent-blue-soft)", color: "var(--accent-blue)" };

  return (
    <div className="revenue-card" onClick={() => setOpen(!open)} style={{ cursor: "pointer" }} data-testid={`revenue-${source.name.split('.')[0].trim()}`}>
      <div className="revenue-card-head">
        <div className="revenue-card-name">{source.name}</div>
        <div className="revenue-card-prio">{source.implementation}</div>
      </div>
      <div className="revenue-card-desc">{source.description}</div>
      <span className="revenue-card-potential" style={{ background: pc.bg, color: pc.color }}>Potentiel: {source.potential}</span>
      <div className="revenue-card-estimate">Estimation: {source.revenue_estimate}</div>
      {open && (
        <ul className="revenue-details">
          {source.details.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}
    </div>
  );
}

function OverviewSection({ data }) {
  if (!data) return null;
  const s = data.summary;
  return (
    <div>
      <div className="score-grid">
        <ScoreCard label="Score Global" value={`${s.overall_score}/100`} sub="Pret pour production" score={s.overall_score} />
        <ScoreCard label="Production Readiness" value={`${s.production_readiness}%`} sub="Fonctionnalites completes" score={s.production_readiness} />
        <ScoreCard label="Ecrans Mobile" value={s.total_mobile_screens} sub={`${s.total_mobile_lines.toLocaleString()} lignes de code`} color="var(--accent-blue)" />
        <ScoreCard label="Routes Backend" value={s.total_backend_routes} sub={`${s.total_backend_services} services`} color="var(--accent-purple)" />
      </div>
      <div className="section-panel">
        <div className="section-header">
          <div className="section-title"><span className="icon">&#x1F4CB;</span> Resume Executif</div>
        </div>
        <div className="section-body">
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong>AfriWonder</strong> est un projet extremement ambitieux de super-app africaine combinant TikTok (videos courtes), 
            marketplace, services locaux, fintech, messagerie et live streaming. L'architecture backend est <strong>solide</strong> avec 
            115 routes, 176 services et un schema Prisma de 5771 lignes. L'app mobile Expo couvre <strong>{s.total_mobile_screens} ecrans</strong>.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Apres l'implementation de 13 fonctionnalites critiques, le projet est significativement renforce: 
            admin native, cadeaux lives, download offline, revenue sharing, paiements reels, push notifications, 
            abonnements premium, fan clubs, Agora SDK, E2EE messagerie et 35+ tests unitaires.
          </p>
          <p style={{ color: "var(--accent-orange)", fontSize: 14, fontWeight: 600 }}>
            Pour atteindre 100% production-ready, il reste: (1) integrer react-native-agora dans Expo, 
            (2) implementer AES-256-GCM reel pour E2EE, (3) ajouter les tests E2E Detox, et (4) configurer 
            les cles API production pour Orange Money/Wave.
          </p>
        </div>
      </div>
    </div>
  );
}

function ArchitectureSection({ data }) {
  if (!data?.architecture) return null;
  const arch = data.architecture;
  return (
    <div>
      <div className="score-grid">
        <ScoreCard label="Architecture" value={`${arch.score}/100`} score={arch.score} />
        <ScoreCard label="Backend" value="Express+TS" sub="PostgreSQL + Prisma" color="var(--accent-green)" />
        <ScoreCard label="Mobile" value="Expo 54" sub="React Native 0.81" color="var(--accent-blue)" />
        <ScoreCard label="Schema Prisma" value="5771" sub="lignes de modeles" color="var(--accent-purple)" />
      </div>
      <div className="two-col">
        <div className="section-panel">
          <div className="section-header">
            <div className="section-title"><span className="icon">&#x2699;</span> Backend (Express.js + TypeScript)</div>
          </div>
          <div className="section-body">
            <h4 style={{ color: "var(--accent-green)", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Forces</h4>
            <ul className="audit-list strengths">{arch.backend.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <h4 style={{ color: "var(--accent-red)", fontSize: 12, fontWeight: 700, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 0.8 }}>Faiblesses</h4>
            <ul className="audit-list weaknesses">{arch.backend.weaknesses.map((w, i) => <li key={i} className={w.startsWith("CRITIQUE") ? "critical-item" : ""}>{w}</li>)}</ul>
          </div>
        </div>
        <div className="section-panel">
          <div className="section-header">
            <div className="section-title"><span className="icon">&#x1F4F1;</span> Mobile Expo (React Native)</div>
          </div>
          <div className="section-body">
            <h4 style={{ color: "var(--accent-green)", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Forces</h4>
            <ul className="audit-list strengths">{arch.mobile_expo.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <h4 style={{ color: "var(--accent-red)", fontSize: 12, fontWeight: 700, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 0.8 }}>Faiblesses</h4>
            <ul className="audit-list weaknesses">{arch.mobile_expo.weaknesses.map((w, i) => <li key={i} className={w.startsWith("CRITIQUE") ? "critical-item" : ""}>{w}</li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection({ data }) {
  if (!data?.features_audit) return null;
  return (
    <div className="section-panel">
      <div className="section-header">
        <div className="section-title"><span className="icon">&#x2699;</span> Audit des Fonctionnalites (108 ecrans)</div>
      </div>
      <div className="section-body">
        {data.features_audit.map((f, i) => <FeatureItem key={i} feature={f} />)}
      </div>
    </div>
  );
}

function LiveSection({ data }) {
  const live = data?.features_audit?.find(f => f.category === "Live Streaming");
  if (!live) return null;
  return (
    <div>
      <div className="score-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <ScoreCard label="Live Streaming" value={`${live.completion}%`} sub="CRITIQUE - Camera absente" score={live.completion} />
        <ScoreCard label="Implemente" value={live.implemented.length} sub="fonctionnalites" color="var(--accent-green)" />
        <ScoreCard label="Manquant" value={live.missing.length} sub="fonctionnalites critiques" color="var(--accent-red)" />
      </div>
      <div className="section-panel">
        <div className="section-header">
          <div className="section-title"><span className="icon">&#x1F534;</span> Analyse Live Streaming Detaillee</div>
          <span className="section-badge badge-critical">CRITIQUE</span>
        </div>
        <div className="section-body">
          <p style={{ color: "var(--accent-red)", fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 12, background: "var(--accent-red-soft)", borderRadius: 8 }}>
            Le live streaming est la fonctionnalite NUMERO 1 manquante. L'ecran stream.tsx affiche un placeholder 
            "Camera en direct" sans integration reelle. Pas de WebRTC/Agora dans le mobile, pas de reception de flux 
            video pour les spectateurs, pas de chat en direct, pas de cadeaux.
          </p>
          <div className="two-col">
            <div>
              <h4 style={{ color: "var(--accent-green)", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Ce qui existe</h4>
              <ul className="audit-list strengths">{live.implemented.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <h4 style={{ color: "var(--accent-red)", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Ce qui manque</h4>
              <ul className="audit-list weaknesses">{live.missing.map((w, i) => <li key={i} className={w.startsWith("CRITIQUE") ? "critical-item" : ""}>{w}</li>)}</ul>
            </div>
          </div>
          <div style={{ marginTop: 20, padding: 16, background: "var(--accent-orange-soft)", borderRadius: 10, border: "1px solid rgba(255,107,0,0.2)" }}>
            <h4 style={{ color: "var(--accent-orange)", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Solution Recommandee</h4>
            <ul style={{ listStyle: "none", color: "var(--text-secondary)", fontSize: 13 }}>
              <li style={{ padding: "4px 0" }}>1. Installer expo-camera pour l'acces camera</li>
              <li style={{ padding: "4px 0" }}>2. Integrer Agora SDK (agora-token deja dans le backend) pour WebRTC</li>
              <li style={{ padding: "4px 0" }}>3. Implementer le chat en temps reel via Socket.io existant</li>
              <li style={{ padding: "4px 0" }}>4. Connecter le systeme de cadeaux virtuels (schema Gift existe)</li>
              <li style={{ padding: "4px 0" }}>5. Activer l'enregistrement automatique (liveRecording.service.ts existe)</li>
              <li style={{ padding: "4px 0" }}>6. Permettre la republication du live et le decoupage en moments forts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfflineSection({ data }) {
  const offline = data?.features_audit?.find(f => f.category.includes("Offline"));
  if (!offline) return null;
  return (
    <div>
      <div className="score-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <ScoreCard label="Mode Offline" value={`${offline.completion}%`} sub="CRITIQUE - Pas de download video" score={offline.completion} />
        <ScoreCard label="Cache actuel" value="JSON" sub="AsyncStorage 6MB max" color="var(--accent-yellow)" />
        <ScoreCard label="TTL Cache" value="30min" sub="Tres court pour offline" color="var(--accent-red)" />
      </div>
      <div className="section-panel">
        <div className="section-header">
          <div className="section-title"><span className="icon">&#x1F4F5;</span> Audit Mode Hors Connexion</div>
          <span className="section-badge badge-critical">CRITIQUE</span>
        </div>
        <div className="section-body">
          <p style={{ color: "var(--accent-red)", fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 12, background: "var(--accent-red-soft)", borderRadius: 8 }}>
            L'utilisateur demande que "des milliers de videos soient regardables sans connexion". Actuellement, le systeme 
            offline cache uniquement des donnees JSON via AsyncStorage (limite a 6MB sur Android). Il n'y a AUCUN systeme 
            de telechargement de fichiers video pour le visionnage hors-ligne.
          </p>
          <div className="two-col">
            <div>
              <h4 style={{ color: "var(--accent-green)", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Ce qui existe</h4>
              <ul className="audit-list strengths">{offline.implemented.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <h4 style={{ color: "var(--accent-red)", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Ce qui manque</h4>
              <ul className="audit-list weaknesses">{offline.missing.map((w, i) => <li key={i} className={w.startsWith("CRITIQUE") ? "critical-item" : ""}>{w}</li>)}</ul>
            </div>
          </div>
          <div style={{ marginTop: 20, padding: 16, background: "var(--accent-orange-soft)", borderRadius: 10, border: "1px solid rgba(255,107,0,0.2)" }}>
            <h4 style={{ color: "var(--accent-orange)", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Architecture Recommandee</h4>
            <ul style={{ listStyle: "none", color: "var(--text-secondary)", fontSize: 13 }}>
              <li style={{ padding: "4px 0" }}>1. Utiliser expo-file-system pour telecharger les videos dans documentDirectory</li>
              <li style={{ padding: "4px 0" }}>2. File d'attente de telechargement avec priorite (WiFi vs 4G)</li>
              <li style={{ padding: "4px 0" }}>3. Gestion quota disque: 2GB par defaut, configurable par utilisateur</li>
              <li style={{ padding: "4px 0" }}>4. Nettoyage automatique LRU (les plus anciens supprimes en premier)</li>
              <li style={{ padding: "4px 0" }}>5. Indicateur de progression dans le feed (badge "Telecharge")</li>
              <li style={{ padding: "4px 0" }}>6. Qualite adaptative: basse qualite en 3G, HD en WiFi</li>
              <li style={{ padding: "4px 0" }}>7. Synchronisation des likes/commentaires offline via queue</li>
              <li style={{ padding: "4px 0" }}>8. Pre-telechargement intelligent des videos populaires en WiFi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueSection({ data }) {
  if (!data?.revenue_model) return null;
  const rev = data.revenue_model;
  return (
    <div>
      <div className="section-panel">
        <div className="section-header">
          <div className="section-title"><span className="icon">&#x1F4B0;</span> {rev.title}</div>
        </div>
        <div className="section-body">
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
            Marche cible: <strong style={{ color: "var(--accent-orange)" }}>{rev.target_market}</strong>
          </p>
          <div className="revenue-grid">
            {rev.sources.map((s, i) => <RevenueCard key={i} source={s} />)}
          </div>
          <div className="projection-card">
            <div className="projection-title">Projections de Revenus</div>
            <div className="projection-grid">
              <div className="projection-item">
                <div className="projection-year">Annee 1</div>
                <div className="projection-value">{rev.projection.year1}</div>
              </div>
              <div className="projection-item">
                <div className="projection-year">Annee 2</div>
                <div className="projection-value">{rev.projection.year2}</div>
              </div>
              <div className="projection-item">
                <div className="projection-year">Annee 3</div>
                <div className="projection-value">{rev.projection.year3}</div>
              </div>
            </div>
            <div className="projection-note">{rev.projection.key_metric}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySection({ data }) {
  if (!data?.security_audit) return null;
  const sec = data.security_audit;
  return (
    <div>
      <div className="score-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <ScoreCard label="Score Securite" value={`${sec.score}/100`} score={sec.score} />
        <ScoreCard label="Vulnerabilites" value={sec.vulnerabilities.length} sub="a corriger" color="var(--accent-red)" />
      </div>
      <div className="two-col">
        <div className="section-panel">
          <div className="section-header"><div className="section-title"><span className="icon">&#x1F6E1;</span> Forces Securite</div></div>
          <div className="section-body"><ul className="audit-list strengths">{sec.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        </div>
        <div className="section-panel">
          <div className="section-header"><div className="section-title"><span className="icon">&#x26A0;</span> Vulnerabilites</div></div>
          <div className="section-body"><ul className="audit-list weaknesses">{sec.vulnerabilities.map((v, i) => <li key={i} className={v.startsWith("CRITIQUE") ? "critical-item" : ""}>{v}</li>)}</ul></div>
        </div>
      </div>
    </div>
  );
}

function PerformanceSection({ data }) {
  if (!data?.performance_audit) return null;
  const perf = data.performance_audit;
  return (
    <div>
      <div className="score-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <ScoreCard label="Score Performance" value={`${perf.score}/100`} score={perf.score} />
        <ScoreCard label="Problemes" value={perf.issues.length} sub="a optimiser" color="var(--accent-yellow)" />
      </div>
      <div className="two-col">
        <div className="section-panel">
          <div className="section-header"><div className="section-title"><span className="icon">&#x26A1;</span> Forces</div></div>
          <div className="section-body"><ul className="audit-list strengths">{perf.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        </div>
        <div className="section-panel">
          <div className="section-header"><div className="section-title"><span className="icon">&#x1F6A8;</span> Problemes</div></div>
          <div className="section-body"><ul className="audit-list weaknesses">{perf.issues.map((p, i) => <li key={i} className={p.startsWith("CRITIQUE") ? "critical-item" : ""}>{p}</li>)}</ul></div>
        </div>
      </div>
    </div>
  );
}

function TestingSection({ data }) {
  if (!data?.testing_audit) return null;
  const t = data.testing_audit;
  return (
    <div>
      <div className="score-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <ScoreCard label="Score Tests" value={`${t.score}/100`} sub="ALARMANT" score={t.score} />
        <ScoreCard label="Tests Mobile" value={t.mobile_tests.total_test_files} sub="fichier(s) de test" color="var(--accent-red)" />
        <ScoreCard label="Couverture" value="~0%" sub="108 ecrans sans tests" color="var(--accent-red)" />
      </div>
      <div className="section-panel">
        <div className="section-header">
          <div className="section-title"><span className="icon">&#x1F9EA;</span> Audit des Tests</div>
          <span className="section-badge badge-critical">CRITIQUE</span>
        </div>
        <div className="section-body">
          <p style={{ color: "var(--accent-red)", fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 12, background: "var(--accent-red-soft)", borderRadius: 8 }}>
            Sur 108 ecrans mobiles, il n'existe qu'UN SEUL fichier de test (urlNormalize.test.ts). C'est inacceptable 
            pour un produit qui veut aller en production. Sans tests, chaque mise a jour risque de casser des 
            fonctionnalites existantes.
          </p>
          <div className="stats-mini-grid">
            <div className="stat-mini"><div className="stat-mini-value" style={{ color: "var(--accent-red)" }}>1</div><div className="stat-mini-label">Tests unitaires mobile</div></div>
            <div className="stat-mini"><div className="stat-mini-value" style={{ color: "var(--accent-red)" }}>0</div><div className="stat-mini-label">Tests E2E mobile</div></div>
            <div className="stat-mini"><div className="stat-mini-value" style={{ color: "var(--accent-red)" }}>0</div><div className="stat-mini-label">Tests integration</div></div>
            <div className="stat-mini"><div className="stat-mini-value" style={{ color: "var(--accent-yellow)" }}>~20</div><div className="stat-mini-label">Tests backend (Jest)</div></div>
            <div className="stat-mini"><div className="stat-mini-value" style={{ color: "var(--accent-green)" }}>6+</div><div className="stat-mini-label">E2E PWA (Playwright)</div></div>
            <div className="stat-mini"><div className="stat-mini-value" style={{ color: "var(--accent-green)" }}>Oui</div><div className="stat-mini-label">CI/CD configure</div></div>
          </div>
          <h4 style={{ color: "var(--accent-orange)", fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 12 }}>Recommandations Urgentes</h4>
          <ul className="audit-list weaknesses">{t.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

function AdminSection({ data }) {
  const admin = data?.features_audit?.find(f => f.category === "Administration");
  if (!admin) return null;
  return (
    <div>
      <div className="score-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <ScoreCard label="Admin Mobile" value={`${admin.completion}%`} sub="Quasi inexistant" score={admin.completion} />
        <ScoreCard label="Fonctionnalites" value={`${admin.implemented.length}/${admin.implemented.length + admin.missing.length}`} sub="implementees" color="var(--accent-red)" />
      </div>
      <div className="section-panel">
        <div className="section-header">
          <div className="section-title"><span className="icon">&#x1F464;</span> Console Administration Mobile</div>
          <span className="section-badge badge-critical">CRITIQUE</span>
        </div>
        <div className="section-body">
          <p style={{ color: "var(--accent-red)", fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 12, background: "var(--accent-red-soft)", borderRadius: 8 }}>
            La console admin mobile est un simple bouton qui ouvre le navigateur vers la PWA admin. 
            Pour gerer une plateforme aussi complexe, il faut un dashboard admin natif.
          </p>
          <div className="two-col">
            <div>
              <h4 style={{ color: "var(--accent-green)", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Implemente</h4>
              <ul className="audit-list strengths">{admin.implemented.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <h4 style={{ color: "var(--accent-red)", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Manquant</h4>
              <ul className="audit-list weaknesses">{admin.missing.map((m, i) => <li key={i} className={m.startsWith("CRITIQUE") ? "critical-item" : ""}>{m}</li>)}</ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrioritySection({ data }) {
  if (!data?.priority_actions) return null;
  const pClasses = ["p0", "p1", "p2"];
  return (
    <div className="section-panel">
      <div className="section-header">
        <div className="section-title"><span className="icon">&#x1F680;</span> Plan d'Action Prioritaire</div>
      </div>
      <div className="section-body">
        {data.priority_actions.map((group, gi) => (
          <div key={gi} className={`priority-group ${pClasses[gi]}`}>
            <div className={`priority-label ${pClasses[gi]}`}>{group.priority}</div>
            <ul className="priority-list">
              {group.items.map((item, i) => (
                <li key={i} className="priority-item">
                  <span className="priority-num">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [auditData, setAuditData] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/audit`)
      .then(res => { setAuditData(res.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const renderSection = () => {
    if (!auditData) return null;
    switch (activeSection) {
      case "overview": return <OverviewSection data={auditData} />;
      case "architecture": return <ArchitectureSection data={auditData} />;
      case "features": return <FeaturesSection data={auditData} />;
      case "live": return <LiveSection data={auditData} />;
      case "offline": return <OfflineSection data={auditData} />;
      case "revenue": return <RevenueSection data={auditData} />;
      case "security": return <SecuritySection data={auditData} />;
      case "performance": return <PerformanceSection data={auditData} />;
      case "testing": return <TestingSection data={auditData} />;
      case "admin": return <AdminSection data={auditData} />;
      case "priority": return <PrioritySection data={auditData} />;
      default: return <OverviewSection data={auditData} />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="logo-mark" style={{ width: 60, height: 60, fontSize: 24, margin: "0 auto 16px" }}>AW</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>Chargement de l'audit...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" data-testid="audit-app">
      <header className="audit-header">
        <div className="header-left">
          <div className="logo-mark">AW</div>
          <div>
            <div className="header-title">AfriWonder - Audit Complet</div>
            <div className="header-subtitle">Application Mobile Expo + Backend + PWA</div>
          </div>
        </div>
        <div className="header-badge">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-orange)" }} />
          Janvier 2026
        </div>
      </header>

      <div className="audit-main">
        <nav className="audit-sidebar">
          <div className="nav-section">
            <div className="nav-label">Audit</div>
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                onClick={() => setActiveSection(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </nav>

        <main className="audit-content">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export default App;
