import { useEffect, useState, useRef } from 'preact/hooks';
import { GameState } from './types';
import { initPhaserGame } from './game/FlappyGame';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  
  const gameRef = useRef<any>(null);
  const parentId = 'game-container';

  useEffect(() => {
    // Read initial highscore from local storage for Preact state
    const savedHigh = parseInt(localStorage.getItem('kaios_flappy_high') || '0', 10);
    setHighScore(savedHigh);

    let isDestroyed = false;
    let game: any = null;

    const startPhaser = () => {
      if (isDestroyed) return;
      game = initPhaserGame(
        parentId,
        (state: GameState) => {
          setGameState(state);
        },
        (scores: { score: number; highScore: number }) => {
          setScore(scores.score);
          setHighScore(scores.highScore);
        }
      );
      gameRef.current = game;
    };

    if ('fonts' in document) {
      // Force load the custom fonts to ensure they are available to Phaser on boot
      Promise.all([
        document.fonts.load('12px "Luckiest Guy"'),
        document.fonts.load('12px "Baloo Chettan 2"'),
        document.fonts.load('12px "LuckiestGuy"'),
        document.fonts.load('12px "BalooChettan2"')
      ]).then(() => {
        startPhaser();
      }).catch((err) => {
        console.warn('Font loading failed or timed out:', err);
        startPhaser();
      });
    } else {
      startPhaser();
    }

    // Cleanup game on unmount
    return () => {
      isDestroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Bridge controls from virtual buttons to Phaser scene
  const triggerFlap = () => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.keys.FlappyScene;
      if (scene) {
        scene.triggerFlap();
      }
    }
  };

  const togglePause = () => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.keys.FlappyScene;
      if (scene) {
        scene.togglePause();
      }
    }
  };

  const handleRestart = () => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.keys.FlappyScene;
      if (scene) {
        scene.restartGame();
      }
    }
  };

  // Label helper based on current game state
  const getSoftLeftLabel = () => {
    switch (gameState) {
      case GameState.PLAYING:
        return 'PAUSE';
      case GameState.PAUSED:
        return 'RESUME';
      default:
        return 'SOFT L';
    }
  };

  return (
    <div id="app-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      {/* Hidden font preloader to ensure fonts are loaded before Phaser starts */}
      <div style={{ opacity: 0, position: 'absolute', pointerEvents: 'none', top: -100, left: -100, height: '1px', width: '1px', overflow: 'hidden' }}>
        <span style={{ fontFamily: '"Luckiest Guy"' }}>Preload</span>
        <span style={{ fontFamily: '"Baloo Chettan 2"' }}>Preload</span>
        <span style={{ fontFamily: '"LuckiestGuy"' }}>Preload</span>
        <span style={{ fontFamily: '"BalooChettan2"' }}>Preload</span>
      </div>

      <header style={{ textAlign: 'center', marginBottom: '5px' }}>
        <h1 style={{ fontFamily: '"Luckiest Guy", sans-serif', fontSize: '24px', color: '#ffde00', textShadow: '2px 2px #000', letterSpacing: '1px' }}>KAIOS FLAPPY</h1>
        <p style={{ fontFamily: '"Baloo Chettan 2", sans-serif', fontSize: '11px', color: '#8b8ba9', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>PORTED RETRO FLAPPER</p>
      </header>

      {/* Handheld Device / Phone Bezel Frame */}
      <div className="console-frame" id="handheld-console">
        <div className="screen-container">
          {/* Phaser canvas mounts exactly here (320x240) */}
          <div id={parentId} style={{ width: '320px', height: '240px' }} />
        </div>

        {/* Console Details & Soft Key Bar */}
        <div style={{ width: '320px', display: 'flex', justifyContent: 'space-between', padding: '6px 4px 0 4px', borderBottom: '1px solid #3d3d5c' }}>
          <span style={{ fontSize: '11px', color: '#ffde00', fontWeight: 'bold' }}>
            {gameState === GameState.PLAYING || gameState === GameState.PAUSED ? `[ L: ${getSoftLeftLabel()} ]` : ''}
          </span>
          <span className="console-brand">Kai-OS Edition</span>
          <span style={{ fontSize: '11px', color: '#00e676', fontWeight: 'bold' }}>
            {gameState === GameState.GAMEOVER ? '[ R: RESTART ]' : ''}
          </span>
        </div>

        {/* Handheld Controls Bezel */}
        <div className="console-controls">
          {/* Interactive virtual buttons for non-KaiOS / browser play */}
          <div className="virtual-buttons">
            <button className="v-btn" onClick={triggerFlap} id="btn-flap">
              {gameState === GameState.MENU ? 'START GAME' : gameState === GameState.GAMEOVER ? 'RESTART' : 'FLAP (5 / CENTER)'}
            </button>
            
            {gameState === GameState.PLAYING || gameState === GameState.PAUSED ? (
              <button className="v-btn secondary" onClick={togglePause} id="btn-pause">
                {gameState === GameState.PLAYING ? 'PAUSE' : 'RESUME'}
              </button>
            ) : null}
          </div>

          {/* Physical Keyboard layout hints */}
          <div className="keyboard-hints">
            <div className="hint-row">
              <span>FLAP / START:</span>
              <span className="hint-key">ENTER / SPACE / UP / 5</span>
            </div>
            <div className="hint-row" style={{ marginTop: '4px' }}>
              <span>PAUSE / MENU:</span>
              <span className="hint-key">L-SOFT / ESC / P</span>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ textAlign: 'center', fontSize: '11px', color: '#8b8ba9', maxWidth: '300px', lineHeight: '1.4' }}>
        Designed with custom 320x240 scaling and offline-first asset generator.
        Binds perfectly to KaiOS keys, D-pad controllers and soft buttons.
      </footer>
    </div>
  );
}
