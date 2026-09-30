import React, { useEffect, useRef, useState } from 'react';
import { FPSGame, GameStats } from './game/fpsGame';
import { sound } from './game/audio';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Zap,
  Download,
  ShieldAlert,
  MapPin,
  Users,
} from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FPSGame | null>(null);

  const [hasStarted, setHasStarted] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [stats, setStats] = useState<GameStats>({
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    isReloading: false,
    reloadProgress: 0,
    isADS: false,
    hitmarkerActive: false,
    damageVignette: false,
    isGameOver: false,
    killstreak: 0,
    recentKillText: '',
    currentZone: 'MITE Main Gate',
  });

  // Initialize Game Engine on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const game = new FPSGame(containerRef.current, {
      onStatsUpdate: (newStats) => setStats(newStats),
      onPointerLockChange: (locked) => setIsPointerLocked(locked),
    });
    gameRef.current = game;

    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // Update Mini-map / Radar canvas with authentic MITE campus landmarks & roads
  useEffect(() => {
    if (!radarCanvasRef.current || !gameRef.current) return;
    const canvas = radarCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sweepAngle = 0;

    const renderRadar = () => {
      if (!gameRef.current) return;
      const data = gameRef.current.getRadarData();
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = (w / 2) / (data.bounds * 1.08);

      ctx.clearRect(0, 0, w, h);

      // Radar background circle
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // Radar range rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, (w / 2 - 2) * 0.35, 0, Math.PI * 2);
      ctx.arc(cx, cy, (w / 2 - 2) * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // MITE Roadways
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Road from Main Gate -> Temple -> PG Block -> Food Court
      ctx.beginPath();
      ctx.moveTo(cx + 80 * scale, cy + 10 * scale); // Main Gate
      ctx.lineTo(cx + 20 * scale, cy + 8 * scale);
      ctx.lineTo(cx + -8 * scale, cy + 2 * scale);  // Ganapati Temple
      ctx.lineTo(cx + -40 * scale, cy + 25 * scale); // PG Block road
      ctx.lineTo(cx + -22 * scale, cy + 76 * scale); // Food Court
      ctx.stroke();

      // Road towards Greenery & Sports Court
      ctx.beginPath();
      ctx.moveTo(cx + 20 * scale, cy + 8 * scale);
      ctx.lineTo(cx + 12 * scale, cy + -32 * scale); // Sports Court
      ctx.lineTo(cx + -32 * scale, cy + -58 * scale); // Greenery
      ctx.stroke();

      // MITE Campus Landmark markers
      data.landmarks.forEach((lm) => {
        const lx = cx + lm.x * scale;
        const ly = cy + lm.z * scale;

        let lmColor = '#38bdf8';
        if (lm.name.includes('Main Gate')) lmColor = '#f59e0b';
        else if (lm.name.includes('Temple')) lmColor = '#fbbf24';
        else if (lm.name.includes('Food Court')) lmColor = '#f97316';
        else if (lm.name.includes('Sports')) lmColor = '#0284c7';
        else if (lm.name.includes('Greenery')) lmColor = '#10b981';

        ctx.fillStyle = lmColor;
        ctx.beginPath();
        ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lm.label, lx, ly - 5);
      });

      // Radar Sweep
      sweepAngle += 0.035;
      const sweepX = cx + Math.cos(sweepAngle) * (w / 2 - 4);
      const sweepY = cy + Math.sin(sweepAngle) * (w / 2 - 4);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // Rival Enemies (Red blips)
      data.enemies.forEach((enemy) => {
        if (enemy.isDying) return;
        const ex = cx + enemy.x * scale;
        const ey = cy + enemy.z * scale;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ex, ey, 6.0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Player Arrow (Bright Cyan)
      const px = cx + data.player.x * scale;
      const py = cy + data.player.z * scale;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-data.player.yaw);

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(renderRadar);
    };

    renderRadar();
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleStartGame = () => {
    setHasStarted(true);
    gameRef.current?.requestPointerLock();
  };

  const handleRespawn = () => {
    gameRef.current?.respawnGame();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const handleDownloadStandalone = () => {
    const singleFileHtml = generateStandaloneHtml();
    const blob = new Blob([singleFileHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campus_clash_mite.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Red Damage Vignette */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${
          stats.damageVignette ? 'opacity-85' : 'opacity-0'
        }`}
        style={{
          boxShadow: 'inset 0 0 100px 45px rgba(220, 38, 38, 0.75)',
        }}
      />

      {/* Top Header Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3 bg-slate-950/70 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center font-display font-bold text-white shadow-md text-xs">
            MITE
          </div>
          <div>
            <h1 className="font-display font-bold text-sm text-white tracking-wider leading-none">
              CAMPUS CLASH · MITE
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              MANGALORE INSTITUTE OF TECHNOLOGY AND ENGINEERING
            </p>
          </div>
        </div>

        {/* Current Campus Zone Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs text-amber-300 font-medium">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>{stats.currentZone}</span>
        </div>

        {/* Quick controls hint in top bar */}
        <div className="hidden xl:flex items-center gap-4 text-xs text-slate-300 font-mono">
          <span>WASD: Move</span>
          <span className="text-slate-600">·</span>
          <span>Shift: Sprint</span>
          <span className="text-slate-600">·</span>
          <span>Space: Jump</span>
          <span className="text-slate-600">·</span>
          <span>LMB: Shoot</span>
          <span className="text-slate-600">·</span>
          <span>RMB: ADS Zoom</span>
          <span className="text-slate-600">·</span>
          <span>R: Reload</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadStandalone}
            title="Download Standalone Single-File HTML"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Standalone .html</span>
          </button>
          <button
            onClick={handleToggleMute}
            className="p-1.5 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-md transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Fixed Crosshair in Center of Screen */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Center Red Dot */}
          <div
            className={`rounded-full transition-transform duration-100 ${
              stats.isADS ? 'w-1 h-1 bg-red-400' : 'w-1.5 h-1.5 bg-red-500 shadow-[0_0_8px_#ef4444]'
            }`}
          />

          {!stats.isADS && (
            <>
              <div className="absolute -top-3 w-0.5 h-2 bg-white/80 rounded-full" />
              <div className="absolute -bottom-3 w-0.5 h-2 bg-white/80 rounded-full" />
              <div className="absolute -left-3 h-0.5 w-2 bg-white/80 rounded-full" />
              <div className="absolute -right-3 h-0.5 w-2 bg-white/80 rounded-full" />
            </>
          )}

          {stats.hitmarkerActive && (
            <div className="absolute w-6 h-6 animate-ping">
              <div className="absolute inset-0 border-2 border-red-500 rotate-45 scale-90" />
            </div>
          )}
        </div>
      </div>

      {/* In-Game HUD Overlays */}
      {hasStarted && !stats.isGameOver && (
        <div className="pointer-events-none absolute inset-0 z-10 p-6 pt-16 flex flex-col justify-between">
          {/* Top HUD Row */}
          <div className="flex items-start justify-between">
            {/* Health Bar (100 HP) */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 p-3.5 rounded-xl shadow-xl w-64">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  Health
                </span>
                <span className="font-display font-bold text-lg tabular-nums text-white">
                  {stats.health} <span className="text-xs text-slate-500 font-sans">/ 100</span>
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    stats.health > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                      : stats.health > 25
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-red-600 to-red-400 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(0, stats.health)}%` }}
                />
              </div>
            </div>

            {/* Score & Kill Streak in Center */}
            <div className="flex flex-col items-center">
              <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 px-6 py-2 rounded-xl shadow-xl flex items-center gap-6">
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score</div>
                  <div className="font-display font-extrabold text-2xl text-amber-400 tabular-nums">
                    {stats.score}
                  </div>
                </div>
                <div className="w-px h-8 bg-white/15" />
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Eliminations</div>
                  <div className="font-display font-extrabold text-2xl text-red-400 tabular-nums">
                    {stats.kills}
                  </div>
                </div>
              </div>

              {stats.recentKillText && (
                <div className="mt-3 px-4 py-1.5 bg-red-600/90 border border-red-400 text-white font-display font-bold text-sm tracking-wider rounded-lg shadow-lg animate-bounce">
                  {stats.recentKillText}
                </div>
              )}
            </div>

            {/* MITE Campus Radar in Top-Right */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                <MapPin className="w-3 h-3 text-amber-400" />
                MITE Campus Map
              </div>
              <canvas
                ref={radarCanvasRef}
                width={130}
                height={130}
                className="rounded-full border border-white/15 shadow-inner"
              />
            </div>
          </div>

          {/* Bottom HUD Row: Ammo & Gun Status */}
          <div className="flex items-end justify-between">
            <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-lg text-xs font-mono text-slate-300 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Rival Characters Active: 7</span>
              <span className="text-slate-600">·</span>
              {stats.isADS ? (
                <span className="text-amber-400 font-semibold">ADS SCOPE LOCKED</span>
              ) : (
                <span>RMB TO AIM DOWN SIGHTS</span>
              )}
            </div>

            {/* Ammo Counter */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 px-5 py-3 rounded-xl shadow-xl flex items-center gap-4">
              {stats.isReloading ? (
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-5 h-5 text-amber-400 animate-spin" />
                  <div>
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">RELOADING...</div>
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-75"
                        style={{ width: `${stats.reloadProgress * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-display font-extrabold text-4xl tabular-nums ${
                      stats.ammo <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
                    }`}
                  >
                    {stats.ammo}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ {stats.maxAmmo}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 ml-1">
                    ROUNDS
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Screen Overlay */}
      {!hasStarted && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-white/15 rounded-2xl p-8 shadow-2xl text-center">
            {/* Campus Header Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>MANGALORE INSTITUTE OF TECHNOLOGY AND ENGINEERING</span>
            </div>

            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-wide mb-1">
              CAMPUS CLASH
            </h2>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
              MITE CAMPUS ARENA (200M EXPANSIVE BATTLEGROUND)
            </p>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-md mx-auto">
              Explore the authentic MITE campus layout: Iconic Yellow Curved Main Gate, Ganapati Temple, PG Block, Food Court pavilion, Sports Court, and Botanical Greenery. Face off against fully animated 3D rival characters!
            </p>

            {/* Campus Landmark Features */}
            <div className="grid grid-cols-3 gap-2 mb-6 text-left text-xs">
              <div className="p-2 bg-slate-800/60 rounded-lg border border-white/5">
                <span className="font-bold text-amber-400 block">Yellow Main Gate</span>
                <span className="text-slate-400 text-[10px]">Iconic curved entry</span>
              </div>
              <div className="p-2 bg-slate-800/60 rounded-lg border border-white/5">
                <span className="font-bold text-amber-400 block">Ganapati Temple</span>
                <span className="text-slate-400 text-[10px]">Sacred tile shikhara</span>
              </div>
              <div className="p-2 bg-slate-800/60 rounded-lg border border-white/5">
                <span className="font-bold text-amber-400 block">MITE Food Court</span>
                <span className="text-slate-400 text-[10px]">Covered dining patio</span>
              </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-2 gap-2 text-left mb-6 text-xs">
              <div className="p-2 bg-slate-850 rounded-lg border border-white/5">
                <span className="font-bold text-white font-mono">W, A, S, D</span>
                <span className="text-slate-400 block text-[11px]">Move through Campus</span>
              </div>
              <div className="p-2 bg-slate-850 rounded-lg border border-white/5">
                <span className="font-bold text-white font-mono">Mouse</span>
                <span className="text-slate-400 block text-[11px]">360° Aim (Pointer Lock)</span>
              </div>
              <div className="p-2 bg-slate-850 rounded-lg border border-white/5">
                <span className="font-bold text-white font-mono">Shift + W</span>
                <span className="text-slate-400 block text-[11px]">Sprint across Roadways</span>
              </div>
              <div className="p-2 bg-slate-850 rounded-lg border border-white/5">
                <span className="font-bold text-white font-mono">Right Click</span>
                <span className="text-slate-400 block text-[11px]">Aim Down Sights (ADS)</span>
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-display font-extrabold text-base sm:text-lg tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              ENTER MITE CAMPUS & CLASH
            </button>
            <p className="text-[11px] text-slate-500 mt-3 font-mono">
              Press [ESC] at any time to release mouse pointer
            </p>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {stats.isGameOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-red-950/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-600/20 border border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="font-display font-extrabold text-4xl text-white tracking-wide mb-1">
              GAME OVER
            </h2>
            <p className="text-red-300 text-xs font-semibold mb-6">OVERWHELMED ON CAMPUS GROUNDS</p>

            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950/70 border border-white/10 rounded-xl mb-6 text-center">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Final Score</div>
                <div className="font-display font-bold text-xl text-amber-400">{stats.score}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Rivals Down</div>
                <div className="font-display font-bold text-xl text-red-400">{stats.kills}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</div>
                <div className="font-display font-bold text-xl text-cyan-400">{accuracy}%</div>
              </div>
            </div>

            <button
              onClick={handleRespawn}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-display font-extrabold text-base tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              CLICK TO RESPAWN AT MAIN GATE
            </button>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {hasStarted && !isPointerLocked && !stats.isGameOver && (
        <div
          onClick={() => gameRef.current?.requestPointerLock()}
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm cursor-pointer"
        >
          <div className="p-6 bg-slate-900/90 border border-white/15 rounded-xl text-center shadow-2xl">
            <h3 className="font-display font-bold text-2xl text-white mb-2">GAME PAUSED</h3>
            <p className="text-slate-400 text-xs mb-4">Click anywhere to re-engage mouse pointer</p>
            <div className="px-5 py-2.5 bg-white/15 text-white font-semibold rounded-lg text-sm inline-block">
              CLICK TO RESUME
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone Single-File HTML Generator updated with MITE Campus & 3D Humanoid Characters
function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Campus Clash - MITE Campus Edition (College.io)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #020617; font-family: system-ui, -apple-system, sans-serif; color: #f8fafc; }
    #canvas-container { position: absolute; inset: 0; width: 100%; height: 100%; cursor: crosshair; }
    #crosshair { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 10; display: flex; align-items: center; justify-content: center; }
    #crosshair .dot { width: 6px; height: 6px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 8px #ef4444; }
    #crosshair .tick { position: absolute; background: rgba(255, 255, 255, 0.85); border-radius: 2px; }
    #crosshair .tick-top { top: -14px; width: 2px; height: 8px; }
    #crosshair .tick-bottom { bottom: -14px; width: 2px; height: 8px; }
    #crosshair .tick-left { left: -14px; height: 2px; width: 8px; }
    #crosshair .tick-right { right: -14px; height: 2px; width: 8px; }
    #hitmarker { position: absolute; width: 24px; height: 24px; display: none; }
    #hitmarker::before, #hitmarker::after { content: ''; position: absolute; top: 50%; left: 50%; width: 18px; height: 2px; background: #ef4444; }
    #hitmarker::before { transform: translate(-50%, -50%) rotate(45deg); }
    #hitmarker::after { transform: translate(-50%, -50%) rotate(-45deg); }
    #vignette { position: absolute; inset: 0; pointer-events: none; z-index: 9; opacity: 0; transition: opacity 0.15s; box-shadow: inset 0 0 100px 45px rgba(220, 38, 38, 0.75); }
    #hud { position: absolute; inset: 0; pointer-events: none; z-index: 10; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; }
    .hud-box { background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); padding: 12px 18px; border-radius: 12px; backdrop-filter: blur(8px); }
    .hp-bar-bg { width: 180px; height: 10px; background: #1e293b; border-radius: 6px; overflow: hidden; margin-top: 6px; }
    #hp-bar { width: 100%; height: 100%; background: linear-gradient(90deg, #10b981, #22c55e); transition: width 0.15s ease; }
    .overlay { position: absolute; inset: 0; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 30; }
    .dialog { background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px; padding: 32px; max-width: 520px; width: 92%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
    .btn { display: block; width: 100%; padding: 16px; margin-top: 20px; background: linear-gradient(135deg, #f59e0b, #ef4444); border: none; border-radius: 12px; color: white; font-weight: 800; font-size: 15px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
    .btn:hover { filter: brightness(1.1); }
    .controls-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; text-align: left; font-size: 12px; }
    .ctrl-item { background: #1e293b; padding: 8px 12px; border-radius: 8px; }
    .ctrl-item strong { color: #f59e0b; }
    .ctrl-item span { display: block; font-size: 11px; color: #94a3b8; }
  </style>
  <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
</head>
<body>
  <div id="canvas-container"></div>
  <div id="vignette"></div>

  <div id="crosshair">
    <div class="dot"></div>
    <div class="tick tick-top"></div>
    <div class="tick tick-bottom"></div>
    <div class="tick tick-left"></div>
    <div class="tick tick-right"></div>
    <div id="hitmarker"></div>
  </div>

  <div id="hud" style="display:none;">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div class="hud-box">
        <div style="font-size:11px; color:#94a3b8; font-weight:700;">HEALTH</div>
        <div style="font-size:24px; font-weight:800;" id="hp-text">100 / 100</div>
        <div class="hp-bar-bg"><div id="hp-bar"></div></div>
      </div>
      <div class="hud-box" style="text-align:center; display:flex; gap:20px;">
        <div>
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">SCORE</div>
          <div style="font-size:28px; font-weight:800; color:#f59e0b;" id="score-text">0</div>
        </div>
        <div style="width:1px; background:rgba(255,255,255,0.15);"></div>
        <div>
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">ELIMINATIONS</div>
          <div style="font-size:28px; font-weight:800; color:#ef4444;" id="kills-text">0</div>
        </div>
      </div>
    </div>
    <div style="display:flex; justify-content:flex-end;">
      <div class="hud-box" style="text-align:right;">
        <div style="font-size:11px; color:#94a3b8; font-weight:700;" id="ammo-label">AMMO</div>
        <div style="font-size:32px; font-weight:800;" id="ammo-text">30 / 30</div>
      </div>
    </div>
  </div>

  <div id="start-screen" class="overlay">
    <div class="dialog">
      <div style="font-size:11px; font-weight:700; color:#f59e0b; letter-spacing:1px; margin-bottom:4px;">MANGALORE INSTITUTE OF TECHNOLOGY AND ENGINEERING</div>
      <h1 style="font-size:30px; margin-bottom:6px;">CAMPUS CLASH</h1>
      <p style="color:#94a3b8; font-size:13px;">Expansive 200M MITE Campus Map with Animated Humanoid Rivals!</p>
      <div class="controls-grid">
        <div class="ctrl-item"><strong>W A S D</strong><span>Move through Campus</span></div>
        <div class="ctrl-item"><strong>Mouse</strong><span>360° Aim (Pointer Lock)</span></div>
        <div class="ctrl-item"><strong>Shift + W</strong><span>Sprint Roadways</span></div>
        <div class="ctrl-item"><strong>Spacebar</strong><span>Jump Obstacles</span></div>
        <div class="ctrl-item"><strong>Left Click</strong><span>Shoot Weapon (Hitscan)</span></div>
        <div class="ctrl-item"><strong>Right Click</strong><span>Aim Down Sights (ADS)</span></div>
      </div>
      <button class="btn" id="start-btn">Welcome to Campus Clash! Click here to play</button>
    </div>
  </div>

  <div id="gameover-screen" class="overlay" style="display:none;">
    <div class="dialog" style="border-color:#ef4444;">
      <h1 style="font-size:36px; color:#ef4444; margin-bottom:8px;">GAME OVER</h1>
      <p style="color:#cbd5e1; font-size:16px;" id="gameover-summary">Final Score: 0</p>
      <button class="btn" id="respawn-btn">Game Over - Click to Respawn</button>
    </div>
  </div>

  <script>
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playShootSound() {
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.13);
      } catch(e) {}
    }
    function playHitSound() {
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.08);
      } catch(e) {}
    }

    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7dd3fc);
    scene.fog = new THREE.FogExp2(0x7dd3fc, 0.006);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Light
    const hemi = new THREE.HemisphereLight(0xffffff, 0x2e7d32, 0.85);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff7ed, 1.3);
    sun.position.set(60, 80, 40);
    sun.castShadow = true;
    scene.add(sun);

    // Ground 220x220m
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ color: 0x4d7c0f }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Roads
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const r1 = new THREE.Mesh(new THREE.PlaneGeometry(68, 9), roadMat);
    r1.rotation.x = -Math.PI / 2; r1.position.set(52, 0.02, 10); scene.add(r1);
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(48, 9), roadMat);
    r2.rotation.x = -Math.PI / 2; r2.position.set(0, 0.02, 5); scene.add(r2);
    const r3 = new THREE.Mesh(new THREE.PlaneGeometry(9, 45), roadMat);
    r3.rotation.x = -Math.PI / 2; r3.position.set(-32, 0.02, 22); scene.add(r3);
    const r4 = new THREE.Mesh(new THREE.PlaneGeometry(9, 65), roadMat);
    r4.rotation.x = -Math.PI / 2; r4.position.set(6, 0.02, -20); scene.add(r4);

    // MITE Main Entrance Gate (Iconic Yellow Curved Walls from photo)
    const gateYel = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const gateRed = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
    const gWallL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 12), gateYel);
    gWallL.position.set(80, 2.75, 1); scene.add(gWallL);
    const gWallR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 12), gateYel);
    gWallR.position.set(80, 2.75, 19); scene.add(gWallR);
    const gArch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 7.6), gateRed);
    gArch.position.set(80, 6.4, 10); scene.add(gArch);

    // Ganapati Temple
    const templeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309 });
    const tBase = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 18), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    tBase.position.set(-8, 0.4, 2); scene.add(tBase);
    const sanctum = new THREE.Mesh(new THREE.BoxGeometry(8, 5.5, 8), templeMat);
    sanctum.position.set(-8, 3.55, 0); scene.add(sanctum);
    const shikhara = new THREE.Mesh(new THREE.ConeGeometry(6.8, 4.5, 4), roofMat);
    shikhara.position.set(-8, 8.5, 0); shikhara.rotation.y = Math.PI / 4; scene.add(shikhara);

    // PG Block
    const pgBody = new THREE.Mesh(new THREE.BoxGeometry(36, 13, 18), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
    pgBody.position.set(-48, 6.5, 35); scene.add(pgBody);

    // Food Court
    const fcRoof = new THREE.Mesh(new THREE.BoxGeometry(32, 0.5, 18), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    fcRoof.position.set(-22, 5.5, 78); scene.add(fcRoof);

    // Sports Court
    const court = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    court.rotation.x = -Math.PI / 2; court.position.set(12, 0.05, -32); scene.add(court);

    // Perimeter Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const nW = new THREE.Mesh(new THREE.BoxGeometry(190, 5.5, 2), wallMat);
    nW.position.set(0, 2.75, -95); scene.add(nW);
    const sW = new THREE.Mesh(new THREE.BoxGeometry(190, 5.5, 2), wallMat);
    sW.position.set(0, 2.75, 95); scene.add(sW);
    const wW = new THREE.Mesh(new THREE.BoxGeometry(2, 5.5, 190), wallMat);
    wW.position.set(-95, 2.75, 0); scene.add(wW);

    // 3D Gun Model
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }));
    const gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.32), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 }));
    gunBarrel.position.set(0, 0.02, -0.32);
    const gunSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.025, 0.015), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    gunSight.position.set(0, 0.054, -0.45);
    gunGroup.add(gunBody, gunBarrel, gunSight);
    camera.add(gunGroup);
    scene.add(camera);

    const HIP_POS = new THREE.Vector3(0.24, -0.22, -0.48);
    const ADS_POS = new THREE.Vector3(0.0, -0.152, -0.38);
    gunGroup.position.copy(HIP_POS);

    // Humanoid Enemies Builder
    function buildHumanoid(color) {
      const g = new THREE.Group();
      const jMat = new THREE.MeshStandardMaterial({ color });
      const pMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const sMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69 });
      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), jMat);
      torso.position.y = 1.28; g.add(torso);
      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), sMat);
      head.position.y = 1.72; g.add(head);
      // Visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      visor.position.set(0, 1.73, 0.11); g.add(visor);
      // Legs
      const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), pMat);
      lLeg.position.set(0.12, 0.45, 0); g.add(lLeg);
      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), pMat);
      rLeg.position.set(-0.12, 0.45, 0); g.add(rLeg);
      // Weapon in hand
      const wep = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      wep.position.set(-0.26, 1.1, 0.2); g.add(wep);
      return { group: g, lLeg, rLeg, torso, mat: jMat };
    }

    const enemies = [];
    const colors = [0xdc2626, 0x2563eb, 0x16a34a, 0x7c3aed, 0xea580c, 0x0d9488, 0xe11d48];
    const spawnPoints = [
      [45, 8], [-6, 14], [-38, 24], [-24, 80], [12, -25], [-28, -50], [60, -10]
    ];
    for (let i = 0; i < 7; i++) {
      const char = buildHumanoid(colors[i % colors.length]);
      char.group.position.set(spawnPoints[i][0], 0, spawnPoints[i][1]);
      scene.add(char.group);
      enemies.push({ ...char, hp: 100, flash: 0, cycle: Math.random() * 6 });
    }

    // State
    let health = 100, ammo = 30, score = 0, kills = 0, isReloading = false, isADS = false, isGameOver = false;
    let playerPos = new THREE.Vector3(72, 1.6, 10);
    let playerVelY = 0, isGrounded = true, yaw = Math.PI / 2, pitch = 0;
    const keys = {};

    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'KeyR' && !isReloading && ammo < 30) reload();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== renderer.domElement || isGameOver) return;
      const sens = isADS ? 0.0014 : 0.0022;
      yaw -= e.movementX * sens;
      pitch -= e.movementY * sens;
      pitch = Math.max(-1.48, Math.min(1.48, pitch));
    });

    window.addEventListener('mousedown', e => {
      if (document.pointerLockElement !== renderer.domElement || isGameOver) return;
      if (e.button === 0) shoot();
      if (e.button === 2) isADS = true;
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 2) isADS = false;
    });

    function reload() {
      if (isReloading || ammo === 30 || isGameOver) return;
      isReloading = true;
      document.getElementById('ammo-label').innerText = 'RELOADING...';
      setTimeout(() => {
        ammo = 30; isReloading = false;
        document.getElementById('ammo-label').innerText = 'AMMO';
        updateHUD();
      }, 1300);
    }

    const raycaster = new THREE.Raycaster();
    function shoot() {
      if (isReloading || isGameOver) return;
      if (ammo <= 0) { reload(); return; }
      ammo--;
      playShootSound();
      updateHUD();
      if (ammo === 0) setTimeout(reload, 120);

      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const meshes = [];
      const mToEnemy = new Map();
      enemies.forEach(e => {
        e.group.traverse(c => {
          if (c instanceof THREE.Mesh) { meshes.push(c); mToEnemy.set(c, e); }
        });
      });

      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const hitEnemy = mToEnemy.get(hits[0].object);
        if (hitEnemy) {
          playHitSound();
          hitEnemy.flash = 0.12;
          hitEnemy.mat.color.set(0xffffff);

          const hm = document.getElementById('hitmarker');
          hm.style.display = 'block';
          setTimeout(() => { hm.style.display = 'none'; }, 100);

          hitEnemy.hp -= 35;
          if (hitEnemy.hp <= 0) {
            score += 100; kills++;
            hitEnemy.hp = 100;
            const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
            hitEnemy.group.position.set(sp[0], 0, sp[1]);
          }
          updateHUD();
        }
      }
    }

    function updateHUD() {
      document.getElementById('hp-text').innerText = Math.round(health) + ' / 100';
      document.getElementById('hp-bar').style.width = Math.max(0, health) + '%';
      document.getElementById('score-text').innerText = score;
      document.getElementById('kills-text').innerText = kills;
      document.getElementById('ammo-text').innerText = isReloading ? '...' : ammo + ' / 30';
    }

    function resetGame() {
      health = 100; ammo = 30; score = 0; kills = 0; isGameOver = false;
      playerPos.set(72, 1.6, 10); playerVelY = 0; yaw = Math.PI / 2; pitch = 0;
      enemies.forEach((e, i) => {
        e.hp = 100;
        e.group.position.set(spawnPoints[i][0], 0, spawnPoints[i][1]);
      });
      document.getElementById('gameover-screen').style.display = 'none';
      renderer.domElement.requestPointerLock();
      updateHUD();
    }

    document.getElementById('start-btn').onclick = () => {
      audioCtx.resume();
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('hud').style.display = 'flex';
      renderer.domElement.requestPointerLock();
    };
    document.getElementById('respawn-btn').onclick = resetGame;

    let lastTime = performance.now();
    function animate() {
      requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isGameOver) {
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;

        camera.fov = THREE.MathUtils.lerp(camera.fov, isADS ? 48 : 75, 14 * dt);
        camera.updateProjectionMatrix();
        gunGroup.position.lerp(isADS ? ADS_POS : HIP_POS, 14 * dt);

        const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const move = new THREE.Vector3();
        if (keys['KeyW']) move.add(fwd);
        if (keys['KeyS']) move.sub(fwd);
        if (keys['KeyD']) move.add(right);
        if (keys['KeyA']) move.sub(right);

        const isSprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && keys['KeyW'] && !isADS;
        const speed = isSprinting ? 18.5 : 10.5;
        if (move.lengthSq() > 0.001) move.normalize().multiplyScalar(speed * dt);

        playerPos.x = Math.max(-92, Math.min(92, playerPos.x + move.x));
        playerPos.z = Math.max(-92, Math.min(92, playerPos.z + move.z));

        playerVelY -= 28 * dt;
        if (keys['Space'] && isGrounded) {
          playerVelY = 11.0;
          isGrounded = false;
        }
        playerPos.y += playerVelY * dt;
        if (playerPos.y <= 1.6) {
          playerPos.y = 1.6;
          playerVelY = 0;
          isGrounded = true;
        }
        camera.position.copy(playerPos);

        let touching = false;
        enemies.forEach((e, i) => {
          if (e.flash > 0) {
            e.flash -= dt;
            if (e.flash <= 0) e.mat.color.set(colors[i % colors.length]);
          }
          const toP = new THREE.Vector3().subVectors(playerPos, e.group.position).setY(0);
          const dist = toP.length();

          if (dist > 0.1) e.group.rotation.y = Math.atan2(toP.x, toP.z);

          if (dist > 1.8) {
            toP.normalize().multiplyScalar(3.5 * dt);
            e.group.position.add(toP);
            // Limb walk animation
            e.cycle += dt * 8;
            e.lLeg.rotation.x = Math.sin(e.cycle) * 0.6;
            e.rLeg.rotation.x = -Math.sin(e.cycle) * 0.6;
          } else {
            touching = true;
          }
        });

        if (touching) {
          health -= 15 * dt;
          document.getElementById('vignette').style.opacity = '0.85';
          if (health <= 0) {
            health = 0;
            isGameOver = true;
            document.exitPointerLock();
            document.getElementById('gameover-summary').innerText = 'Final Score: ' + score + '  ·  Rivals Down: ' + kills;
            document.getElementById('gameover-screen').style.display = 'flex';
          }
          updateHUD();
        } else {
          document.getElementById('vignette').style.opacity = '0';
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;
}
