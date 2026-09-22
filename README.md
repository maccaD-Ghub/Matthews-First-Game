# Matthews-First-Game — BLOCK LOCK 🟧

A wooden crate tumbles across a demolition site, dodging open pits and a
swinging wrecking ball across 10 levels, using safe steel beams to jump
higher when it needs to. This is Matthew's first coding project — the code
is written with lots of comments so it can be read, changed, and broken (on
purpose!) to learn how it works.

## How to play it

Open `index.html` in a web browser (just double-click the file). Press
**SPACE** to start, and press **SPACE** again to jump. On a phone or
tablet, tap the **TAP TO JUMP** button instead.

- Jump over open **pits** (with fire and rising smoke) — falling in costs a
  life.
- Watch out for the swinging **wrecking ball** — touching one costs a life
  too. Some hang low enough to clear with a normal jump; others hang higher
  than any normal jump can reach.
- Steel **beams** (scaffolding, with caution tape on top) are completely
  safe. Land on top of one (or ignore it and run underneath — there's clear
  air below every beam) to get some extra height, which is exactly what you
  need to clear the higher wrecking balls.
- A **first-aid kit** appears once per level, perched right at the very
  peak of a beam-boosted jump. Grab it and you gain a life back — even
  above your normal 3, up to a maximum of 4.
- You have **3 lives for the whole game** (4 if you've grabbed a first-aid
  kit). Lose one and you respawn at the nearest checkpoint (about every 30
  seconds), not all the way back at the start of the level.
- Survive **3 minutes** to clear a level. There are **10 levels**, and each
  one is faster and busier than the last.
- Run out of lives and it's game over — back to Level 1.

## What's in this folder

| File | What it does |
|---|---|
| `index.html` | The page structure: the canvas, the hearts, the progress bar, the buttons. |
| `style.css` | All the colors, fonts, and layout. |
| `game.js` | The actual game logic — physics, levels, difficulty, drawing. |

`game.js` is the interesting one. It's split into numbered sections (open it
and search for `--- 1.`, `--- 2.`, and so on) that go roughly in the order
things happen: set up the canvas, read the difficulty settings, generate a
level's pits/beams/wrecking balls/first-aid kit, run the jump physics,
check for collisions, draw everything, repeat forever.

## The "control panel" (section 2 of game.js)

Near the top of `game.js` there's a block of settings called **TUNING
KNOBS**. This is the whole game's difficulty (and size!) in one place —
change a number, save the file, and reload the page to feel the difference:

- `SCALE` — the size of the entire game. Every other number in this section
  is written as "a plain number times `SCALE`", so changing this one knob
  makes everything bigger or smaller together, in proportion.
- `BASE_SPEED` / `LEVEL_SPEED_STEP` — how fast the world scrolls, and how
  much faster each level gets.
- `RAMP_STEP` / `RAMP_INTERVAL` — how much extra speed you get every 30
  seconds *within* a level.
- `MIN_SPACING_L1` / `MIN_SPACING_L10` — how close together the hazards are
  allowed to be, on the easiest and hardest levels.
- `GRAVITY` / `JUMP_VELOCITY` — how "floaty" or "snappy" the jump feels.
- `HIGH_BALL_MARGIN` — how much higher a "high" wrecking ball hangs above
  what a normal jump can reach (in other words, how strictly it requires a
  beam to clear).
- `MAX_LIVES` — the cap on how many lives a first-aid kit can take you to.

There's even a built-in safety check! Open your browser's developer console
(press F12, or right-click → Inspect → Console) and you'll see messages
confirming a jump can always clear a pit, that "low" wrecking balls are
clearable without a beam, and that "high" wrecking balls are clearable from
a beam but never from flat ground alone. If you change gravity, jump power,
or the ball margin, keep an eye on those messages — they'll warn you if
something's become impossible (or accidentally too easy).

## Try this! (small changes, big learning)

1. **Change the crate's color.** Search `game.js` for the `drawPlayer`
   function and swap in different colors for the wood/metal fill.
2. **Make the whole game bigger or smaller.** Change `SCALE` at the top of
   the tuning knobs — try `2` or `5` and reload.
3. **Make the game easier or harder.** Change `MIN_SPACING_L10` to a bigger
   number (closer to `MIN_SPACING_L1`) to make Level 10 much less brutal —
   or smaller for something truly evil.
4. **Change how many lives you get**, or how high the cap goes — find
   `LIVES_START` and `MAX_LIVES`.
5. **Make levels shorter**, so you can test Level 10 without playing for 27
   minutes first — change `LEVEL_DURATION` from `180` to something like
   `30` while you're testing, then change it back.
6. **Make more wrecking balls "high" ones** — look at
   `highBallChanceForLevel()` and raise the numbers, so beams matter even
   more.
7. **Add a double jump** — in the `jump()` function, the line
   `if (state.player.jumping) return;` is what blocks a second jump in
   mid-air. What happens if you remove it?

Every one of these is a one- or two-line change. Save the file, reload
`index.html` in your browser, and see what happened. If you don't like it,
just change the number back!
