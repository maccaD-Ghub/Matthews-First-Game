/* ============================================================
   BLOCK LOCK — Matthew's First Game
   ------------------------------------------------------------
   This file is the "brain" of the game. It's organized into
   numbered sections and full of comments so you can read it
   top-to-bottom and understand what every part does.

   THE SETTING: a wooden crate tumbles across an active demolition
   site — concrete ground, steel scaffolding beams you can jump up
   onto, open pits, and a wrecking ball swinging from a crane chain
   overhead. Nothing floats by magic; everything here is something
   that could plausibly be hanging around a real construction site.

   THE BIG IDEA: your crate character actually stays still on
   screen — it's the WORLD that scrolls past underneath it. That's
   a common trick in "runner" games because it's much easier to
   program than actually moving the character across a huge level!

   Look for "TRY THIS!" comments — small changes you can make to
   see what happens.
   ============================================================ */

// --- 1. CANVAS SETUP -------------------------------------------
const canvas = document.getElementById("game-screen");
const ctx = canvas.getContext("2d");
const CANVAS_W = canvas.width;
const CANVAS_H = canvas.height;

// --- 2. TUNING KNOBS ---------------------------------------------
// Change these numbers to change how the game feels. Everything
// below reads from these, so this is the control panel for the
// whole game's difficulty (and now, its size!).

// TRY THIS! Change SCALE to make the whole game world bigger or
// smaller. Every size, speed, and gravity number below is written
// as "some plain number * SCALE", so the game keeps behaving
// exactly the same — just at a different size.
const SCALE = 3;

const TOTAL_LEVELS = 10;
const LEVEL_DURATION = 180; // seconds per level (3 minutes)
const RAMP_INTERVAL = 30; // seconds between speed increases
const RAMP_STEP = 16 * SCALE; // px/s faster, every RAMP_INTERVAL seconds

const BASE_SPEED = 250 * SCALE; // px/s at Level 1, the moment it starts
const LEVEL_SPEED_STEP = 16 * SCALE; // px/s extra base speed per level

// TRY THIS! Make MIN_SPACING_L10 bigger (closer to MIN_SPACING_L1)
// to make the hardest level much less brutal.
const MIN_SPACING_L1 = 620 * SCALE; // px between hazards on Level 1 (generous)
const MIN_SPACING_L10 = 260 * SCALE; // px between hazards on Level 10 (tight!)
const SPACING_RANGE = 220 * SCALE; // extra random padding on top of the minimum

const GAP_WIDTH = 120 * SCALE; // width of an open pit, in pixels

const PLATFORM_WIDTH = 70 * SCALE; // width of a scaffolding beam, in pixels
const PLATFORM_MIN_H = 54 * SCALE;
const PLATFORM_MAX_H = 88 * SCALE;
const PLATFORM_CLEARANCE = 70 * SCALE; // clear air between the ground and a beam's underside

const BALL_WIDTH = 90 * SCALE; // how wide the wrecking ball's danger zone is
const BALL_SIZE = 70 * SCALE; // the wrecking ball's drawn diameter
const HIGH_BALL_MARGIN = 50 * SCALE; // how far above a normal jump's reach a "high" ball hangs
const KIT_SIZE = 50 * SCALE; // the first-aid kit's drawn size

const ROCK_WIDTH = 56 * SCALE; // how wide a fallen-rock pile's danger zone is
const ROCK_HEIGHT = 60 * SCALE; // how tall the pile sits — well under APEX, so a normal jump always clears it

const BOMB_WIDTH = 48 * SCALE; // how wide a bomb's danger zone is
const BOMB_HEIGHT = 44 * SCALE; // how tall it sits — also well under APEX

// You're running across a glass roof, and every RAMP_INTERVAL seconds
// (the same 30-second mark that ramps up speed) a pane gives way
// somewhere just ahead — a break-gap, same width and clearance rules
// as a normal pit (see the "slowest pit-cross time" self-check), just
// spawned live instead of pre-placed. GLASS_BREAK_WARNING is how far
// ahead of the player (in seconds of travel time) it opens, so there's
// always a fair, comfortable window to react and jump it.
const GLASS_BREAK_WARNING = 1.6;
const GLASS_BREAK_FLASH_SECONDS = 0.4;

const GRAVITY = 2400 * SCALE; // px/s^2 — how strongly the crate falls
const JUMP_VELOCITY = -820 * SCALE; // px/s — how hard the crate launches upward
// AIRTIME doesn't change with SCALE (it's a ratio of two scaled
// numbers), but APEX does — that's exactly what we want: jumps
// take the same TIME at any size, but reach proportionally higher.
const AIRTIME = (2 * Math.abs(JUMP_VELOCITY)) / GRAVITY;
const APEX = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);

// Speed boost pads and ramps, always scattered as a pair — a boost pad,
// then a ramp a fixed distance after it, so you're already flying by
// the time you hit the ramp. The ramp launches with the exact same
// JUMP_VELOCITY as a normal jump (just automatic, no space bar needed),
// so all the existing jump-clearance guarantees still hold — you just
// cover a lot more ground per jump while boosted.
const BOOST_WIDTH = 70 * SCALE;
const BOOST_TO_RAMP_GAP = 260 * SCALE; // the boost always comes first, then the ramp
const SPEED_BOOST_MULTIPLIER = 3;
const SPEED_BOOST_DURATION = 5; // seconds

const RAMP_WIDTH = 60 * SCALE;
const RAMP_HEIGHT = 50 * SCALE;
const RAMP_LAUNCH_VELOCITY = JUMP_VELOCITY; // identical to a normal jump — same fairness math applies
// While boosted, a ramp launch also flies 3x farther horizontally per
// jump (same APEX height, more airtime-equivalent ground covered) —
// which means it can reach into a "high" wrecking ball's zone that a
// normal jump's apex was never designed to clear. So a BOOSTED ramp
// launches harder too, matching (with margin) the same apex a
// beam-boosted jump gets, so it's always at least that safe. See the
// "boosted ramp" line in verifyPhysics().
const RAMP_BOOST_LAUNCH_VELOCITY = JUMP_VELOCITY * 1.3;

const PLAYER_SIZE = 46 * SCALE;
const PLAYER_SCREEN_X = 170 * SCALE; // the crate's fixed spot on screen
const GROUND_Y = CANVAS_H - 60 * SCALE; // the y-coordinate of the ground's top

const FORGIVENESS = 6 * SCALE; // small px margin so hazard collisions feel fair
const PICKUP_LENIENCY = 10 * SCALE; // the first-aid kit's hitbox is a little extra generous

const LIVES_START = 3;
const MAX_LIVES = 4; // a first-aid kit can take you one life above normal, never higher
const CELEBRATE_SECONDS = 7; // bounce time after finishing a level
const TITLE_VISIBLE_SECONDS = 5;

// --- 3. GRAB HUD ELEMENTS ---------------------------------------
const heartsEl = document.getElementById("hearts");
const progressFillEl = document.getElementById("progress-fill");
const levelLabelEl = document.getElementById("level-label");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayButton = document.getElementById("overlay-button");
const titleScreen = document.getElementById("title-screen");
const tapButton = document.getElementById("tap-button");

// --- 4. GAME STATE -------------------------------------------------
// "state.mode" is the single source of truth for what's happening
// right now. The game loop below checks it to decide what to do.
// Modes: "intro" -> "ready" -> "playing" -> "celebrating" ->
//        "falling" -> "playing" (next level) ... -> "gameover" / "victory"
let state = null;

// A separate real-time clock, never reset by newRun()/beginLevel(), just
// for background ambiance (like the skyline buildings periodically
// collapsing) — it keeps ticking even on the title/game-over screens.
let ambientTime = 0;

function newRun() {
  state = {
    mode: "intro",
    level: 1,
    lives: LIVES_START,
    livesEverMax: LIVES_START, // tracks whether a first-aid kit has ever unlocked a 4th heart
    levelTime: 0, // seconds elapsed in the current level
    worldDistance: 0, // how far the world has scrolled (px)
    hazards: [], // this level's open pits + scaffolding beams
    wreckingBalls: [], // this level's swinging wrecking balls
    fallingRocks: [], // this level's fallen-rock piles (ground obstacles)
    bombs: [], // this level's bombs, dropped by a plane overhead
    speedBoosts: [], // this level's speed-boost pads
    ramps: [], // this level's launch ramps (always right after a boost pad)
    speedBoostTimer: 0, // seconds left of 3x speed, 0 = not boosted
    firstAidKit: null, // this level's single bonus-life pickup (or null)
    checkpoints: [], // {atSeconds, levelTime, worldDistance} snapshots
    player: { y: GROUND_Y - PLAYER_SIZE, vy: 0, jumping: false, angle: 0 },
    celebrateTimer: 0,
    fallTimer: 0,
    titleTimer: 0,
    flashTimer: 0, // brief red flash when you lose a life
    pickupFlashTimer: 0, // brief green flash when you gain one
    glassBreakFlashTimer: 0, // brief white-blue flash when a roof pane gives way
    chaseGap: POLICE_GAP, // how far behind the robber the cop currently is (shrinks when he's caught)
    caughtTimer: 0, // counts up while the "caught"/"glassfall" animation plays
    caughtFinal: false, // true = this was the last life (game over), false = just lose a life
    deathCause: "caught", // "caught" (the cop) or "glassfall" (fell through broken glass)
  };
  updateHeartsHUD();
}

// --- 5. A TINY SEEDED RANDOM NUMBER GENERATOR ----------------------
// Normal Math.random() gives different numbers every time, but we
// want the SAME layout every time you retry a level (so a
// checkpoint actually makes sense to replay). A "seeded" random
// generator gives the same sequence of numbers every time you
// start it with the same seed number.
function makeRng(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- 6. DIFFICULTY FORMULAS ----------------------------------------
// How fast is the world scrolling right now? It depends on which
// level you're on (higher level = faster base speed) AND how long
// you've survived in this level (every 30 seconds, it ramps up).
function currentSpeed(level, levelTime) {
  const rampTiers = Math.floor(levelTime / RAMP_INTERVAL);
  return BASE_SPEED + (level - 1) * LEVEL_SPEED_STEP + rampTiers * RAMP_STEP;
}

// How much bare ground (minimum) must separate two hazards? This
// SHRINKS as the level number goes up, which is what makes later
// levels feel more relentless.
function minSpacingForLevel(level) {
  const t = (level - 1) / (TOTAL_LEVELS - 1); // 0 at level 1, 1 at level 10
  return MIN_SPACING_L1 + (MIN_SPACING_L10 - MIN_SPACING_L1) * t;
}

// What fraction of beams get a "high" wrecking ball (one that needs
// a beam-boosted jump) instead of no ball at all? This climbs with
// level too, so later levels lean on the beam trick more.
function highBallChanceForLevel(level) {
  const t = (level - 1) / (TOTAL_LEVELS - 1);
  return 0.15 + 0.35 * t;
}

// --- 7. BUILD A WHOLE LEVEL'S WORTH OF HAZARDS ---------------------
// We generate the entire level's pits, beams, wrecking balls, and
// its one first-aid kit up front, using a seed based on the level
// number. That way the layout is always the same for a given
// level, and mid-level checkpoints can just "rewind" the world
// position instead of regenerating anything.
function buildLevel(level) {
  const rng = makeRng(1000 + level * 37);
  const maxSpeedThisLevel = currentSpeed(level, LEVEL_DURATION - 1);
  const maxDistance = maxSpeedThisLevel * LEVEL_DURATION + 4000 * SCALE; // safety buffer

  // --- 7a. ground hazards: open pits (gaps) and scaffolding beams (platforms) ---
  const minSpacing = minSpacingForLevel(level);
  const hazards = [];
  let cursor = 900 * SCALE; // give the player a few clear seconds before hazard #1

  while (cursor < maxDistance) {
    const isGap = rng() < 0.5;
    const width = isGap ? GAP_WIDTH : PLATFORM_WIDTH;
    const height = isGap ? 0 : Math.round(PLATFORM_MIN_H + rng() * (PLATFORM_MAX_H - PLATFORM_MIN_H));

    hazards.push({ type: isGap ? "gap" : "platform", start: cursor, width, height });

    const spacing = minSpacing + rng() * SPACING_RANGE;
    cursor += width + spacing;
  }

  // --- 7b. wrecking balls: a SEPARATE random stream so the ground layout above never shifts ---
  const ballRng = makeRng(2000 + level * 53);
  const wreckingBalls = [];
  const highChance = highBallChanceForLevel(level);

  // "High" balls hang above a beam, timed so a jump launched from
  // the top of that beam is what clears them.
  hazards
    .filter((h) => h.type === "platform")
    .forEach((platform) => {
      if (ballRng() >= highChance) return;
      const gapAfter = 60 * SCALE + ballRng() * 80 * SCALE;
      const start = platform.start + platform.width + gapAfter;
      const bottom = GROUND_Y - (APEX + HIGH_BALL_MARGIN);
      wreckingBalls.push({ start, width: BALL_WIDTH, bottom, top: bottom - BALL_SIZE, high: true, sourcePlatform: platform });
    });

  // "Low" balls are sprinkled independently along open ground — no
  // beam needed, just a normal well-timed jump.
  let ballCursor = 1400 * SCALE;
  while (ballCursor < maxDistance) {
    if (ballRng() < 0.5) {
      const overlapsHazard = hazards.some(
        (h) => ballCursor < h.start + h.width + 40 * SCALE && ballCursor + BALL_WIDTH > h.start - 40 * SCALE
      );
      const overlapsBall = wreckingBalls.some(
        (b) => ballCursor < b.start + b.width + 40 * SCALE && ballCursor + BALL_WIDTH > b.start - 40 * SCALE
      );
      if (!overlapsHazard && !overlapsBall) {
        const bottom = GROUND_Y - APEX * 0.5;
        wreckingBalls.push({ start: ballCursor, width: BALL_WIDTH, bottom, top: bottom - BALL_SIZE, high: false });
      }
    }
    ballCursor += 700 * SCALE + ballRng() * 500 * SCALE;
  }

  wreckingBalls.sort((a, b) => a.start - b.start);

  // --- 7b2. falling rocks: rubble shaken loose by the demolition next
  // door — it lands and piles up on open ground, so it's a plain
  // ground obstacle you clear with a normal jump (same clearance math
  // as a "low" wrecking ball — see verifyPhysics()). A SEPARATE random
  // stream again, so nothing else ever shifts because of it.
  const rockRng = makeRng(3000 + level * 71);
  const fallingRocks = [];
  let rockCursor = 1100 * SCALE;
  while (rockCursor < maxDistance) {
    if (rockRng() < 0.4) {
      const clear = 50 * SCALE;
      const overlapsHazard = hazards.some(
        (h) => rockCursor < h.start + h.width + clear && rockCursor + ROCK_WIDTH > h.start - clear
      );
      const overlapsBall = wreckingBalls.some(
        (b) => rockCursor < b.start + b.width + clear && rockCursor + ROCK_WIDTH > b.start - clear
      );
      const overlapsRock = fallingRocks.some(
        (r) => rockCursor < r.start + r.width + clear && rockCursor + ROCK_WIDTH > r.start - clear
      );
      if (!overlapsHazard && !overlapsBall && !overlapsRock) {
        fallingRocks.push({
          start: rockCursor,
          width: ROCK_WIDTH,
          top: GROUND_Y - ROCK_HEIGHT,
          bottom: GROUND_Y,
        });
      }
    }
    rockCursor += 900 * SCALE + rockRng() * 600 * SCALE;
  }

  // --- 7b3. bombs: dropped by a plane flying over, off-screen above —
  // by the time you see one it's already sitting on the ground with a
  // lit fuse. A ground obstacle, same clearance math as a rock pile,
  // just rarer (its own separate random stream, again).
  const bombRng = makeRng(4000 + level * 83);
  const bombs = [];
  let bombCursor = 1600 * SCALE;
  while (bombCursor < maxDistance) {
    if (bombRng() < 0.3) {
      const clear = 60 * SCALE;
      const overlapsHazard = hazards.some(
        (h) => bombCursor < h.start + h.width + clear && bombCursor + BOMB_WIDTH > h.start - clear
      );
      const overlapsBall = wreckingBalls.some(
        (b) => bombCursor < b.start + b.width + clear && bombCursor + BOMB_WIDTH > b.start - clear
      );
      const overlapsRock = fallingRocks.some(
        (r) => bombCursor < r.start + r.width + clear && bombCursor + BOMB_WIDTH > r.start - clear
      );
      const overlapsBomb = bombs.some(
        (bomb) => bombCursor < bomb.start + bomb.width + clear && bombCursor + BOMB_WIDTH > bomb.start - clear
      );
      if (!overlapsHazard && !overlapsBall && !overlapsRock && !overlapsBomb) {
        bombs.push({
          start: bombCursor,
          width: BOMB_WIDTH,
          top: GROUND_Y - BOMB_HEIGHT,
          bottom: GROUND_Y,
        });
      }
    }
    bombCursor += 1300 * SCALE + bombRng() * 900 * SCALE;
  }

  // --- 7b4. speed-boost pads + ramps, always paired: a boost pad, then
  // a ramp BOOST_TO_RAMP_GAP later, so you're already flying by the
  // time you hit it. A ramp launch's apex is provably at least as high
  // as a beam-boosted jump's while boosted (see RAMP_BOOST_LAUNCH_VELOCITY
  // and the "boosted ramp" self-check), so it safely clears anything
  // it flies over the same way any jump does — the only thing worth
  // checking here is that the pad and ramp themselves don't get placed
  // physically on top of something else.
  const boostRng = makeRng(5000 + level * 97);
  const speedBoosts = [];
  const ramps = [];
  let boostCursor = 1200 * SCALE;
  while (boostCursor < maxDistance) {
    if (boostRng() < 0.9) {
      const boostStart = boostCursor;
      const rampStart = boostStart + BOOST_WIDTH + BOOST_TO_RAMP_GAP;
      const clear = 40 * SCALE;
      const spansOverlap = (aStart, aWidth, bStart, bWidth) =>
        aStart < bStart + bWidth + clear && aStart + aWidth > bStart - clear;
      const clashesEither = (otherStart, otherWidth) =>
        spansOverlap(boostStart, BOOST_WIDTH, otherStart, otherWidth) ||
        spansOverlap(rampStart, RAMP_WIDTH, otherStart, otherWidth);
      const blocked =
        hazards.some((h) => clashesEither(h.start, h.width)) ||
        wreckingBalls.some((b) => clashesEither(b.start, b.width)) ||
        fallingRocks.some((r) => clashesEither(r.start, r.width)) ||
        bombs.some((b) => clashesEither(b.start, b.width)) ||
        speedBoosts.some((b) => clashesEither(b.start, b.width)) ||
        ramps.some((r) => clashesEither(r.start, r.width));
      if (!blocked) {
        speedBoosts.push({ start: boostStart, width: BOOST_WIDTH });
        ramps.push({ start: rampStart, width: RAMP_WIDTH, top: GROUND_Y - RAMP_HEIGHT, bottom: GROUND_Y });
      }
    }
    boostCursor += 1200 * SCALE + boostRng() * 900 * SCALE;
  }

  // --- 7c. the first-aid kit: perched at the very top of a beam-boosted jump ---
  let firstAidKit = null;
  const highBalls = wreckingBalls.filter((b) => b.high);
  if (highBalls.length > 0) {
    const chosen = highBalls[Math.floor(highBalls.length / 2)]; // roughly mid-level
    const platformTop = GROUND_Y - PLATFORM_CLEARANCE - chosen.sourcePlatform.height;
    const peakY = platformTop - APEX; // the highest point a jump off that beam reaches
    firstAidKit = {
      start: chosen.start - BALL_WIDTH * 0.6,
      width: KIT_SIZE,
      top: peakY,
      bottom: peakY + KIT_SIZE,
      collected: false,
    };
  }

  return { hazards, wreckingBalls, fallingRocks, bombs, speedBoosts, ramps, firstAidKit };
}

// --- 8. STARTING / RESTARTING A LEVEL -------------------------------
function beginLevel(level) {
  const built = buildLevel(level);
  state.level = level;
  state.levelTime = 0;
  state.worldDistance = 0;
  state.hazards = built.hazards;
  state.wreckingBalls = built.wreckingBalls;
  state.fallingRocks = built.fallingRocks;
  state.bombs = built.bombs;
  state.speedBoosts = built.speedBoosts;
  state.ramps = built.ramps;
  state.speedBoostTimer = 0;
  state.firstAidKit = built.firstAidKit;
  state.checkpoints = [{ atSeconds: 0, levelTime: 0, worldDistance: 0 }];
  state.player.y = GROUND_Y - PLAYER_SIZE;
  state.player.vy = 0;
  state.player.jumping = false;
  state.mode = "playing";
  state.chaseGap = POLICE_GAP; // the cop starts each level back at a fair distance
  levelLabelEl.textContent = `LEVEL ${level} / ${TOTAL_LEVELS}`;
  overlay.hidden = true;
  // BUG FIX: pressing space early skips the title-drop's 5-second
  // timer and jumps straight into beginLevel() — but only the timer
  // path was ever hiding the title screen. Without this, the title
  // stayed stuck on top of live gameplay whenever you didn't wait it out.
  titleScreen.classList.add("title-screen--hidden");
}

// --- 9. JUMPING -----------------------------------------------------
function jump() {
  if (state.mode !== "playing") return;
  if (state.player.jumping) return; // no double-jumping
  state.player.vy = JUMP_VELOCITY;
  state.player.jumping = true;
}

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();
  handlePrimaryAction();
});
tapButton.addEventListener("click", handlePrimaryAction);
overlayButton.addEventListener("click", handlePrimaryAction);

function handlePrimaryAction() {
  if (state.mode === "intro" || state.mode === "ready") {
    beginLevel(1);
  } else if (state.mode === "playing") {
    jump();
  } else if (state.mode === "gameover" || state.mode === "victory") {
    newRun();
    // BUG FIX: the "GAME OVER" / "YOU WIN" box has to actually be
    // hidden here, or it just sits on screen forever afterwards —
    // covering the title screen and then the game itself — because
    // nothing else was ever telling it to go away.
    overlay.hidden = true;
    showTitleScreen();
  }
}

// --- 10. LOSING A LIFE AND RESPAWNING ---------------------------------
// Losing a life now means the cop actually catches the robber: the gap
// between them closes to zero over CATCH_CLOSE_DURATION, holds for a
// beat (CATCH_HOLD_DURATION) so it reads clearly, and only then does the
// game either respawn you at the last checkpoint or, if that was your
// last life, show GAME OVER. See the "caught" branch in update().
const CATCH_CLOSE_DURATION = 0.35;
const CATCH_HOLD_DURATION = 0.35;

// cause: "caught" (the cop gets you — wrecking balls, rock piles,
// bombs, and normal fire pits) or "glassfall" (you fell straight
// through a broken glass pane — no cop involved, you just drop).
function loseLife(cause) {
  state.lives -= 1;
  updateHeartsHUD();
  state.flashTimer = 0.25;
  state.caughtFinal = state.lives <= 0;
  state.caughtTimer = 0;
  state.deathCause = cause === "glassfall" ? "glassfall" : "caught";
  state.mode = state.deathCause;
}

// Called once the "caught"/"glassfall" animation has fully played out.
function resolveCatch() {
  if (state.caughtFinal) {
    state.mode = "gameover";
    overlayTitle.textContent = "GAME OVER";
    overlayMessage.textContent =
      state.deathCause === "glassfall"
        ? `You fell straight through the glass roof on Level ${state.level}. Every life used! Press SPACE to try again from Level 1.`
        : `The cop finally caught you on Level ${state.level}. Every life used! Press SPACE to try again from Level 1.`;
    overlayButton.textContent = "Restart";
    overlay.hidden = false;
    return;
  }

  // Rewind to the most recent checkpoint instead of the very start —
  // and give the cop back his fair starting distance too.
  const checkpoint = state.checkpoints[state.checkpoints.length - 1];
  state.levelTime = checkpoint.levelTime;
  state.worldDistance = checkpoint.worldDistance;
  state.player.y = GROUND_Y - PLAYER_SIZE;
  state.player.vy = 0;
  state.player.jumping = false;
  state.chaseGap = POLICE_GAP;
  state.mode = "playing";
}

function updateHeartsHUD() {
  heartsEl.innerHTML = "";
  // Normally there are 3 heart slots. If a first-aid kit has ever
  // pushed you to 4 lives this run, a 4th slot sticks around (even
  // if you later lose that life back) so you can see it happened.
  const slots = Math.max(LIVES_START, state.livesEverMax);
  for (let i = 0; i < slots; i++) {
    const heart = document.createElement("span");
    heart.className = i < state.lives ? "heart" : "heart heart--lost";
    heart.textContent = i < state.lives ? "♥" : "💔";
    heartsEl.appendChild(heart);
  }
}

// --- 11. COLLISIONS: FALLING, WRECKING BALLS, AND THE FIRST-AID KIT ------
// Find the one ground hazard (if any) whose span currently contains
// this track position. Hazards are spaced apart, so there's never
// more than one at a time.
function findHazardAt(trackPosition) {
  for (const hazard of state.hazards) {
    if (trackPosition >= hazard.start - 4 && trackPosition <= hazard.start + hazard.width + 4) {
      return hazard;
    }
  }
  return null;
}

// Wrecking balls are checked separately from ground hazards, since
// they swing in open air above whatever's happening on the ground
// (open ground, a beam, or a pit).
function hitAnyWreckingBall(trackPosition) {
  for (const ball of state.wreckingBalls) {
    const inRange = trackPosition > ball.start + FORGIVENESS && trackPosition < ball.start + ball.width - FORGIVENESS;
    if (!inRange) continue;
    const playerTop = state.player.y;
    const playerBottom = state.player.y + PLAYER_SIZE;
    const overlapsVertically = playerBottom > ball.top + FORGIVENESS && playerTop < ball.bottom - FORGIVENESS;
    if (overlapsVertically) return true;
  }
  return false;
}

// A fallen-rock pile sits right on the ground, so it's really no
// different from a "low" wrecking ball to clear: jump it, same as
// everything else. Same bounding-box check as above.
function hitAnyFallingRock(trackPosition) {
  for (const rock of state.fallingRocks) {
    const inRange = trackPosition > rock.start + FORGIVENESS && trackPosition < rock.start + rock.width - FORGIVENESS;
    if (!inRange) continue;
    const playerBottom = state.player.y + PLAYER_SIZE;
    const overlapsVertically = playerBottom > rock.top + FORGIVENESS;
    if (overlapsVertically) return true;
  }
  return false;
}

// A bomb sitting on the ground — jump it, same as a rock pile.
function hitAnyBomb(trackPosition) {
  for (const bomb of state.bombs) {
    const inRange = trackPosition > bomb.start + FORGIVENESS && trackPosition < bomb.start + bomb.width - FORGIVENESS;
    if (!inRange) continue;
    const playerBottom = state.player.y + PLAYER_SIZE;
    const overlapsVertically = playerBottom > bomb.top + FORGIVENESS;
    if (overlapsVertically) return true;
  }
  return false;
}

// Grabbing the first-aid kit is generous on purpose (PICKUP_LENIENCY
// widens its hitbox) — it's already hard enough to reach!
function tryCollectFirstAidKit(trackPosition) {
  const kit = state.firstAidKit;
  if (!kit || kit.collected) return;
  const inRange = trackPosition > kit.start - PICKUP_LENIENCY && trackPosition < kit.start + kit.width + PICKUP_LENIENCY;
  if (!inRange) return;
  const playerTop = state.player.y;
  const playerBottom = state.player.y + PLAYER_SIZE;
  const overlapsVertically = playerBottom > kit.top - PICKUP_LENIENCY && playerTop < kit.bottom + PICKUP_LENIENCY;
  if (!overlapsVertically) return;

  kit.collected = true;
  state.pickupFlashTimer = 0.35;
  if (state.lives < MAX_LIVES) {
    state.lives += 1;
    state.livesEverMax = Math.max(state.livesEverMax, state.lives);
    updateHeartsHUD();
  }
}

// A boost pad isn't a one-time pickup — ride over it as many times as
// it comes around, and each touch just (re-)sets the timer to a full
// SPEED_BOOST_DURATION.
function tryCollectSpeedBoost(trackPosition) {
  for (const boost of state.speedBoosts) {
    const inRange = trackPosition > boost.start - FORGIVENESS && trackPosition < boost.start + boost.width + FORGIVENESS;
    if (inRange) {
      state.speedBoostTimer = SPEED_BOOST_DURATION;
      return;
    }
  }
}

// A ramp is never a hazard — riding onto it while grounded just
// auto-launches you, exactly like pressing jump yourself (same
// JUMP_VELOCITY, so it clears everything a normal jump would).
function tryLaunchOffRamp(trackPosition) {
  if (state.player.jumping) return;
  for (const ramp of state.ramps) {
    const inRange = trackPosition > ramp.start - FORGIVENESS && trackPosition < ramp.start + ramp.width - FORGIVENESS;
    if (inRange) {
      state.player.vy = state.speedBoostTimer > 0 ? RAMP_BOOST_LAUNCH_VELOCITY : RAMP_LAUNCH_VELOCITY;
      state.player.jumping = true;
      return;
    }
  }
}

// The world-scroll speed right now, including a 3x multiplier while a
// speed boost is active. Used everywhere the actual current scroll
// rate matters (not just the level's base ramp), so lead-time
// calculations (like the glass-break warning) stay accurate even
// while boosted.
function currentEffectiveSpeed() {
  const base = currentSpeed(state.level, state.levelTime);
  return state.speedBoostTimer > 0 ? base * SPEED_BOOST_MULTIPLIER : base;
}

// Open a break-gap a fair distance ahead of the player, right now.
// Nudges forward (a bounded number of times) if that spot would land
// on top of something else already there, so it never stacks unfairly
// with an existing hazard.
function spawnGlassBreak() {
  const speed = currentEffectiveSpeed();
  let start = state.worldDistance + speed * GLASS_BREAK_WARNING;
  const clear = 70 * SCALE;

  const overlapsAnything = (s) => {
    const spansOverlap = (otherStart, otherWidth) => s < otherStart + otherWidth + clear && s + GAP_WIDTH > otherStart - clear;
    return (
      state.hazards.some((h) => spansOverlap(h.start, h.width)) ||
      state.wreckingBalls.some((b) => spansOverlap(b.start, b.width)) ||
      state.fallingRocks.some((r) => spansOverlap(r.start, r.width)) ||
      state.bombs.some((b) => spansOverlap(b.start, b.width)) ||
      (state.firstAidKit && !state.firstAidKit.collected && spansOverlap(state.firstAidKit.start, state.firstAidKit.width))
    );
  };

  let guard = 0;
  while (overlapsAnything(start) && guard < 20) {
    start += 60 * SCALE;
    guard += 1;
  }

  state.hazards.push({ type: "gap", start, width: GAP_WIDTH, height: 0, glassBreak: true });
  state.glassBreakFlashTimer = GLASS_BREAK_FLASH_SECONDS;
}

// --- 12. THE UPDATE STEP (runs every frame) ---------------------------
function update(dt) {
  ambientTime += dt; // background ambiance clock — always ticking

  if (state.mode === "intro") {
    state.titleTimer += dt;
    if (state.titleTimer >= TITLE_VISIBLE_SECONDS) {
      state.mode = "ready";
      titleScreen.classList.add("title-screen--hidden");
    }
    return;
  }

  if (state.mode === "ready") return; // waiting for the player to press space

  if (state.mode === "caught" || state.mode === "glassfall") {
    state.caughtTimer += dt;
    if (state.mode === "caught") {
      // The gap closes fast (a lunge/tackle), then holds at zero for a
      // beat so it's clearly readable before we respawn or show GAME OVER.
      const t = Math.min(1, state.caughtTimer / CATCH_CLOSE_DURATION);
      state.chaseGap = POLICE_GAP * (1 - t);
    } else {
      // glassfall: gravity takes over and the crate drops straight
      // down, out of view, through the broken pane — no cop involved.
      state.player.vy += GRAVITY * dt;
      state.player.y += state.player.vy * dt;
    }
    if (state.caughtTimer >= CATCH_CLOSE_DURATION + CATCH_HOLD_DURATION) {
      resolveCatch();
    }
    return;
  }

  if (state.mode === "celebrating") {
    state.celebrateTimer += dt;
    state.player.angle += dt * 10; // happy spin while bouncing
    if (state.celebrateTimer >= CELEBRATE_SECONDS) {
      state.mode = "falling";
      state.fallTimer = 0;
    }
    return;
  }

  if (state.mode === "falling") {
    state.fallTimer += dt;
    state.player.vy += GRAVITY * dt;
    state.player.y += state.player.vy * dt;
    if (state.fallTimer >= 1) {
      const nextLevel = state.level + 1;
      if (nextLevel > TOTAL_LEVELS) {
        state.mode = "victory";
        overlayTitle.textContent = "BLOCK LOCK — COMPLETE!";
        overlayMessage.textContent = "You cleared all 10 levels. That's the whole game! Press SPACE to play again.";
        overlayButton.textContent = "Play Again";
        overlay.hidden = false;
      } else {
        beginLevel(nextLevel);
      }
    }
    return;
  }

  if (state.flashTimer > 0) state.flashTimer -= dt;
  if (state.pickupFlashTimer > 0) state.pickupFlashTimer -= dt;
  if (state.glassBreakFlashTimer > 0) state.glassBreakFlashTimer -= dt;
  if (state.speedBoostTimer > 0) state.speedBoostTimer -= dt;

  if (state.mode !== "playing") return;

  // --- normal gameplay ---
  state.levelTime += dt;
  const speed = currentEffectiveSpeed(); // includes the 3x multiplier while boosted
  state.worldDistance += speed * dt;
  state.player.angle += (speed * dt) / (30 * SCALE); // tumbling roll animation, same visual speed at any SCALE

  // Record a checkpoint every time we cross a new 30-second mark.
  const tier = Math.floor(state.levelTime / RAMP_INTERVAL);
  const lastCheckpointTier = Math.floor(
    state.checkpoints[state.checkpoints.length - 1].levelTime / RAMP_INTERVAL
  );
  if (tier > lastCheckpointTier) {
    state.checkpoints.push({
      atSeconds: tier * RAMP_INTERVAL,
      levelTime: state.levelTime,
      worldDistance: state.worldDistance,
    });
    // The glass roof gives way somewhere: same 30-second mark as the
    // checkpoint and the speed ramp, so it stays deterministic and
    // checkpoint-safe (replaying from this checkpoint reaches the
    // same next tier and spawns the same next break).
    spawnGlassBreak();
  }

  // Level complete?
  if (state.levelTime >= LEVEL_DURATION) {
    state.mode = "celebrating";
    state.celebrateTimer = 0;
    state.player.jumping = false;
    state.player.vy = 0;
    progressFillEl.style.width = "100%";
    return;
  }
  progressFillEl.style.width = `${(state.levelTime / LEVEL_DURATION) * 100}%`;

  // --- physics: gravity always pulls the crate down ---
  const prevBottom = state.player.y + PLAYER_SIZE; // where we WERE, before this frame's motion
  state.player.vy += GRAVITY * dt;
  state.player.y += state.player.vy * dt;

  // Where is the world, right at the player's fixed screen position?
  const trackPosition = state.worldDistance;

  tryCollectFirstAidKit(trackPosition);
  tryCollectSpeedBoost(trackPosition);

  if (hitAnyWreckingBall(trackPosition)) {
    loseLife();
    return;
  }

  if (hitAnyFallingRock(trackPosition)) {
    loseLife();
    return;
  }

  if (hitAnyBomb(trackPosition)) {
    loseLife();
    return;
  }

  const hazard = findHazardAt(trackPosition);
  const groundLevel = GROUND_Y - PLAYER_SIZE;

  if (hazard && hazard.type === "gap") {
    const overGap = trackPosition > hazard.start + FORGIVENESS && trackPosition < hazard.start + hazard.width - FORGIVENESS;
    const isGrounded = state.player.y >= groundLevel - 2;
    if (overGap && isGrounded) {
      // A normal pit means the cop catches you. A broken glass pane
      // means you actually fall THROUGH it — a different, gravity-driven
      // sequence (see the "glassfall" branch in update()).
      loseLife(hazard.glassBreak ? "glassfall" : "caught");
      return;
    }
  }

  // Beams are "one-way" platforms: you can land ON TOP of one by
  // falling onto it from above, but you can also just run along the
  // ground underneath it (there's clear air below every beam) with
  // no penalty at all — they're completely safe.
  let landedOnPlatform = false;
  if (hazard && hazard.type === "platform") {
    const platformTop = GROUND_Y - PLATFORM_CLEARANCE - hazard.height;
    const newBottom = state.player.y + PLAYER_SIZE;
    const fallingOntoIt = state.player.vy >= 0 && prevBottom <= platformTop + 1 && newBottom >= platformTop;
    if (fallingOntoIt) {
      state.player.y = platformTop - PLAYER_SIZE;
      state.player.vy = 0;
      state.player.jumping = false;
      landedOnPlatform = true;
    }
  }

  // Land back on normal ground (only if we're not mid-air over a
  // gap, and didn't just land on a beam above).
  const standingOverGap = hazard && hazard.type === "gap" &&
    trackPosition > hazard.start && trackPosition < hazard.start + hazard.width;
  if (!landedOnPlatform && !standingOverGap && state.player.y >= groundLevel) {
    state.player.y = groundLevel;
    state.player.vy = 0;
    state.player.jumping = false;
  }

  // Ramps only launch someone who's actually on the ground right now —
  // checked last, once this frame's landing is settled.
  tryLaunchOffRamp(trackPosition);
}

// --- 13. DRAWING ----------------------------------------------------
function draw() {
  drawBackground();

  if (state.mode === "intro" || state.mode === "ready") {
    drawPlatformStrip(0);
    drawPoliceman();
    drawPlayer(0);
    return;
  }

  if (state.mode === "falling") {
    // The ground has disappeared — no platform, just the crate
    // dropping through open air into the next level.
    drawPlayer(state.worldDistance);
    return;
  }

  const trackPosition = state.worldDistance;
  drawPlatformStrip(trackPosition);
  drawHazards(trackPosition);
  drawSpeedBoosts(trackPosition);
  drawRamps(trackPosition);
  drawWreckingBalls(trackPosition);
  drawFallingRocks(trackPosition);
  drawBombs(trackPosition);
  drawFirstAidKit(trackPosition);
  drawPoliceman();
  drawPlayer(trackPosition);
  if (state.mode === "glassfall") drawGlassfallShards();
  if (state.speedBoostTimer > 0) drawSpeedLines();

  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 93, 93, ${state.flashTimer * 0.5})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  if (state.pickupFlashTimer > 0) {
    ctx.fillStyle = `rgba(95, 191, 114, ${state.pickupFlashTimer * 0.6})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  if (state.glassBreakFlashTimer > 0) {
    ctx.fillStyle = `rgba(214, 236, 245, ${(state.glassBreakFlashTimer / GLASS_BREAK_FLASH_SECONDS) * 0.45})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

// A shared color for "open sky showing through a gap" so the pit
// repaint always matches the background exactly.
const SKY_HORIZON_COLOR = "#c9d4db";

function drawBackground() {
  // An overcast sky gradient reads more like a real work site than
  // a flat color does.
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, "#7f93a6");
  grad.addColorStop(1, SKY_HORIZON_COLOR);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const distanceDrift = state ? (state.worldDistance || 0) : 0;

  // A hazy, far-away city skyline for depth — it drifts slower than
  // the clouds, which is what makes it read as "further away". Every
  // few seconds, one building in the skyline collapses (crumbles down
  // into a low rubble pile, throws up some dust, then gets rebuilt) —
  // it's purely a background spectacle, on its own real-time clock
  // (ambientTime), so it never touches hazards or fairness.
  ctx.fillStyle = "rgba(90, 102, 115, 0.30)";
  const buildingSpots = [
    [80, 130, 0.9], [260, 185, 0.6], [430, 115, 1.1],
    [620, 165, 0.7], [820, 150, 0.95], [1000, 195, 0.65],
  ];
  const buildingWrap = CANVAS_W + 320 * SCALE;
  const buildingDrift = distanceDrift * 0.02;

  const COLLAPSE_CYCLE = 6.5; // seconds between one building's collapses
  const COLLAPSE_FALL = 1.6; // seconds spent crumbling down
  const COLLAPSE_RUBBLE = 2.0; // seconds sitting as a low rubble pile
  const COLLAPSE_REBUILD = 0.8; // seconds rising back up, good as new
  const activeIndex = Math.floor(ambientTime / COLLAPSE_CYCLE) % buildingSpots.length;
  const localT = ambientTime % COLLAPSE_CYCLE;

  buildingSpots.forEach(([baseX, h, wScale], i) => {
    const x = (((baseX * SCALE - buildingDrift) % buildingWrap) + buildingWrap) % buildingWrap - 160 * SCALE;
    const bw = 90 * SCALE * wScale;

    let heightScale = 1;
    let dustAlpha = 0;
    let dustSpread = 0.5;
    if (i === activeIndex) {
      if (localT < COLLAPSE_FALL) {
        const p = localT / COLLAPSE_FALL;
        heightScale = 1 - p;
        dustAlpha = Math.sin(p * Math.PI) * 0.45;
        dustSpread = 0.4 + p * 0.5;
      } else if (localT < COLLAPSE_FALL + COLLAPSE_RUBBLE) {
        const rp = (localT - COLLAPSE_FALL) / COLLAPSE_RUBBLE;
        heightScale = 0.08;
        dustAlpha = Math.max(0, 0.3 * (1 - rp));
        dustSpread = 0.9;
      } else {
        const rp = (localT - COLLAPSE_FALL - COLLAPSE_RUBBLE) / COLLAPSE_REBUILD;
        heightScale = Math.min(1, 0.08 + rp * 0.92);
      }
    }

    const bh = h * SCALE * heightScale;
    ctx.fillRect(x, GROUND_Y - bh, bw, bh);

    if (dustAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(196, 190, 178, ${dustAlpha})`;
      const dustR = bw * dustSpread;
      ctx.beginPath();
      ctx.ellipse(x + bw / 2, GROUND_Y - bh * 0.4, dustR, dustR * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // Soft grey-white clouds, gently parallaxed for depth.
  ctx.fillStyle = "#eef2f5";
  const cloudWrap = CANVAS_W + 200 * SCALE;
  const cloudDrift = distanceDrift * 0.05;
  const cloudSpots = [
    [120, 60], [340, 40], [560, 80], [760, 50], [980, 65], [180, 130],
  ];
  cloudSpots.forEach(([baseX, baseY], i) => {
    const x = (((baseX * SCALE - cloudDrift) % cloudWrap) + cloudWrap) % cloudWrap - 100 * SCALE;
    drawCloud(x, baseY * SCALE, (30 + (i % 3) * 6) * SCALE);
  });
}

function drawCloud(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.9, y + r * 0.2, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x - r * 0.9, y + r * 0.2, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

// A yellow/black hazard-tape strip — used both on beam edges and
// around open pits, like real caution tape at a work site.
function drawHazardTape(x, y, width, thickness) {
  const stripeW = 14 * SCALE;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, thickness);
  ctx.clip();
  for (let sx = -thickness; sx < width + thickness; sx += stripeW) {
    ctx.fillStyle = Math.floor(sx / stripeW) % 2 === 0 ? "#f5c518" : "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(x + sx, y);
    ctx.lineTo(x + sx + stripeW * 0.6, y);
    ctx.lineTo(x + sx + stripeW * 0.6 - thickness, y + thickness);
    ctx.lineTo(x + sx - thickness, y + thickness);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatformStrip(trackPosition) {
  // You're running across a tempered-glass roof, high up — a hazy
  // dark void below, tinted glass panes above it, and a metal mullion
  // grid holding it all together. Every 30 seconds a pane gives way
  // somewhere ahead (see spawnGlassBreak()).
  const voidGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  voidGrad.addColorStop(0, "#2c3542");
  voidGrad.addColorStop(1, "#12161c");
  ctx.fillStyle = voidGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  ctx.fillStyle = "rgba(176, 214, 224, 0.32)";
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // a soft highlight right at the surface, and the metal frame lip
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 5 * SCALE);
  ctx.fillStyle = "#5b6470";
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 4 * SCALE);

  // scrolling metal mullions, dividing the roof into panes
  ctx.strokeStyle = "rgba(64, 78, 90, 0.6)";
  ctx.lineWidth = 3 * SCALE;
  const spacing = 140 * SCALE;
  const offset = trackPosition % spacing;
  for (let x = -offset; x < CANVAS_W; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 6 * SCALE);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }

  // faint crack-web texture here and there, hinting the glass is old
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  const spacing2 = 70 * SCALE;
  const offset2 = (trackPosition * 0.5) % spacing2;
  for (let x = -offset2; x < CANVAS_W; x += spacing2) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 18 * SCALE);
    ctx.lineTo(x + 9 * SCALE, GROUND_Y + 32 * SCALE);
    ctx.lineTo(x - 4 * SCALE, GROUND_Y + 42 * SCALE);
    ctx.stroke();
  }
}

function drawHazards(trackPosition) {
  for (const hazard of state.hazards) {
    const screenX = PLAYER_SCREEN_X + (hazard.start - trackPosition);
    if (screenX + hazard.width < -20 || screenX > CANVAS_W + 20) continue; // off-screen, skip

    if (hazard.type === "gap" && hazard.glassBreak) {
      drawGlassHole(screenX, hazard.width);
    } else if (hazard.type === "gap") {
      // cut a hole in the ground so open sky shows through, then
      // draw fire (and smoke) rising from it
      ctx.clearRect(screenX, GROUND_Y, hazard.width, CANVAS_H - GROUND_Y);
      ctx.fillStyle = SKY_HORIZON_COLOR;
      ctx.fillRect(screenX, GROUND_Y, hazard.width, CANVAS_H - GROUND_Y);
      drawFire(screenX, hazard.width);
      drawHazardTape(screenX, GROUND_Y - 6 * SCALE, hazard.width, 6 * SCALE);
    } else {
      drawPlatform(screenX, hazard.width, hazard.height);
    }
  }
}

// A steel scaffolding beam — safe to land on, or ignore and run
// underneath (there's always clear air below it). Rivets and a
// hazard-tape cap sell the "real construction beam" look.
function drawPlatform(screenX, width, height) {
  const top = GROUND_Y - PLATFORM_CLEARANCE - height;

  const grad = ctx.createLinearGradient(0, top, 0, top + height);
  grad.addColorStop(0, "#8b929b");
  grad.addColorStop(1, "#5b6470");
  ctx.fillStyle = grad;
  ctx.fillRect(screenX, top, width, height);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(screenX, top, width, height);

  ctx.fillStyle = "#3d4045";
  for (let rx = screenX + 8 * SCALE; rx < screenX + width - 4 * SCALE; rx += 16 * SCALE) {
    ctx.beginPath();
    ctx.arc(rx, top + height * 0.3, 2 * SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx, top + height * 0.7, 2 * SCALE, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHazardTape(screenX, top, width, 8 * SCALE);

  // a soft shadow beneath it, to sell "floating on open air"
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(screenX + width / 2, top + height + 12 * SCALE, width * 0.4, 5 * SCALE, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A hole in the glass roof, left by a pane that just broke — jagged
// shard teeth around the rim, and the same dark void showing through
// as the hazy underside painted in drawPlatformStrip(), instead of
// fire (this isn't a pit, it's a hole in what you're standing on).
function drawGlassHole(x, width) {
  ctx.clearRect(x, GROUND_Y - 4 * SCALE, width, CANVAS_H - GROUND_Y + 4 * SCALE);
  const voidGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  voidGrad.addColorStop(0, "#2c3542");
  voidGrad.addColorStop(1, "#0c0f13");
  ctx.fillStyle = voidGrad;
  ctx.fillRect(x, GROUND_Y - 4 * SCALE, width, CANVAS_H - GROUND_Y + 4 * SCALE);

  // jagged shard teeth biting in from both edges of the rim
  ctx.fillStyle = "rgba(203, 226, 234, 0.55)";
  const teeth = Math.max(3, Math.round(width / (14 * SCALE)));
  for (let i = 0; i < teeth; i++) {
    const tx = x + (i / teeth) * width;
    const tw = width / teeth;
    const th = (6 + ((i * 37) % 5) * 3) * SCALE;
    ctx.beginPath();
    ctx.moveTo(tx, GROUND_Y - 4 * SCALE);
    ctx.lineTo(tx + tw * 0.5, GROUND_Y - 4 * SCALE + th);
    ctx.lineTo(tx + tw, GROUND_Y - 4 * SCALE);
    ctx.closePath();
    ctx.fill();
  }

  // a scatter of loose shard fragments still resting near the rim
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < width; i += 18 * SCALE) {
    const sx = x + i + 9 * SCALE;
    const sy = GROUND_Y + 10 * SCALE + ((i * 13) % 20) * SCALE * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx - 4 * SCALE, sy);
    ctx.lineTo(sx + 3 * SCALE, sy - 3 * SCALE);
    ctx.lineTo(sx + 1 * SCALE, sy + 4 * SCALE);
    ctx.closePath();
    ctx.stroke();
  }
}

// Loose shards falling alongside the crate while it drops through the
// broken pane — purely cosmetic, timed off the same caughtTimer that
// drives the fall itself.
function drawGlassfallShards() {
  const cx = PLAYER_SCREEN_X + PLAYER_SIZE / 2;
  const cy = state.player.y + PLAYER_SIZE / 2;
  const t = state.caughtTimer;
  ctx.fillStyle = "rgba(203, 226, 234, 0.7)";
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const spread = 20 * SCALE + t * 90 * SCALE;
    const sx = cx + Math.cos(a) * spread;
    const sy = cy + Math.sin(a) * spread * 0.6 - t * 60 * SCALE;
    const s = 5 * SCALE;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a * 2 + t * 6);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, s * 0.5);
    ctx.lineTo(-s * 0.7, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawFire(x, width) {
  const t = performance.now() / 120;
  ctx.fillStyle = "#ff5d5d";
  for (let i = 0; i < width; i += 14 * SCALE) {
    const flicker = Math.sin(t + i) * 6 * SCALE;
    const fx = x + i + 7 * SCALE;
    ctx.beginPath();
    ctx.moveTo(fx - 6 * SCALE, GROUND_Y);
    ctx.quadraticCurveTo(fx - 10 * SCALE, GROUND_Y - (16 * SCALE) - flicker, fx, GROUND_Y - (30 * SCALE) - flicker);
    ctx.quadraticCurveTo(fx + 10 * SCALE, GROUND_Y - (16 * SCALE) - flicker, fx + 6 * SCALE, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#ffb347";
  for (let i = 0; i < width; i += 14 * SCALE) {
    const flicker = Math.sin(t + i + 1) * 4 * SCALE;
    const fx = x + i + 7 * SCALE;
    ctx.beginPath();
    ctx.moveTo(fx - 3 * SCALE, GROUND_Y);
    ctx.quadraticCurveTo(fx - 5 * SCALE, GROUND_Y - (10 * SCALE) - flicker, fx, GROUND_Y - (18 * SCALE) - flicker);
    ctx.quadraticCurveTo(fx + 5 * SCALE, GROUND_Y - (10 * SCALE) - flicker, fx + 3 * SCALE, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  // rising smoke wisps
  const st = performance.now() / 500;
  ctx.fillStyle = "rgba(70,70,75,0.25)";
  for (let i = 0; i < width; i += 28 * SCALE) {
    const sway = Math.sin(st + i) * 8 * SCALE;
    const sx = x + i + 14 * SCALE + sway;
    const rise = (st * 10 * SCALE) % (60 * SCALE);
    const sy = GROUND_Y - 40 * SCALE - rise;
    ctx.beginPath();
    ctx.arc(sx, sy, 10 * SCALE, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A heavy iron wrecking ball, swinging on a crane chain that
// stretches up off the top of the screen. Its collision box (the
// dangerous zone) is fixed — only the drawing sways a little, for
// flavor, so what you see always stays close to what can hurt you.
function drawWreckingBalls(trackPosition) {
  const t = performance.now() / 1000;
  state.wreckingBalls.forEach((ball, idx) => {
    const anchorX = PLAYER_SCREEN_X + (ball.start - trackPosition) + ball.width / 2;
    if (anchorX < -80 * SCALE || anchorX > CANVAS_W + 80 * SCALE) return;

    const swing = Math.sin(t * 1.3 + idx * 1.7) * 8 * SCALE;
    const cy = (ball.top + ball.bottom) / 2;
    const cx = anchorX + swing;
    const r = BALL_SIZE / 2;

    // chain, running up off-screen to an unseen crane
    ctx.strokeStyle = "#5a5f66";
    ctx.lineWidth = 4 * SCALE;
    ctx.beginPath();
    ctx.moveTo(anchorX, 0);
    ctx.lineTo(cx, cy - r);
    ctx.stroke();
    ctx.fillStyle = "#3d4045";
    for (let s = 0.15; s < 0.95; s += 0.18) {
      const lx = anchorX + (cx - anchorX) * s;
      const ly = (cy - r) * s;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 3 * SCALE, 5 * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // shadow on the ground below it
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 4 * SCALE, r * 0.7, 8 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();

    // the iron ball itself, with a metallic highlight
    const metal = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    metal.addColorStop(0, "#6b6f76");
    metal.addColorStop(0.6, "#33363c");
    metal.addColorStop(1, "#17181b");
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // a caution-yellow band around its middle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#f5c518";
    ctx.fillRect(cx - r, cy - r * 0.16, r * 2, r * 0.32);
    ctx.restore();
  });
}

// A glowing speed-boost pad, flush with the ground — forward-pointing
// chevrons scrolling in place to read as "step here to go fast."
function drawSpeedBoosts(trackPosition) {
  for (const boost of state.speedBoosts) {
    const screenX = PLAYER_SCREEN_X + (boost.start - trackPosition);
    if (screenX + boost.width < -20 * SCALE || screenX > CANVAS_W + 20 * SCALE) continue;

    const pulse = 0.6 + Math.sin(performance.now() / 220) * 0.4;
    ctx.fillStyle = `rgba(255, 200, 60, ${0.35 + pulse * 0.2})`;
    ctx.fillRect(screenX, GROUND_Y - 4 * SCALE, boost.width, 8 * SCALE);

    ctx.fillStyle = "#ffb020";
    const chevronW = 14 * SCALE;
    const scroll = (performance.now() / 90) % chevronW;
    for (let cx0 = screenX - chevronW + scroll; cx0 < screenX + boost.width; cx0 += chevronW) {
      const cx0Clamped = Math.max(screenX, cx0);
      if (cx0 + chevronW < screenX || cx0 > screenX + boost.width) continue;
      ctx.beginPath();
      ctx.moveTo(cx0, GROUND_Y - 3 * SCALE);
      ctx.lineTo(cx0 + chevronW * 0.5, GROUND_Y - 10 * SCALE);
      ctx.lineTo(cx0 + chevronW, GROUND_Y - 3 * SCALE);
      ctx.lineTo(cx0 + chevronW * 0.5, GROUND_Y - 6 * SCALE);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// A launch ramp — a simple wedge, safe to ride, that auto-launches
// anyone who hits it while grounded (see tryLaunchOffRamp()).
function drawRamps(trackPosition) {
  for (const ramp of state.ramps) {
    const screenX = PLAYER_SCREEN_X + (ramp.start - trackPosition);
    if (screenX + ramp.width < -20 * SCALE || screenX > CANVAS_W + 20 * SCALE) continue;

    const grad = ctx.createLinearGradient(0, ramp.top, 0, ramp.bottom);
    grad.addColorStop(0, "#9aa0a6");
    grad.addColorStop(1, "#6b7278");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(screenX, ramp.bottom);
    ctx.lineTo(screenX + ramp.width, ramp.top);
    ctx.lineTo(screenX + ramp.width, ramp.bottom);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawHazardTape(screenX + ramp.width - 6 * SCALE, ramp.top, 6 * SCALE, ramp.bottom - ramp.top);
  }
}

// Horizontal motion-streaks across the screen while boosted, plus a
// small "3X BOOST" readout so it's obvious why everything's flying by.
function drawSpeedLines() {
  const t = performance.now() / 40;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3 * SCALE;
  for (let i = 0; i < 6; i++) {
    const yy = (i * 137) % CANVAS_H;
    const len = 90 * SCALE + (i % 3) * 30 * SCALE;
    const x = CANVAS_W - ((t * 6 + i * 90) % (CANVAS_W + len));
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + len, yy);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 176, 32, 0.85)";
  ctx.font = `${20 * SCALE}px "Press Start 2P", monospace`;
  ctx.textAlign = "right";
  ctx.fillText("3X BOOST", CANVAS_W - 24 * SCALE, 56 * SCALE);
  ctx.textAlign = "left";
}

// The bonus-life first-aid kit.
function drawFirstAidKit(trackPosition) {
  const kit = state.firstAidKit;
  if (!kit || kit.collected) return;

  const screenX = PLAYER_SCREEN_X + (kit.start - trackPosition) + kit.width / 2;
  if (screenX < -60 * SCALE || screenX > CANVAS_W + 60 * SCALE) return;

  const t = performance.now() / 400;
  const bob = Math.sin(t) * 5 * SCALE;
  const cy = (kit.top + kit.bottom) / 2 + bob;
  const s = kit.width;

  ctx.save();
  ctx.translate(screenX, cy);

  // a soft glow so it reads as something special worth reaching for
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2f2ee";
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-s / 2, -s / 2, s, s);

  ctx.strokeStyle = "#8a8f94";
  ctx.lineWidth = 3 * SCALE;
  ctx.beginPath();
  ctx.moveTo(-s * 0.18, -s / 2);
  ctx.lineTo(-s * 0.18, -s / 2 - s * 0.15);
  ctx.lineTo(s * 0.18, -s / 2 - s * 0.15);
  ctx.lineTo(s * 0.18, -s / 2);
  ctx.stroke();

  ctx.fillStyle = "#e0302f";
  const armW = s * 0.18;
  const armL = s * 0.6;
  ctx.fillRect(-armW / 2, -armL / 2, armW, armL);
  ctx.fillRect(-armL / 2, -armW / 2, armL, armW);

  ctx.restore();
}

// A pile of rubble that shook loose from the demolition next door and
// landed on the ground — just an obstacle to jump, same as anything
// else sitting on the ground.
function drawFallingRocks(trackPosition) {
  for (const rock of state.fallingRocks) {
    const screenX = PLAYER_SCREEN_X + (rock.start - trackPosition);
    if (screenX + rock.width < -20 * SCALE || screenX > CANVAS_W + 20 * SCALE) continue;

    const baseY = rock.bottom;
    const w = rock.width;
    const h = rock.bottom - rock.top;

    // ground crack / impact mark
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 2 * SCALE;
    ctx.beginPath();
    ctx.moveTo(screenX - 6 * SCALE, baseY);
    ctx.lineTo(screenX + w * 0.3, baseY - 4 * SCALE);
    ctx.moveTo(screenX + w + 6 * SCALE, baseY);
    ctx.lineTo(screenX + w * 0.7, baseY - 4 * SCALE);
    ctx.stroke();

    // three overlapping jagged rock chunks, piled up
    const chunks = [
      { cx: screenX + w * 0.28, cy: baseY - h * 0.32, r: h * 0.42, fill: "#8a8178" },
      { cx: screenX + w * 0.68, cy: baseY - h * 0.28, r: h * 0.38, fill: "#6f675f" },
      { cx: screenX + w * 0.5, cy: baseY - h * 0.62, r: h * 0.34, fill: "#9a9186" },
    ];
    chunks.forEach(({ cx, cy, r, fill }) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      const spikes = 6;
      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        const rr = r * (0.8 + ((i % 2) * 0.3));
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // a little drifting dust above it, as though more is still settling
    const t = performance.now() / 1000;
    ctx.fillStyle = "rgba(200,195,185,0.25)";
    ctx.beginPath();
    ctx.ellipse(
      screenX + w * 0.5,
      baseY - h - 6 * SCALE - Math.sin(t * 1.4) * 3 * SCALE,
      w * 0.32,
      w * 0.14,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

// A dropped bomb — a round cartoon bomb with a lit fuse, sitting in a
// small scorch mark. A little plane silhouette glides by well above
// it, purely for flavor (it's not part of the hitbox — the bomb
// itself, sitting on the ground, is the only thing that can hurt you,
// with the same normal-jump clearance as everything else here).
function drawBombs(trackPosition) {
  for (const bomb of state.bombs) {
    const screenX = PLAYER_SCREEN_X + (bomb.start - trackPosition) + bomb.width / 2;
    if (screenX < -60 * SCALE || screenX > CANVAS_W + 60 * SCALE) continue;

    const groundY = bomb.bottom;
    const r = (bomb.bottom - bomb.top) * 0.42;
    const bodyCy = groundY - r * 1.05;

    // scorch mark on the ground
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(screenX, groundY - 2 * SCALE, r * 1.6, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // the plane that dropped it, drifting by high overhead
    const planeBob = Math.sin(performance.now() / 900 + bomb.start) * 6 * SCALE;
    const planeX = screenX + Math.sin(performance.now() / 2600 + bomb.start) * 40 * SCALE;
    const planeY = 90 * SCALE + planeBob;
    ctx.fillStyle = "rgba(60, 68, 78, 0.55)";
    ctx.beginPath();
    ctx.ellipse(planeX, planeY, 26 * SCALE, 7 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(planeX, planeY, 6 * SCALE, 14 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();

    // bomb body
    ctx.fillStyle = "#20242b";
    ctx.beginPath();
    ctx.arc(screenX, bodyCy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(screenX - r * 0.35, bodyCy - r * 0.35, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // fin
    ctx.fillStyle = "#20242b";
    ctx.beginPath();
    ctx.moveTo(screenX - r * 0.5, bodyCy + r * 0.7);
    ctx.lineTo(screenX - r * 1.1, bodyCy + r * 1.3);
    ctx.lineTo(screenX - r * 0.1, bodyCy + r * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(screenX + r * 0.5, bodyCy + r * 0.7);
    ctx.lineTo(screenX + r * 1.1, bodyCy + r * 1.3);
    ctx.lineTo(screenX + r * 0.1, bodyCy + r * 1.0);
    ctx.closePath();
    ctx.fill();

    // fuse + spark
    ctx.strokeStyle = "#5c3d1c";
    ctx.lineWidth = 2.5 * SCALE;
    ctx.beginPath();
    ctx.moveTo(screenX, bodyCy - r);
    ctx.quadraticCurveTo(screenX + r * 0.5, bodyCy - r * 1.6, screenX + r * 0.3, bodyCy - r * 2);
    ctx.stroke();

    const sparkPulse = 0.6 + Math.sin(performance.now() / 90) * 0.4;
    ctx.fillStyle = `rgba(255, 193, 69, ${0.6 + sparkPulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(screenX + r * 0.3, bodyCy - r * 2, 4 * SCALE * sparkPulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A shared wheel — solid tire, hub, and a few spinning spokes. Used by
// both the robber's motorbike and the cop's bicycle.
function drawWheel(cx, cy, r, spin) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a4a4a";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.rotate(spin);
  const spokes = 5;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

// The player: a robber on a motorbike — striped shirt, domino mask,
// beanie, loot sack over the shoulder, riding a two-wheeler instead of
// running on foot. The wheels' spin is tied to `angle`, the same
// speed-matched value that used to drive the running stride, so it
// still reads as "moving exactly as fast as the world scrolls."
function drawPlayer(trackPosition) {
  const x = PLAYER_SCREEN_X;
  const y = state.mode === "celebrating"
    ? state.player.y - Math.abs(Math.sin(state.player.angle)) * 26 * SCALE
    : state.player.y;

  const cx = x + PLAYER_SIZE / 2;
  const cy = y + PLAYER_SIZE / 2;

  const phase = state.player.angle;
  const inAir = state.player.jumping || state.mode === "falling" || state.mode === "glassfall";
  const caught = state.mode === "caught";
  const glassfall = state.mode === "glassfall";
  const lean = caught
    ? -Math.min(1, state.caughtTimer / CATCH_CLOSE_DURATION) * 0.5 // wobbling as the cop grabs him
    : glassfall
    ? Math.min(1, state.caughtTimer / 0.3) * 0.2 // tipping back as the floor gives way
    : inAir
    ? Math.max(-0.22, Math.min(0.22, -state.player.vy / (900 * SCALE))) // leaning into the jump arc
    : 0;

  const torsoW = PLAYER_SIZE * 0.5;
  const torsoH = PLAYER_SIZE * 0.42;
  const headR = PLAYER_SIZE * 0.22;

  const wheelR = PLAYER_SIZE * 0.26;
  const wheelY = PLAYER_SIZE * 0.34;
  const rearX = -PLAYER_SIZE * 0.26;
  const frontX = PLAYER_SIZE * 0.3;
  const seatY = -PLAYER_SIZE * 0.02;
  const wheelSpin = phase * 2.2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lean);
  ctx.lineCap = "round";

  drawWheel(rearX, wheelY, wheelR, wheelSpin);
  drawWheel(frontX, wheelY, wheelR * 0.92, wheelSpin);

  // frame — a bold red motorbike frame linking both wheels to the seat
  ctx.strokeStyle = "#c0392b";
  ctx.lineWidth = PLAYER_SIZE * 0.08;
  ctx.beginPath();
  ctx.moveTo(rearX, wheelY);
  ctx.lineTo(0, seatY);
  ctx.lineTo(frontX, wheelY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, seatY);
  ctx.lineTo(frontX * 0.75, -PLAYER_SIZE * 0.3);
  ctx.stroke();

  // small engine block + headlight
  ctx.fillStyle = "#26282c";
  ctx.fillRect(rearX * 0.25, wheelY - PLAYER_SIZE * 0.2, PLAYER_SIZE * 0.26, PLAYER_SIZE * 0.18);
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(frontX + 2 * SCALE, wheelY - PLAYER_SIZE * 0.24, PLAYER_SIZE * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // exhaust puff while grounded and moving
  if (!inAir && !caught && !glassfall) {
    const puffAlpha = 0.25 + Math.max(0, Math.sin(phase * 3)) * 0.15;
    ctx.fillStyle = `rgba(180,180,180,${puffAlpha})`;
    ctx.beginPath();
    ctx.arc(rearX - PLAYER_SIZE * 0.3, wheelY - PLAYER_SIZE * 0.05, PLAYER_SIZE * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  // handlebar
  ctx.strokeStyle = "#111";
  ctx.lineWidth = PLAYER_SIZE * 0.06;
  ctx.beginPath();
  ctx.moveTo(frontX * 0.6, -PLAYER_SIZE * 0.32);
  ctx.lineTo(frontX * 0.95, -PLAYER_SIZE * 0.32);
  ctx.stroke();

  // rider, leaning forward over the tank
  ctx.save();
  ctx.translate(-PLAYER_SIZE * 0.02, seatY - torsoH * 0.55);
  ctx.rotate(-0.25);

  // arm reaching down to the handlebar grip
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = PLAYER_SIZE * 0.13;
  ctx.beginPath();
  ctx.moveTo(torsoW * 0.25, -torsoH * 0.2);
  ctx.lineTo(torsoW * 0.95, torsoH * 0.75);
  ctx.stroke();

  // torso — black & white horizontal stripes, the classic "robber" shirt
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH);
  ctx.fillStyle = "#f4f0e6";
  const stripeH = torsoH / 5;
  for (let i = 0; i < 5; i += 2) {
    ctx.fillRect(-torsoW / 2, -torsoH / 2 + i * stripeH, torsoW, stripeH);
  }

  // loot sack slung on the back
  ctx.save();
  ctx.translate(-torsoW * 0.42, torsoH * 0.1);
  ctx.rotate(0.2);
  ctx.fillStyle = "#a9743c";
  ctx.beginPath();
  ctx.ellipse(0, 0, PLAYER_SIZE * 0.2, PLAYER_SIZE * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // head
  ctx.fillStyle = "#d8a06a";
  ctx.beginPath();
  ctx.arc(0, -torsoH / 2 - headR * 0.5, headR, 0, Math.PI * 2);
  ctx.fill();

  // domino eye mask
  ctx.fillStyle = "#111";
  ctx.fillRect(-headR * 0.85, -torsoH / 2 - headR * 0.7, headR * 1.7, headR * 0.4);

  // beanie
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(0, -torsoH / 2 - headR * 0.8, headR * 0.95, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-headR * 0.95, -torsoH / 2 - headR * 0.8, headR * 1.9, headR * 0.18);

  ctx.restore(); // rider

  // legs resting on the footpegs
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = PLAYER_SIZE * 0.15;
  ctx.beginPath();
  ctx.moveTo(-PLAYER_SIZE * 0.05, seatY - torsoH * 0.1);
  ctx.lineTo(rearX * 0.4, wheelY - PLAYER_SIZE * 0.02);
  ctx.stroke();

  ctx.restore(); // whole bike
}

// --- 13b. THE CHASE (background police officer) -------------------------
// Purely cosmetic: always drawn at the same fixed distance behind the
// robber on screen, so it never touches collisions, physics, or fairness.
// It's here only to sell the "being chased" feeling.
const POLICE_SIZE = PLAYER_SIZE * 0.92;
const POLICE_GAP = 100 * SCALE; // how far behind the robber, in screen pixels

function drawPoliceman() {
  // In normal running, the cop sits at a fixed screen distance behind
  // the robber. During a "caught" sequence, state.chaseGap counts down
  // from POLICE_GAP to 0 (see update()), so he visibly closes the gap
  // and actually catches up — now on a bicycle instead of on foot.
  const gap = state.chaseGap;
  const cx = PLAYER_SCREEN_X - gap + POLICE_SIZE / 2;
  const groundLevel = GROUND_Y - POLICE_SIZE;
  const bob = Math.abs(Math.sin(state.player.angle * 1.15)) * 3 * SCALE;
  const cy = groundLevel + POLICE_SIZE / 2 - bob;

  const closing = gap < POLICE_GAP * 0.9; // near or mid-lunge
  const phase = state.player.angle + Math.PI; // out of step with the robber's engine
  const reach = Math.max(0, 1 - gap / (POLICE_GAP * 0.5));
  const lean = closing ? -reach * 0.3 : 0; // lean into the lunge
  const wheelSpin = phase * 2.2;

  const torsoW = POLICE_SIZE * 0.5;
  const torsoH = POLICE_SIZE * 0.42;
  const headR = POLICE_SIZE * 0.22;
  const wheelR = POLICE_SIZE * 0.3;
  const wheelY = POLICE_SIZE * 0.36;
  const rearX = -POLICE_SIZE * 0.28;
  const frontX = POLICE_SIZE * 0.28;
  const seatY = -POLICE_SIZE * 0.08;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lean);
  ctx.globalAlpha = 0.92; // a touch of haze, since it's a bit further back
  ctx.lineCap = "round";

  drawWheel(rearX, wheelY, wheelR, wheelSpin);
  drawWheel(frontX, wheelY, wheelR, wheelSpin);

  // bicycle frame — thin navy diamond
  ctx.strokeStyle = "#1a2a52";
  ctx.lineWidth = POLICE_SIZE * 0.055;
  ctx.beginPath();
  ctx.moveTo(rearX, wheelY);
  ctx.lineTo(0, seatY);
  ctx.lineTo(frontX, wheelY);
  ctx.lineTo(rearX * 0.2, seatY + POLICE_SIZE * 0.05);
  ctx.lineTo(rearX, wheelY);
  ctx.moveTo(0, seatY);
  ctx.lineTo(frontX * 0.8, -POLICE_SIZE * 0.28);
  ctx.stroke();

  // handlebar
  ctx.beginPath();
  ctx.moveTo(frontX * 0.55, -POLICE_SIZE * 0.3);
  ctx.lineTo(frontX * 0.95, -POLICE_SIZE * 0.3);
  ctx.stroke();

  // pedal crank, spinning along with the wheels
  ctx.save();
  ctx.translate(rearX * 0.25, wheelY - POLICE_SIZE * 0.02);
  ctx.rotate(wheelSpin * 0.6);
  ctx.strokeStyle = "#101a33";
  ctx.lineWidth = POLICE_SIZE * 0.05;
  ctx.beginPath();
  ctx.moveTo(-POLICE_SIZE * 0.12, 0);
  ctx.lineTo(POLICE_SIZE * 0.12, 0);
  ctx.stroke();
  ctx.restore();

  // torso — navy uniform, gold trim, badge
  ctx.save();
  ctx.translate(0, seatY - torsoH * 0.55);
  ctx.rotate(-0.15);

  // arm — reaching to the handlebar normally, throwing forward into a
  // grab once the gap has meaningfully closed
  const reachExtra = 1 + reach * 0.7;
  ctx.strokeStyle = "#16244a";
  ctx.lineWidth = POLICE_SIZE * 0.13;
  ctx.beginPath();
  ctx.moveTo(torsoW * 0.2, -torsoH * 0.15);
  ctx.lineTo(torsoW * 0.9 * reachExtra, torsoH * 0.7 * reachExtra);
  ctx.stroke();

  ctx.fillStyle = "#1a2a52";
  ctx.fillRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH);
  ctx.fillStyle = "#d8b84a";
  ctx.fillRect(-torsoW / 2, -torsoH / 2, torsoW, torsoH * 0.14);
  ctx.beginPath();
  ctx.arc(-torsoW * 0.18, -torsoH * 0.05, POLICE_SIZE * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d8a06a";
  ctx.beginPath();
  ctx.arc(0, -torsoH / 2 - headR * 0.5, headR, 0, Math.PI * 2);
  ctx.fill();

  // peaked police cap with a gold badge
  ctx.fillStyle = "#12193a";
  ctx.beginPath();
  ctx.arc(0, -torsoH / 2 - headR * 0.8, headR * 0.95, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-headR * 1.05, -torsoH / 2 - headR * 0.5, headR * 2.1, headR * 0.16);
  ctx.fillStyle = "#d8b84a";
  ctx.beginPath();
  ctx.arc(0, -torsoH / 2 - headR, headR * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // torso

  // legs bent toward the pedals
  ctx.strokeStyle = "#101a33";
  ctx.lineWidth = POLICE_SIZE * 0.14;
  ctx.beginPath();
  ctx.moveTo(-POLICE_SIZE * 0.05, seatY - torsoH * 0.1);
  ctx.lineTo(rearX * 0.35, wheelY - POLICE_SIZE * 0.05);
  ctx.stroke();

  ctx.restore();
}

// --- 14. TITLE SCREEN -------------------------------------------------
function showTitleScreen() {
  titleScreen.classList.remove("title-screen--hidden");
  state.titleTimer = 0;
}

// --- 15. THE MAIN LOOP -------------------------------------------------
let lastTime = null;
function loop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  dt = Math.min(dt, 1 / 20); // avoid huge jumps if the tab was in the background
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

// --- 16. A QUICK SELF-CHECK (see the browser console) --------------------
// TRY THIS! Open your browser's developer console (F12) to see this
// print out. It's a sanity check that: a jump can always clear an
// open pit; a "low" wrecking ball is clearable without a beam; and
// a "high" one is ONLY clearable by jumping off a beam (never with
// a flat-ground jump alone), so the level is always fair but the
// beam trick is always actually necessary.
function verifyPhysics() {
  const gapCrossTime = GAP_WIDTH / BASE_SPEED;
  const normalJumpBottom = GROUND_Y - APEX;
  const lowBallBottom = GROUND_Y - APEX * 0.5;
  const highBallBottom = GROUND_Y - (APEX + HIGH_BALL_MARGIN);
  const shortestPlatformTop = GROUND_Y - PLATFORM_CLEARANCE - PLATFORM_MIN_H;
  const boostedJumpBottom = shortestPlatformTop - APEX;
  const rockTop = GROUND_Y - ROCK_HEIGHT;
  const bombTop = GROUND_Y - BOMB_HEIGHT;

  console.log("[BLOCK LOCK self-check]");
  console.log(`  jump airtime ${AIRTIME.toFixed(2)}s, apex ${APEX.toFixed(0)}px`);
  console.log(
    `  slowest pit-cross time ${gapCrossTime.toFixed(2)}s vs airtime ${AIRTIME.toFixed(2)}s -> ${
      gapCrossTime < AIRTIME ? "OK, always clearable" : "FAIL"
    }`
  );
  console.log(
    `  low wrecking ball: normal jump reaches y=${normalJumpBottom.toFixed(0)}, needs <= ${lowBallBottom.toFixed(0)} -> ${
      normalJumpBottom <= lowBallBottom ? "OK" : "FAIL"
    }`
  );
  console.log(
    `  high wrecking ball: normal jump alone reaches only y=${normalJumpBottom.toFixed(0)}, needs <= ${highBallBottom.toFixed(
      0
    )} -> ${normalJumpBottom > highBallBottom ? "OK, correctly needs a beam" : "WARNING: reachable without one"}`
  );
  console.log(
    `  high wrecking ball with a beam boost: reaches y=${boostedJumpBottom.toFixed(0)}, needs <= ${highBallBottom.toFixed(0)} -> ${
      boostedJumpBottom <= highBallBottom ? "OK, always clearable from any beam" : "FAIL"
    }`
  );
  console.log(
    `  falling rock pile: normal jump reaches y=${normalJumpBottom.toFixed(0)}, needs <= ${rockTop.toFixed(0)} -> ${
      normalJumpBottom <= rockTop ? "OK, always clearable" : "FAIL"
    }`
  );
  console.log(
    `  bomb: normal jump reaches y=${normalJumpBottom.toFixed(0)}, needs <= ${bombTop.toFixed(0)} -> ${
      normalJumpBottom <= bombTop ? "OK, always clearable" : "FAIL"
    }`
  );
  const rampBoostApex = (RAMP_BOOST_LAUNCH_VELOCITY * RAMP_BOOST_LAUNCH_VELOCITY) / (2 * GRAVITY);
  const rampBoostBottom = GROUND_Y - rampBoostApex;
  console.log(
    `  boosted ramp: reaches y=${rampBoostBottom.toFixed(0)}, needs <= ${highBallBottom.toFixed(0)} (a high ball's height) -> ${
      rampBoostBottom <= highBallBottom ? "OK, clears even a high ball mid-flight" : "FAIL"
    }`
  );
}

// --- 17. GO! ----------------------------------------------------------
newRun();
verifyPhysics();
requestAnimationFrame(loop);
