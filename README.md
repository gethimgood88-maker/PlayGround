# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/gethimgood88-maker/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/gethimgood88-maker/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/gethimgood88-maker/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/gethimgood88-maker/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/gethimgood88-maker/PlayGround).
- 🛠️ [Check build runs](https://github.com/gethimgood88-maker/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/gethimgood88-maker/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/gethimgood88-maker).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->

---

## SUBDIVISION 666

A 3D browser game where every open house in Whispering Pines is a Doom-style
level. Tour the cul-de-sac, clear five possessed homes with a shotgun, and close
the sale before the listing agent closes you.

Built with Vite + Three.js. All geometry, textures, animation, soundtrack, and
sound effects are generated procedurally in the browser — no external assets.

### Play

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the printed URL. Production build: `npm run build`.

### Controls

| Action | Phone / tablet | Desktop |
| --- | --- | --- |
| Walk | Left virtual joystick | `WASD` / arrow keys |
| Look | Drag anywhere on the scene | Drag or pointer-lock the mouse |
| Enter / exit | `ENTER` action button | `E` |
| Fire | `FIRE` button | Click / `Space` |
| Pause | `Ⅱ` button | `Esc` / `Ⅱ` button |

### The neighborhood

- **The Miller House** — 1958 ranch, two waves.
- **Casa Vega** — sun-drenched villa, two waves.
- **The Ashby Split** — groovy split-level, three waves.
- **The Glass House** — minimalist statement, three waves.
- **Holloway Manor** — sealed until four souls are cleansed. Four waves and
  the Seller himself.

Clearing a house marks it sold. Clear four to unseal Holloway Manor; clear all
five to win. Dying offers a retry or a trip back to the neighborhood.

### Notes

- Fully responsive portrait/landscape layout with safe-area insets and touch
  controls; desktop hides the joystick and uses keyboard + mouse.
- Rendering is capped at 1.75× device pixel ratio for phone/tablet performance.
- Screenshots used during development are in `screenshots/` (git-ignored).
