// input.js — keyboard and mouse control for Gobble Run.
// Arrows / WASD / Space jump and duck, P pauses, M mutes, Enter confirms.
// The mouse can play the whole game too: click (or tap) to jump, hold to
// duck, and click the big buttons on the title and end screens.

export class Input {
  constructor(canvas) {
    this.jumpHeld = false;
    this.duckHeld = false;
    this.jumpPressed = false; // edge trigger, consumed by the game each frame
    this.confirmPressed = false;
    this.pausePressed = false;
    this.mutePressed = false;
    this.clickPoint = null; // {x, y} in canvas pixels, consumed each frame
    this.pointerDown = false;
    this._attach(canvas);
  }

  _attach(canvas) {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const code = event.code;
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
        this.jumpHeld = true;
        this.jumpPressed = true;
        event.preventDefault();
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        this.duckHeld = true;
        event.preventDefault();
      } else if (code === 'Enter') {
        this.confirmPressed = true;
      } else if (code === 'KeyP' || code === 'Escape') {
        this.pausePressed = true;
      } else if (code === 'KeyM') {
        this.mutePressed = true;
      }
    });
    window.addEventListener('keyup', (event) => {
      const code = event.code;
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') this.jumpHeld = false;
      if (code === 'ArrowDown' || code === 'KeyS') this.duckHeld = false;
    });
    canvas.addEventListener('pointerdown', (event) => {
      this.pointerDown = true;
      this.jumpHeld = true;
      this.jumpPressed = true;
      this.clickPoint = { x: event.clientX, y: event.clientY };
    });
    window.addEventListener('pointerup', () => {
      this.pointerDown = false;
      this.jumpHeld = false;
    });
    canvas.addEventListener('pointermove', (event) => {
      // Holding the pointer low on the screen ducks; high jumps are on click.
      this.duckHeld = this.pointerDown && event.clientY > window.innerHeight * 0.72;
    });
  }

  // Called once per frame by the game loop after it has read the edges.
  consumeEdges() {
    this.jumpPressed = false;
    this.confirmPressed = false;
    this.pausePressed = false;
    this.mutePressed = false;
    this.clickPoint = null;
  }
}
