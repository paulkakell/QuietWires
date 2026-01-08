# Quiet Wires

Quiet Wires is a browser-based, choice-driven ASCII text adventure designed to run entirely on GitHub Pages.
It is intentionally built as a static site with all game logic and world content handled client-side, making it easy to expand, fork, and collaborate on.

The project emphasizes atmosphere, exploration, and consequence over combat or statistics. The world grows through choices, flags, and subtle gating rather than explicit menus or maps.

---

## Features

- Fully static, no backend required
- Runs entirely in the browser
- GitHub Pages ready
- Choice-driven gameplay with keyboard shortcuts (1 to 9)
- JSON-defined world and content
- Save, load, export, and import game state
- Designed to scale to hundreds or thousands of rooms
- Validator script to prevent broken worlds

---

## Repository Structure

```
quiet-wires/
├── docs/
│   ├── index.html        # Main entry point (GitHub Pages)
│   ├── style.css         # Terminal-style UI
│   ├── game.js           # Game engine
│   └── content/
│       └── world.json    # World definition
├── scripts/
│   └── validate_world.py # World integrity validator
└── README.md
```

---

## Running Locally

Option 1: Open directly  
Open `docs/index.html` in any modern browser.

Option 2: Serve locally  
```
python3 -m http.server
```
Then open `http://localhost:8000/docs/`

---

## Publishing to GitHub Pages

1. Push this repository to GitHub
2. Go to Settings → Pages
3. Source: Deploy from a branch
4. Branch: main
5. Folder: /docs

Your game will be live at:
```
https://<username>.github.io/<repository-name>/
```

---

## World Format

Each room follows a consistent schema:

```
{
  "title": "Room Title",
  "text": [
    "Narrative line one.",
    "Narrative line two."
  ],
  "choices": [
    {
      "label": "Choice text",
      "to": "target_room_id",
      "requires": ["hasItem:item_id", "flag:some_flag"],
      "effects": {
        "addItems": ["item_id"],
        "removeItems": ["item_id"],
        "setFlags": ["flag_name"]
      },
      "once": true,
      "lockText": "Shown if requirements are not met."
    }
  ]
}
```

Only `title`, `text`, and `choices` are required.

---

## Validation

Before committing large changes, run:

```
python3 scripts/validate_world.py docs/content/world.json
```

The validator checks:
- Broken links
- Missing rooms
- Invalid requirement tokens
- Empty or malformed rooms
- Unreachable areas

---

## Scaling Strategy

- Generate rooms in batches of 25 to 50
- Validate after each batch
- Commit frequently
- Keep deterministic IDs per district
- Avoid generating the entire world in one pass

---

## Design Philosophy

Quiet Wires favors restraint and implication over exposition.
Systems stay simple so the writing can carry weight.

---

## License

Use, modify, and publish freely.

Quiet stories travel farther than loud ones.
