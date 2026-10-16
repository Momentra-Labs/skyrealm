import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import './game-theme.css';
import { GameState, RunMode, UiScreen } from './types/game.ts';
import type { GameSnapshot, GameState as GameStateT, OwnedAetherling, RunMode as RunModeT, UiScreen as UiScreenT } from './types/game.ts';
import { GameEngine } from './game/GameEngine.ts';
import { GameBridge } from './game/phaser/GameBridge.ts';
import type { GameSession } from './services/GameSession.ts';
import { BossWarning } from './components/BossWarning.tsx';
import { CountdownOverlay } from './components/CountdownOverlay.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import { MagicFrame } from './components/MagicFrame.tsx';
import { GameOver } from './components/GameOver.tsx';
import { HowToPlay } from './components/HowToPlay.tsx';
import { Home } from './components/Home.tsx';
import { GuardianHall } from './components/GuardianHall.tsx';
import { AetherlingDex } from './components/AetherlingDex.tsx';
import { QuestBoard } from './components/QuestBoard.tsx';
import { RaidGate } from './components/RaidGate.tsx';
import { EggNest } from './components/EggNest.tsx';
import { ShopStall } from './components/ShopStall.tsx';
import { TrophyCase } from './components/TrophyCase.tsx';
import { PackBag } from './components/PackBag.tsx';
import { TrainingYard } from './components/TrainingYard.tsx';
import { MobileControls } from './components/MobileControls.tsx';
import { PauseMenu } from './components/PauseMenu.tsx';
import { Settings } from './components/Settings.tsx';
import { Victory } from './components/Victory.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { Tutorial, TUTORIAL_STEPS } from './components/Tutorial.tsx';
import { CollectionVault } from './components/CollectionVault.tsx';
import { assets } from './assets/AssetLoader.ts';
import { hangarBootUrls } from './assets/assetManifest.ts';
import { web3UiOn } from './web3/flags.ts';
import type { BossKind } from './types/game.ts';

const GameCanvas = lazy(() => import('./components/GameCanvas.tsx').then((mod) => ({ default: mod.GameCanvas })));

interface Props {
  session: GameSession;
}

export default function GameApp({ session }: Props) {
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new GameEngine(session);
  const engine = engineRef.current;

  const bridgeRef = useRef<GameBridge | null>(null);
  if (bridgeRef.current === null) bridgeRef.current = new GameBridge(engine);
  const bridge = bridgeRef.current;

  const [gameState, setGameState] = useState<GameStateT>(GameState.MENU);
  const [ui, setUi] = useState<UiScreenT>(UiScreen.MENU);
  const [settingsFrom, setSettingsFrom] = useState<'menu' | 'pause'>('menu');
  const [snap, setSnap] = useState<GameSnapshot>(() => ({ ...engine.getSnapshot() }));
  const [save, setSave] = useState(() => structuredClone(session.data));
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [reveal, setReveal] = useState<OwnedAetherling | null>(null);
  const [dup, setDup] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [tutStep, setTutStep] = useState(0);

  const refresh = () => setSave(structuredClone(session.data));
  const rememberWallet = useCallback((address: string) => {
    session.rememberWallet(address);
    setSave(structuredClone(session.data));
  }, [session]);

  useEffect(() => () => engine.destroy(), [engine]);
  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', !ready);
    return () => document.documentElement.classList.remove('is-loading');
  }, [ready]);
  useEffect(() => {
    let alive = true;
    let loaded = false;
    let completedAt = 0;
    const startedAt = performance.now();
    const push = () => {
      if (!alive) return;
      const progress = Math.min(loaded ? 1 : Math.min(.95, assets.progress), (performance.now() - startedAt) / 2400);
      setLoadPct(progress);
      if (loaded && progress >= 1) {
        if (!completedAt) completedAt = performance.now();
        if (performance.now() - completedAt >= 320) {
          setReady(true);
          window.clearInterval(tick);
        }
      }
    };
    const offProgress = assets.onProgress(push);
    const tick = window.setInterval(push, 80);
    push();
    void assets.load(hangarBootUrls()).then(() => {
      if (!alive) return;
      loaded = true;
      push();
    });
    return () => {
      alive = false;
      offProgress();
      window.clearInterval(tick);
    };
  }, []);
  useEffect(() => {
    return bridge.on((_event, state) => {
      setGameState(state);
      setSnap({ ...engine.getSnapshot() });
      if (state === GameState.GAME_OVER || state === GameState.VICTORY) refresh();
    });
  }, [bridge, engine]);
  useEffect(() => {
    if (ui !== UiScreen.GAME) return;
    const id = window.setInterval(() => {
      setSnap({ ...engine.getSnapshot() });
    }, 100);
    return () => window.clearInterval(id);
  }, [ui, engine]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const hangar = gameState === GameState.MENU;
    document.documentElement.classList.toggle('is-hangar', hangar);
    return () => document.documentElement.classList.remove('is-hangar');
  }, [gameState]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sky-top', snap.skyTop);
    root.style.setProperty('--sky-glow', snap.skyGlow);
    root.style.setProperty('--sky-mid', snap.skyMid);
    root.style.setProperty('--sky-ground', snap.skyGround);
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute('content', snap.skyMid);
  }, [snap.skyTop, snap.skyGlow, snap.skyMid, snap.skyGround]);

  const play = (mode: RunModeT = RunMode.NORMAL, raid?: BossKind) => {
    setNotice('');
    bridge.unlockAudio();
    engine.audio.play('menu');
    engine.setIgnorePause(false);
    bridge.startGame(mode, raid);
    setUi(UiScreen.GAME);
    setGameState(engine.state);
    setSnap({ ...engine.getSnapshot() });
  };

  const toMenu = () => {
    engine.audio.play('menu');
    bridge.goToMenu();
    engine.setIgnorePause(false);
    setUi(UiScreen.MENU);
    setGameState(GameState.MENU);
    refresh();
  };

  const openSettings = (from: 'menu' | 'pause') => {
    engine.audio.play('menu');
    setSettingsFrom(from);
    engine.setIgnorePause(true);
    setUi(UiScreen.SETTINGS);
  };

  const inGame =
    ui === UiScreen.GAME &&
    gameState !== GameState.MENU &&
    gameState !== GameState.GAME_OVER &&
    gameState !== GameState.VICTORY &&
    gameState !== GameState.PAUSED;

  const showTouch =
    ui === UiScreen.GAME &&
    (gameState === GameState.PLAYING ||
      gameState === GameState.BOSS_FIGHT ||
      gameState === GameState.COUNTDOWN ||
      gameState === GameState.BOSS_WARNING);

  if (!ready) {
    return (
      <>
      <MagicFrame />
      <div className="app-shell app-shell-load">
        <LoadingScreen progress={loadPct} />
      </div>
      </>
    );
  }

  return (
    <>
    <MagicFrame />
    <div className="app-shell">
      <Suspense fallback={null}>
        <GameCanvas engine={engine} bridge={bridge} pointerControl={inGame} />
      </Suspense>

      {ui === UiScreen.MENU && !save.tutorialDone && (
        <Tutorial
          step={tutStep}
          onNext={() => {
            if (tutStep + 1 >= TUTORIAL_STEPS) {
              session.finishTutorial();
              refresh();
              play(RunMode.NORMAL);
              return;
            }
            setTutStep(tutStep + 1);
          }}
        />
      )}

      {ui === UiScreen.MENU && save.tutorialDone && (
        <Home
          save={save}
          notice={notice}
          onPlay={() => play(RunMode.NORMAL)}
          onOpen={(id) => {
            engine.audio.play('menu');
            setNotice('');
            setUi(id);
            refresh();
          }}
          onPop={() => {
            engine.audio.unlock();
            engine.audio.play('powerup');
          }}
          onLogin={() => setNotice(session.claimLogin())}
        />
      )}

      {ui === UiScreen.GUARDIANS && (
        <GuardianHall
          save={save}
          notice={notice}
          onPick={(id) => {
            setNotice(session.setGuardian(id) || `Ready: ${id}`);
            refresh();
          }}
          onBack={toMenu}
        />
      )}

      {ui === UiScreen.AETHERLINGS && (
        <AetherlingDex
          save={save}
          notice={notice}
          onEquip={(slot, id) => {
            session.equipAether(slot, id);
            refresh();
          }}
          onEvolve={(id) => {
            setNotice(session.evolve(id));
            engine.audio.play('evo');
            refresh();
          }}
          onDissolve={(id) => {
            setNotice(session.dissolve(id));
            refresh();
          }}
          onBack={toMenu}
        />
      )}

      {ui === UiScreen.QUESTS && (
        <QuestBoard
          save={save}
          notice={notice}
          now={now}
          onStart={(id) => {
            setNotice(session.startQuest(id));
            refresh();
          }}
          onClaim={(id) => {
            setNotice(session.claimQuest(id));
            refresh();
          }}
          onBack={toMenu}
        />
      )}

      {ui === UiScreen.RAID && (
        <RaidGate
          save={save}
          notice={notice}
          onEnter={(kind) => {
            const err = session.spendRaidEnergy();
            if (err) {
              setNotice(err);
              return;
            }
            play(RunMode.RAID, kind);
          }}
          onBack={toMenu}
        />
      )}

      {ui === UiScreen.EGGS && (
        <EggNest
          save={save}
          notice={notice}
          reveal={reveal}
          duplicate={dup}
          onOpen={(tier) => {
            const result = session.openEgg(tier);
            if (!result.ok) {
              setNotice(result.reason);
              return;
            }
            setReveal(result.unit);
            setDup(result.duplicate);
            setNotice(result.duplicate ? 'Duplicate became essence' : `Hatched ${result.unit.species}`);
            engine.audio.play('egg');
            refresh();
          }}
          onBack={toMenu}
        />
      )}

      {ui === UiScreen.SHOP && (
        <ShopStall
          save={save}
          session={session}
          notice={notice}
          onBuy={(id) => {
            setNotice(session.buy(id));
            refresh();
          }}
          onBack={toMenu}
        />
      )}

      {ui === UiScreen.ACHIEVEMENTS && <TrophyCase save={save} onBack={toMenu} />}
      {ui === UiScreen.INVENTORY && <PackBag save={save} onBack={toMenu} />}
      {ui === UiScreen.COLLECTION && web3UiOn() && (
        <CollectionVault save={save} onRemember={rememberWallet} onBack={toMenu} />
      )}
      {ui === UiScreen.TRAINING && (
        <TrainingYard save={save} onStart={() => play(RunMode.TRAINING)} onBack={toMenu} />
      )}

      {ui === UiScreen.HOW_TO_PLAY && (
        <HowToPlay
          onPop={() => {
            engine.audio.unlock();
            engine.audio.play('powerup');
          }}
          onBack={toMenu}
        />
      )}

      {ui === UiScreen.SETTINGS && (
        <Settings
          settings={save.settings}
          playful={settingsFrom === 'menu'}
          onPop={() => {
            engine.audio.unlock();
            engine.audio.play('powerup');
          }}
          onChange={(next) => {
            bridge.applySettings(next);
            refresh();
          }}
          onReset={() => {
            session.resetSave();
            refresh();
            setNotice('Save cleared');
          }}
          onBack={() => {
            engine.audio.play('menu');
            engine.setIgnorePause(false);
            setUi(settingsFrom === 'pause' ? UiScreen.GAME : UiScreen.MENU);
          }}
        />
      )}

      {ui === UiScreen.GAME &&
        gameState !== GameState.MENU &&
        gameState !== GameState.PAUSED &&
        gameState !== GameState.GAME_OVER &&
        gameState !== GameState.VICTORY && (
          <GameHUD
            snap={snap}
            compact
          />
        )}
      {ui === UiScreen.GAME && gameState === GameState.COUNTDOWN && <CountdownOverlay label={snap.countdownLabel} />}
      {ui === UiScreen.GAME && gameState === GameState.BOSS_WARNING && (
        <BossWarning name={snap.bossName || 'BOSS'} />
      )}
      {ui === UiScreen.GAME && gameState === GameState.PAUSED && (
        <PauseMenu
          onResume={() => {
            bridge.resume();
            setGameState(engine.state);
          }}
          onRestart={() => play(engine.mode, engine.director.raidKind ?? undefined)}
          onSettings={() => openSettings('pause')}
          onMenu={toMenu}
        />
      )}
      {ui === UiScreen.GAME && gameState === GameState.GAME_OVER && (
        <GameOver snap={snap} onRetry={() => play(engine.mode, engine.director.raidKind ?? undefined)} onMenu={toMenu}
          coins={save.profile.coins} guardianLevel={save.guardians[save.equippedGuardian].level}
          upgradeCost={session.guardianUpgradeCost()} notice={notice}
          onUpgrade={() => { setNotice(session.upgradeGuardian()); refresh(); }} />
      )}
      {ui === UiScreen.GAME && gameState === GameState.VICTORY && (
        <Victory snap={snap} onAgain={() => play(engine.mode, engine.director.raidKind ?? undefined)} onMenu={toMenu} />
      )}
      {showTouch && (
        <MobileControls
          engine={engine}
          specialReady={snap.specialReady}
          specialEnergy={snap.specialEnergy}
          touchHand={save.settings.touchHand}
        />
      )}
    </div>
    </>
  );
}
