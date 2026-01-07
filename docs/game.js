"use strict";

const STORAGE_KEY = "quiet_wires_save_v1";

const ui = {
  screen: document.getElementById("screen"),
  choices: document.getElementById("choices"),
  status: document.getElementById("status"),
  btnNew: document.getElementById("btnNew"),
  btnSave: document.getElementById("btnSave"),
  btnLoad: document.getElementById("btnLoad"),
  btnExport: document.getElementById("btnExport"),
  btnImport: document.getElementById("btnImport")
};

const Game = {
  world: null,
  state: null,

  async init() {
    this.world = await this.loadWorld();
    this.state = this.defaultState(this.world.startRoomId);

    this.bindUI();
    this.renderRoom(true);
    this.renderStatus();
  },

  async loadWorld() {
    const res = await fetch("./content/world.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load content/world.json");
    return await res.json();
  },

  defaultState(startRoomId) {
    return {
      roomId: startRoomId,
      turns: 0,
      inventory: [],
      flags: {},
      visited: {}
    };
  },

  bindUI() {
    ui.btnNew.addEventListener("click", () => {
      this.state = this.defaultState(this.world.startRoomId);
      this.clearLog();
      this.renderRoom(true);
      this.renderStatus();
      this.log("New game started.", "System");
    });

    ui.btnSave.addEventListener("click", () => this.save());
    ui.btnLoad.addEventListener("click", () => this.load());

    ui.btnExport.addEventListener("click", () => {
      const blob = this.exportSave();
      prompt("Copy your save data:", blob);
    });

    ui.btnImport.addEventListener("click", () => {
      const blob = prompt("Paste save data:");
      if (!blob) return;
      this.importSave(blob);
    });

    window.addEventListener("keydown", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      const n = Number(e.key);
      if (!Number.isFinite(n) || n < 1 || n > 9) return;

      const btn = ui.choices.querySelector(`button[data-index="${n - 1}"]`);
      if (btn && !btn.disabled) btn.click();
    });
  },

  roomById(id) {
    const r = this.world.rooms[id];
    if (!r) throw new Error(`Unknown room id: ${id}`);
    return r;
  },

  hasItem(id) {
    return this.state.inventory.includes(id);
  },

  flagIsSet(key) {
    return Boolean(this.state.flags[key]);
  },

  setFlag(key) {
    this.state.flags[key] = true;
  },

  checkRequires(requires) {
    if (!requires || requires.length === 0) return { ok: true };

    for (const req of requires) {
      if (req.startsWith("hasItem:")) {
        const item = req.slice("hasItem:".length);
        if (!this.hasItem(item)) return { ok: false, reason: "missingItem" };
      } else if (req.startsWith("flag:")) {
        const flag = req.slice("flag:".length);
        if (!this.flagIsSet(flag)) return { ok: false, reason: "missingFlag" };
      } else {
        return { ok: false, reason: "unknownRequirement" };
      }
    }
    return { ok: true };
  },

  applyEffects(effects) {
    if (!effects) return;

    if (effects.addItems) {
      for (const it of effects.addItems) {
        if (!this.state.inventory.includes(it)) this.state.inventory.push(it);
      }
    }

    if (effects.removeItems) {
      this.state.inventory = this.state.inventory.filter((x) => !effects.removeItems.includes(x));
    }

    if (effects.setFlags) {
      for (const f of effects.setFlags) this.setFlag(f);
    }
  },

  applyOnEnter(room) {
    const onEnter = room.onEnter;
    if (!onEnter) return;
    if (onEnter.setFlags) {
      for (const f of onEnter.setFlags) this.setFlag(f);
    }
  },

  clearLog() {
    ui.screen.innerHTML = "";
  },

  log(text, meta = null) {
    const p = document.createElement("p");
    p.className = "line";

    if (meta) {
      const m = document.createElement("div");
      m.className = "meta";
      m.textContent = meta;
      p.appendChild(m);
    }

    const t = document.createElement("div");
    t.textContent = text;
    p.appendChild(t);

    ui.screen.appendChild(p);
    ui.screen.scrollTop = ui.screen.scrollHeight;
  },

  renderRoom(isFirst = false) {
    const room = this.roomById(this.state.roomId);

    this.state.turns += isFirst ? 0 : 1;
    this.state.visited[this.state.roomId] = true;

    this.applyOnEnter(room);

    this.log(room.title, "Location");
    for (const line of room.text) this.log(line);

    this.renderChoices(room);
    this.renderStatus();
  },

  renderChoices(room) {
    ui.choices.innerHTML = "";

    const choices = room.choices || [];
    choices.forEach((choice, idx) => {
      const li = document.createElement("li");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choiceBtn";
      btn.dataset.index = String(idx);

      const onceKey = `once:${this.state.roomId}:${idx}`;
      const alreadyUsed = Boolean(this.state.flags[onceKey]);

      const req = this.checkRequires(choice.requires);
      const locked = !req.ok;
      const disabled = (choice.once && alreadyUsed) || locked;

      let label = choice.label;
      if (choice.once && alreadyUsed) label = `${label} (done)`;

      btn.textContent = `${idx + 1}. ${label}`;
      btn.disabled = disabled;

      btn.addEventListener("click", () => {
        this.log(choice.label, "Choice");

        const reqNow = this.checkRequires(choice.requires);
        if (!reqNow.ok) {
          if (choice.lockText) this.log(choice.lockText);
          this.renderRoom(true);
          return;
        }

        this.applyEffects(choice.effects);

        if (choice.once) this.setFlag(onceKey);

        if (choice.log) this.log(choice.log);

        this.state.roomId = choice.to;
        this.renderRoom(false);
      });

      li.appendChild(btn);
      ui.choices.appendChild(li);
    });
  },

  renderStatus() {
    const inv = this.state.inventory.length ? this.state.inventory.join(", ") : "empty";
    const flagsCount = Object.keys(this.state.flags).length;

    ui.status.textContent = `Turns: ${this.state.turns} | Inventory: ${inv} | Flags: ${flagsCount}`;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.log("Game saved.", "System");
  },

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.log("No save found.", "System");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      this.state = parsed;
      this.clearLog();
      this.renderRoom(true);
      this.log("Game loaded.", "System");
    } catch {
      this.log("Save data was corrupted.", "System");
    }
  },

  exportSave() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.state))));
  },

  importSave(blob) {
    try {
      const json = decodeURIComponent(escape(atob(blob)));
      const parsed = JSON.parse(json);
      this.state = parsed;
      this.clearLog();
      this.renderRoom(true);
      this.log("Save imported.", "System");
    } catch {
      this.log("Import failed.", "System");
    }
  }
};

Game.init().catch((e) => {
  console.error(e);
  ui.screen.textContent = "Failed to start game. Check console.";
});
