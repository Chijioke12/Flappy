import { GameState } from '../types';

// Let TypeScript know Phaser is loaded globally via index.html
declare const Phaser: any;

export class FlappyScene extends Phaser.Scene {
  // Game objects
  private bird: any;
  private background: any;
  private ground: any;
  private groundStatic: any;
  private pipes: any;
  
  // Game parameters
  private gameState: GameState = GameState.MENU;
  private score: number = 0;
  private highScore: number = 0;
  private nextPipeTimer: any = null;
  
  // Hover effect during menu
  private menuHoverTime: number = 0;
  
  // Phaser elements
  private scoreText: any;
  private promptText: any;
  private titleText: any;
  private logoGroup: any;

  // Particles & Effects
  private customParticles: any[] = [];
  private trailTimer: number = 0;

  constructor() {
    super({ key: 'FlappyScene' });
  }

  preload() {
    // Load procedurally drawn python assets
    this.load.image('background', 'assets/background.png');
    this.load.image('ground', 'assets/ground.png');
    this.load.spritesheet('bird', 'assets/bird.png', { frameWidth: 24, frameHeight: 16 });
    this.load.image('pipe_body', 'assets/pipe_body.png');
    this.load.image('pipe_head', 'assets/pipe_head.png');

    // Load python-generated retro audio assets
    this.load.audio('flap', 'assets/flap.ogg');
    this.load.audio('score', 'assets/score.ogg');
    this.load.audio('hit', 'assets/hit.ogg');
  }

  create() {
    // Reset effects
    this.customParticles = [];
    this.trailTimer = 0;

    // 1. Get high score
    this.highScore = parseInt(localStorage.getItem('kaios_flappy_high') || '0', 10);

    // 2. Add Background
    this.background = this.add.tileSprite(0, 0, 320, 240, 'background').setOrigin(0, 0);

    // 3. Add Pipe group (standard group, so individual physics body modifications are preserved)
    this.pipes = this.add.group();

    // 4. Add Ground Static Body
    // In Phaser, we can create a static body on the ground tileSprite
    this.ground = this.add.tileSprite(0, 208, 320, 32, 'ground').setOrigin(0, 0);
    this.physics.add.existing(this.ground, true); // true = static body

    // 5. Add Bird
    this.bird = this.physics.add.sprite(60, 100, 'bird').setOrigin(0.5, 0.5);
    this.bird.body.setGravityY(0); // Gravity disabled at start
    // Set smaller bounding box for fairer, more forgiving hits
    this.bird.body.setSize(15, 11, true);

    // Create flap animation if it doesn't already exist
    if (!this.anims.exists('flap')) {
      this.anims.create({
        key: 'flap',
        frames: this.anims.generateFrameNumbers('bird', { frames: [1, 0, 2, 0] }),
        frameRate: 12,
        repeat: -1
      });
    }
    this.bird.play('flap');

    // 6. Setup Colliders
    this.physics.add.collider(this.bird, this.ground, this.handleGroundCollision, null, this);
    this.physics.add.overlap(this.bird, this.pipes, this.handlePipeCollision, null, this);

    // 7. Dynamic HUD UI using custom fonts (Luckiest Guy & Baloo Chettan 2)
    this.titleText = this.add.text(160, 50, 'FLAPPY BIRD', {
      fontFamily: 'LuckiestGuy, "Luckiest Guy", sans-serif',
      fontSize: '24px',
      color: '#ffde00',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(10);

    this.promptText = this.add.text(160, 125, 'PRESS [CENTER]\nOR [5] TO FLAP', {
      fontFamily: 'LuckiestGuy, "Luckiest Guy", sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5).setDepth(10);

    this.scoreText = this.add.text(160, 22, 'SCORE: 0', {
      fontFamily: 'LuckiestGuy, "Luckiest Guy", sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    // 8. Bind global key events for game actions
    this.input.keyboard.on('keydown', this.handleKeyDown, this);

    // Set initial state
    this.setGameState(GameState.MENU);
  }

  update(time: number, delta: number) {
    if (this.gameState === GameState.MENU) {
      // Gentle floating hover effect for the bird
      this.menuHoverTime += delta * 0.005;
      this.bird.y = 100 + Math.sin(this.menuHoverTime) * 6;
      
      // Gentle flapping on the menu screen
      if (!this.bird.anims.isPlaying) {
        this.bird.play('flap');
      }
      this.bird.anims.setTimeScale(0.8);
      
      // Scroll background and ground slowly
      this.background.tilePositionX += 0.2;
      this.ground.tilePositionX += 1;
    } 
    else if (this.gameState === GameState.PLAYING) {
      // Scroll background (slower parallax) and ground (matching pipes)
      this.background.tilePositionX += 0.4;
      this.ground.tilePositionX += 2.0;

      // Handle bird tilt angle like a real bird (no high-frequency wiggling)
      const velocity = this.bird.body.velocity.y;
      if (velocity < 150) {
        // Head stays perfectly straight/horizontal while flapping and climbing/gliding
        this.bird.angle = Phaser.Math.Linear(this.bird.angle, 0, 0.2);
      } else {
        // Pitch down dynamically into a nose dive only when falling fast
        this.bird.angle = Math.min(85, this.bird.angle + 3.0);
      }

      // Dynamic wing flapping based on velocity
      if (velocity < 100) {
        if (!this.bird.anims.isPlaying) {
          this.bird.play('flap');
        }
        // Flap faster when ascending, normal/slow when starting to descend
        this.bird.anims.setTimeScale(velocity < 0 ? 1.5 : 0.8);
      } else {
        // Stop flapping and hold wings in glide style when falling fast
        this.bird.anims.stop();
        this.bird.setFrame(0); // Wings flat/neutral frame
      }

      // Spawn trail particles behind bird
      this.trailTimer += delta;
      if (this.trailTimer >= 80) { // Every 80ms
        this.trailTimer = 0;
        const size = Phaser.Math.Between(2, 4);
        const color = Math.random() < 0.5 ? 0x46c8ff : 0xffffff;
        const p = this.add.rectangle(this.bird.x - 10, this.bird.y + Phaser.Math.Between(-4, 4), size, size, color, 0.7).setDepth(4);
        this.customParticles.push({
          gameObject: p,
          vx: -60, // drift backwards slightly
          vy: Phaser.Math.FloatBetween(-10, 10),
          decay: 0.03,
          gravity: 20 // fall slightly
        });
      }

      // Check for pipes passing the bird to score points
      this.pipes.getChildren().forEach((pipe: any) => {
        // Only score on the top pipe to avoid double counting
        if (pipe.isTop && !pipe.scored && pipe.x < this.bird.x) {
          pipe.scored = true;
          this.incrementScore();
        }

        // Destroy out of bounds pipes
        if (pipe.x < -40) {
          pipe.destroy();
        }
      });
      
      // Safety bounds check
      if (this.bird.y < -20) {
        this.bird.y = -20;
        this.bird.setVelocityY(50); // don't fly off screen
      }
    }

    // Update and clean up custom particles (runs in all states)
    for (let i = this.customParticles.length - 1; i >= 0; i--) {
      const p = this.customParticles[i];
      if (!p.gameObject || !p.gameObject.active) {
        this.customParticles.splice(i, 1);
        continue;
      }
      
      p.gameObject.x += (p.vx * delta) / 1000;
      p.gameObject.y += (p.vy * delta) / 1000;
      if (p.gravity) {
        p.vy += (p.gravity * delta) / 1000;
      }
      
      p.gameObject.alpha -= p.decay;
      if (p.gameObject.alpha <= 0) {
        p.gameObject.destroy();
        this.customParticles.splice(i, 1);
      }
    }
  }

  // ==============================================================================
  // GAMEPLAY CONTROLS & EVENT HANDLERS
  // ==============================================================================
  
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key;
    
    // Check key presses mapping to KaiOS controls:
    // D-pad Center (Enter / Select), Up Arrow, Space bar, or keypad '5' to flap/start
    if (key === 'Enter' || key === ' ' || key === 'ArrowUp' || key === '5' || key === 'ui-select') {
      this.triggerFlap();
      event.preventDefault();
    }
    
    // Left Soft Key or Escape or 'p' to Pause/Resume during play
    if (key === 'p' || key === 'Escape' || key === 'SoftLeft') {
      this.togglePause();
      event.preventDefault();
    }
  }

  triggerFlap() {
    if (this.gameState === GameState.MENU) {
      this.startGame();
    } else if (this.gameState === GameState.PLAYING) {
      this.bird.setVelocityY(-220); // Jump impulse
      this.sound.play('flap');

      // Spawn puff particles behind bird
      this.spawnParticles(this.bird.x - 6, this.bird.y, [0xffffff, 0xffde00], 4, false);
    } else if (this.gameState === GameState.GAMEOVER) {
      // If dead, press jump/flap to restart
      this.restartGame();
    }
  }

  spawnParticles(x: number, y: number, colors: number[], count: number = 8, hasGravity: boolean = true) {
    for (let i = 0; i < count; i++) {
      const size = Phaser.Math.Between(2, 4);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = this.add.rectangle(x, y, size, size, color).setDepth(8);
      
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(40, 120);
      
      this.customParticles.push({
        gameObject: p,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        decay: Phaser.Math.FloatBetween(0.015, 0.035),
        gravity: hasGravity ? 150 : 0
      });
    }
  }

  startGame() {
    this.setGameState(GameState.PLAYING);
    this.titleText.setVisible(false);
    this.promptText.setVisible(false);
    this.scoreText.setVisible(true);
    this.scoreText.setText('SCORE: 0');
    
    // Enable physics on the bird
    this.bird.body.setGravityY(700);
    this.triggerFlap();

    // Start spawning pipes
    this.spawnPipePair();
    this.nextPipeTimer = this.time.addEvent({
      delay: 1500,
      callback: this.spawnPipePair,
      callbackScope: this,
      loop: true
    });
  }

  spawnPipePair() {
    if (this.gameState !== GameState.PLAYING) return;

    const gapSize = 68;
    // Keep gap within reasonable bounds of screen (320x240, playable range: y=40 to y=168)
    const gapCenter = Phaser.Math.Between(60, 140);
    const pipeX = 340;
    const pipeLeft = pipeX - 16;

    // A. TOP PIPE
    const topPipeHeight = gapCenter - gapSize / 2;
    // Create standard sprite for the top pipe body and stretch it
    const topBody = this.add.sprite(pipeLeft, 0, 'pipe_body').setOrigin(0, 0);
    topBody.setDisplaySize(32, topPipeHeight);
    
    // Create head at the bottom edge of top pipe (overhanging by 2px on each side)
    const topHead = this.add.sprite(pipeLeft - 2, topPipeHeight - 16, 'pipe_head').setOrigin(0, 0);
    
    // Add physics to body and head
    this.physics.add.existing(topBody);
    this.physics.add.existing(topHead);
    
    // Configure physics - let Phaser handle the scaling naturally by setting unscaled dimensions
    topBody.body.setSize(32, 32);
    topBody.body.setAllowGravity(false);
    topBody.body.setImmovable(true);
    topBody.body.setVelocityX(-125);

    topHead.body.setSize(36, 16);
    topHead.body.setAllowGravity(false);
    topHead.body.setImmovable(true);
    topHead.body.setVelocityX(-125);

    // B. BOTTOM PIPE
    const bottomPipeY = gapCenter + gapSize / 2;
    const bottomPipeHeight = 208 - bottomPipeY; // End at ground y=208
    
    // Create head at the top edge of bottom pipe
    const bottomHead = this.add.sprite(pipeLeft - 2, bottomPipeY, 'pipe_head').setOrigin(0, 0);
    
    // Create body extending downwards and stretch it
    const bottomBody = this.add.sprite(pipeLeft, bottomPipeY + 16, 'pipe_body').setOrigin(0, 0);
    bottomBody.setDisplaySize(32, bottomPipeHeight - 16);

    this.physics.add.existing(bottomHead);
    this.physics.add.existing(bottomBody);

    bottomHead.body.setSize(36, 16);
    bottomHead.body.setAllowGravity(false);
    bottomHead.body.setImmovable(true);
    bottomHead.body.setVelocityX(-125);

    bottomBody.body.setSize(32, 32);
    bottomBody.body.setAllowGravity(false);
    bottomBody.body.setImmovable(true);
    bottomBody.body.setVelocityX(-125);

    // Keep references in standard group to destroy/track them
    this.pipes.add(topBody);
    this.pipes.add(topHead);
    this.pipes.add(bottomHead);
    this.pipes.add(bottomBody);

    // Track scoring on topBody (representing the pipe pair pass event)
    topBody.isTop = true;
    topBody.scored = false;
  }

  incrementScore() {
    this.score += 1;
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.sound.play('score');

    // Floating "+1" pop-up effect!
    const popup = this.add.text(this.bird.x, this.bird.y - 15, '+1', {
      fontFamily: 'LuckiestGuy, "Luckiest Guy", sans-serif',
      fontSize: '14px',
      color: '#ffde00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(11);
    
    this.tweens.add({
      targets: popup,
      y: popup.y - 25,
      alpha: 0,
      scale: 1.4,
      duration: 500,
      onComplete: () => popup.destroy()
    });

    // Score sparks/stars effect!
    this.spawnParticles(this.bird.x + 10, this.bird.y, [0x0096ff, 0xff8c00, 0xffffff], 6, false);

    // Trigger state sync back to Preact
    this.game.events.emit('score-changed', { score: this.score, highScore: this.highScore });
  }

  handlePipeCollision(bird: any, pipe: any) {
    if (this.gameState !== GameState.PLAYING) return;
    this.triggerDeath();
  }

  handleGroundCollision(bird: any, ground: any) {
    if (this.gameState === GameState.PLAYING) {
      this.triggerDeath();
    } else if (this.gameState === GameState.GAMEOVER) {
      // Just stop moving on ground
      this.bird.setVelocity(0, 0);
      this.bird.angle = 85;
    }
  }

  triggerDeath() {
    this.setGameState(GameState.GAMEOVER);
    this.sound.play('hit');
    
    // Stop bird animation and set to flat wings on death
    this.bird.anims.stop();
    this.bird.setFrame(0);
    
    // Shake camera for vintage game feel
    this.cameras.main.shake(150, 0.01);
    // Flash white screen on hit
    this.cameras.main.flash(200, 255, 255, 255);

    // Spawn a rich bird-colored feather explosion on impact!
    this.spawnParticles(this.bird.x, this.bird.y, [0x0096ff, 0x46c8ff, 0xff8c00, 0xffffff, 0x232d3c], 16, true);
    
    // Stop pipe spawning
    if (this.nextPipeTimer) {
      this.nextPipeTimer.destroy();
    }

    // Stop all moving pipes
    this.pipes.getChildren().forEach((pipe: any) => {
      pipe.body.setVelocityX(0);
    });

    // Update high scores
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('kaios_flappy_high', this.highScore.toString());
    }

    // Show Game Over UI
    this.titleText.setText('GAME OVER').setColor('#ff3333').setVisible(true);
    this.promptText.setText(`SCORE: ${this.score}\nHIGH : ${this.highScore}\n\nPRESS [CENTER]\nTO RESTART`).setVisible(true);
    
    this.game.events.emit('score-changed', { score: this.score, highScore: this.highScore });
  }

  togglePause() {
    if (this.gameState === GameState.PLAYING) {
      this.setGameState(GameState.PAUSED);
      this.physics.world.pause();
      if (this.nextPipeTimer) this.nextPipeTimer.paused = true;
      
      this.pipes.getChildren().forEach((pipe: any) => {
        pipe.body.prevVelocityX = pipe.body.velocityX;
        pipe.body.setVelocityX(0);
      });
      
      this.promptText.setText('GAME PAUSED\n\nPRESS [LEFT SOFT]\nTO RESUME').setVisible(true);
    } else if (this.gameState === GameState.PAUSED) {
      this.setGameState(GameState.PLAYING);
      this.physics.world.resume();
      if (this.nextPipeTimer) this.nextPipeTimer.paused = false;
      
      this.pipes.getChildren().forEach((pipe: any) => {
        pipe.body.setVelocityX(pipe.body.prevVelocityX || -125);
      });
      
      this.promptText.setVisible(false);
    }
  }

  setGameState(state: GameState) {
    this.gameState = state;
    this.game.events.emit('state-changed', state);
  }

  restartGame() {
    // Reset properties and restart active scene
    this.score = 0;
    this.scene.restart();
  }
}

// Initializer helper for Phaser
export function initPhaserGame(parentElId: string, onStateChange: (state: GameState) => void, onScoreChange: (scores: {score: number, highScore: number}) => void) {
  const config = {
    type: Phaser.AUTO,
    width: 320,
    height: 240,
    parent: parentElId,
    pixelArt: true, // Keep beautiful pixel art crisp and un-blurred!
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [FlappyScene]
  };

  const game = new Phaser.Game(config);

  // Set up bridge listeners to sync state back to Preact UI
  game.events.on('state-changed', onStateChange);
  game.events.on('score-changed', onScoreChange);

  return game;
}
