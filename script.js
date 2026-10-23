(() => {
  "use strict";

  const SAVE_KEY = "meuBichinhoSave_v1";
  const colors = [
    { name: "Mel", fur: "#dba773", light: "#efc894" },
    { name: "Rosinha", fur: "#eaa5ae", light: "#f6ccd0" },
    { name: "Menta", fur: "#91c5a9", light: "#c3e2cb" },
    { name: "Lavanda", fur: "#a99bd0", light: "#d0c7e8" },
    { name: "Nuvem", fur: "#dfd3c8", light: "#f5ede4" }
  ];
  const sharkColors = ["#79a9ba", "#dc929b", "#82bba0", "#9a8bc4", "#a3aeb9"];
  const pets = [
    { id: "rabbit", name: "Coelhinho", emoji: "🐰", personality: "curioso", hello: "Adoro descobrir coisas novas!" },
    { id: "cat", name: "Gatinho", emoji: "🐱", personality: "carinhoso", hello: "Miau! Já gostei de você." },
    { id: "puppy", name: "Cachorrinho", emoji: "🐶", personality: "aventureiro", hello: "Au! Vai ser tão divertido!" },
    { id: "dragon", name: "Dragãozinho", emoji: "🐉", personality: "sonhador", hello: "Minha primeira aventura é com você!" },
    { id: "shark", name: "Tubarãozinho", emoji: "🦈", personality: "brincalhão", hello: "Splash! Vamos explorar o oceano juntos!" }
  ];
  const shop = {
    food: [
      { id: "berry", name: "Frutinhas", emoji: "🍓", price: 8, effect: "food" },
      { id: "cake", name: "Bolo fofo", emoji: "🧁", price: 15, effect: "food" },
      { id: "cookie", name: "Biscoitinho", emoji: "🍪", price: 11, effect: "food" }
    ],
    toys: [
      { id: "ball", name: "Bolinha", emoji: "⚽", price: 20, effect: "toy" },
      { id: "kite", name: "Pipa colorida", emoji: "🪁", price: 25, effect: "toy" },
      { id: "yarn", name: "Novelo", emoji: "🧶", price: 18, effect: "toy" }
    ],
    style: [
      { id: "bow", name: "Laço fofo", emoji: "🎀", price: 25, effect: "accessory" },
      { id: "hat", name: "Chapéu", emoji: "🎩", price: 35, effect: "accessory" },
      { id: "crown", name: "Coroa", emoji: "👑", price: 50, effect: "accessory" }
    ],
    room: [
      { id: "flower", name: "Vasinho", emoji: "🌷", price: 20, effect: "decor" },
      { id: "star", name: "Luz de estrela", emoji: "🌟", price: 30, effect: "decor" },
      { id: "teddy", name: "Ursinho", emoji: "🧸", price: 35, effect: "decor" }
    ]
  };
  const achievements = [
    { id: "first_care", title: "Amor à primeira vista", detail: "Cuide do seu bichinho pela primeira vez", icon: "💝", test: s => s.careCount >= 1 },
    { id: "well_fed", title: "Barriguinha feliz", detail: "Alimente seu bichinho 5 vezes", icon: "🍓", test: s => s.feedCount >= 5 },
    { id: "playful", title: "Parceiros de aventura", detail: "Jogue 3 minijogos", icon: "🎮", test: s => s.gamesPlayed >= 3 },
    { id: "collector", title: "Colecionador fofo", detail: "Compre 3 itens na lojinha", icon: "🛍️", test: s => s.itemsBought >= 3 },
    { id: "bestie", title: "Amizade de verdade", detail: "Alcance o nível 3", icon: "✨", test: s => s.level >= 3 }
  ];
  const defaultState = () => ({
    pet: null, colorIndex: 0, coins: 60,
    stats: { hunger: 82, happiness: 82, energy: 82, hygiene: 82, health: 100 },
    xp: 0, level: 1, inventory: {}, accessory: null, decor: [],
    adoptedAt: Date.now(), lastTick: Date.now(), sleeping: false,
    sound: false, careCount: 0, feedCount: 0, gamesPlayed: 0,
    itemsBought: 0, moments: [], unlocked: [], welcomePending: false
  });
  let state = loadState();
  let activeCategory = "food";
  let selectedPet = pets[0].id;
  let selectedColor = state.colorIndex || 0;
  let toastTimer;
  let gameTimer;
  let gameSpawnTimer;
  let audioContext;
  let memoryGame = null;

  function loadState() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return defaultState();
      const parsed = JSON.parse(saved);
      const fresh = defaultState();
      const result = { ...fresh, ...parsed, stats: { ...fresh.stats, ...(parsed.stats || {}) } };
      result.inventory = parsed.inventory && typeof parsed.inventory === "object" ? parsed.inventory : {};
      result.moments = Array.isArray(parsed.moments) ? parsed.moments : [];
      result.unlocked = Array.isArray(parsed.unlocked) ? parsed.unlocked : [];
      result.decor = Array.isArray(parsed.decor) ? parsed.decor : [];
      result.lastTick = Number.isFinite(parsed.lastTick) ? parsed.lastTick : Date.now();
      return result;
    } catch (error) {
      console.error("Não foi possível carregar o progresso salvo.", error);
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Não foi possível salvar o progresso.", error);
      showToast("Não foi possível salvar. Confira o espaço disponível no navegador.");
    }
  }

  function clamp(value) { return Math.max(0, Math.min(100, value)); }
  function getPet() { return pets.find(p => p.id === state.pet) || pets[0]; }
  function getItem(id) { return Object.values(shop).flat().find(item => item.id === id); }
  function addXP(amount) {
    state.xp += amount;
    while (state.xp >= state.level * 100) {
      state.xp -= state.level * 100;
      state.level += 1;
      state.coins += 15;
      showToast(`Subiu para o nível ${state.level}! +15 moedas de presente ✨`);
      sound("level");
      addMoment("🎉", "Novo nível!");
      if (state.level === 3) {
        showToast("Forma celestial desbloqueada! Seu bichinho está brilhando! 🌟");
        addMoment("🌟", "Nova forma desbloqueada!");
      }
    }
  }
  function applyElapsedTime() {
    const elapsedMinutes = Math.min(Math.max(0, (Date.now() - state.lastTick) / 60000), 24 * 60);
    if (!elapsedMinutes || !state.pet) return;
    const rate = elapsedMinutes / 60;
    state.stats.hunger = clamp(state.stats.hunger - rate * 3.1);
    state.stats.happiness = clamp(state.stats.happiness - rate * 1.4);
    state.stats.hygiene = clamp(state.stats.hygiene - rate * 1.7);
    state.stats.energy = state.sleeping
      ? clamp(state.stats.energy + rate * 12)
      : clamp(state.stats.energy - rate * 2.1);
    const neglected = ["hunger", "happiness", "hygiene", "energy"].filter(key => state.stats[key] < 18).length;
    if (neglected) state.stats.health = clamp(state.stats.health - rate * neglected * 1.2);
    else if (state.stats.health < 100 && state.stats.hunger > 55 && state.stats.hygiene > 50) state.stats.health = clamp(state.stats.health + rate * .6);
    state.lastTick = Date.now();
  }
  function render() {
    document.getElementById("coin-count").textContent = state.coins;
    document.getElementById("shop-coins").textContent = state.coins;
    document.getElementById("level-number").textContent = `Nível ${state.level}`;
    document.getElementById("xp-number").textContent = state.xp;
    document.getElementById("xp-next").textContent = state.level * 100;
    const xpPercent = Math.round(state.xp / (state.level * 100) * 100);
    document.getElementById("xp-percent").textContent = `${xpPercent}%`;
    document.getElementById("xp-bar").style.width = `${xpPercent}%`;
    ["hunger", "happiness", "energy", "hygiene", "health"].forEach(key => {
      const value = Math.round(state.stats[key]);
      document.getElementById(`${key}-value`).textContent = `${value}%`;
      document.getElementById(`${key}-bar`).style.width = `${value}%`;
      document.getElementById(`${key}-bar`).style.filter = value < 25 ? "saturate(.7) brightness(.92)" : "";
    });
    const pet = getPet();
    document.getElementById("pet-name-heading").textContent = state.name || "amigo";
    document.getElementById("profile-name").textContent = state.name || "Seu bichinho";
    document.getElementById("profile-kind").textContent = `${pet.name} · ${pet.personality}`;
    document.getElementById("profile-avatar").textContent = pet.emoji;
    document.getElementById("profile-age").textContent = Math.max(0, Math.floor((Date.now() - state.adoptedAt) / 86400000));
    document.getElementById("profile-moments").textContent = state.moments.length;
    document.getElementById("profile-achievements").textContent = state.unlocked.length;
    const coatColor = pet.id === "shark" ? sharkColors[state.colorIndex] : colors[state.colorIndex]?.fur;
    document.getElementById("pet").style.setProperty("--fur", coatColor || colors[0].fur);
    document.getElementById("pet").style.setProperty("--fur-light", colors[state.colorIndex]?.light || colors[0].light);
    document.getElementById("pet").dataset.species = pet.id;
    document.getElementById("pet").classList.toggle("evolved", state.level >= 3);
    document.getElementById("pet-accessory").textContent = state.accessory ? getItem(state.accessory)?.emoji || "" : "";
    renderRoomDecor();
    document.getElementById("sound-toggle").textContent = state.sound ? "🔊" : "🔇";
    document.getElementById("sound-toggle").setAttribute("aria-label", state.sound ? "Desativar sons" : "Ativar sons");
    document.getElementById("sleep-label").textContent = state.sleeping ? "Acordar" : "Dormir";
    document.getElementById("room-caption").textContent = state.sleeping ? "Shhh... hora de descansar." : getMoodText();
    document.getElementById("pet").dataset.mood = currentMood();
    renderShop();
    renderInventory();
    renderAchievements();
    renderAlbum();
    checkAchievements();
  }
  function currentMood() {
    if (state.sleeping) return "sleep";
    if (state.stats.health < 30 || state.stats.happiness < 20) return "sad";
    if (state.stats.hunger < 22) return "hungry";
    if (state.stats.energy < 18) return "tired";
    return "happy";
  }
  function getMoodText() {
    const mood = currentMood();
    return ({ sad: "Um carinho faria bem...", hungry: "Uma comidinha seria tão boa!", tired: "Um soninho ia cair bem.", happy: "Um dia lindo para brincar!", sleep: "Shhh... hora de descansar." })[mood];
  }
  function renderShop() {
    const container = document.getElementById("shop-items");
    container.replaceChildren();
    shop[activeCategory].forEach(item => {
      const owned = ["accessory", "decor"].includes(item.effect) && (state.accessory === item.id || state.decor.includes(item.id));
      const button = document.createElement("button");
      button.type = "button";
      button.className = `shop-item${owned ? " owned" : ""}`;
      button.disabled = !owned && state.coins < item.price;
      button.innerHTML = `<span class="item-emoji">${item.emoji}</span><strong>${item.name}</strong><small>${owned ? "✓ no seu cantinho" : `🪙 ${item.price}`}</small>`;
      button.addEventListener("click", () => buyItem(item));
      container.append(button);
    });
  }
  function renderInventory() {
    const items = Object.entries(state.inventory).filter(([, count]) => count > 0).map(([id, count]) => {
      const item = getItem(id);
      return item ? `${item.emoji} ${count}x` : "";
    }).filter(Boolean);
    document.getElementById("inventory-summary").textContent = items.length ? items.join(" · ") : "vazia por enquanto";
  }
  function renderAchievements() {
    const list = document.getElementById("achievement-list");
    list.replaceChildren();
    achievements.forEach(item => {
      const unlocked = state.unlocked.includes(item.id);
      const row = document.createElement("div");
      row.className = `achievement-row${unlocked ? " unlocked" : ""}`;
      row.innerHTML = `<span class="achievement-icon">${item.icon}</span><span><strong>${item.title}</strong><small>${item.detail}</small></span><span class="achievement-status">${unlocked ? "✓" : "○"}</span>`;
      list.append(row);
    });
  }
  function renderAlbum() {
    const album = document.getElementById("album-grid");
    album.replaceChildren();
    if (!state.moments.length) {
      const empty = document.createElement("div");
      empty.className = "album-empty";
      empty.textContent = "Seus momentos especiais vão aparecer aqui ♡";
      album.append(empty);
      return;
    }
    state.moments.slice(-6).reverse().forEach(moment => {
      const tile = document.createElement("div");
      tile.className = "album-memory";
      tile.innerHTML = `<span>${moment.emoji}</span><small>${moment.title}</small>`;
      album.append(tile);
    });
  }
  function renderRoomDecor() {
    const container = document.getElementById("room-decor");
    container.replaceChildren();
    state.decor.forEach(id => {
      const item = getItem(id);
      if (!item) return;
      const decoration = document.createElement("span");
      decoration.className = "room-decor-item";
      decoration.textContent = item.emoji;
      decoration.title = item.name;
      container.append(decoration);
    });
  }
  function checkAchievements() {
    achievements.forEach(item => {
      if (item.test(state) && !state.unlocked.includes(item.id)) {
        state.unlocked.push(item.id);
        showToast(`Conquista desbloqueada: ${item.title} ${item.icon}`);
        addXP(20);
        addMoment(item.icon, item.title);
      }
    });
  }
  function addMoment(emoji, title) {
    state.moments.push({ emoji, title, date: Date.now() });
    if (state.moments.length > 30) state.moments.shift();
  }
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2700);
  }
  function speak(message, mood) {
    const bubble = document.getElementById("pet-message");
    bubble.textContent = message;
    bubble.style.animation = "none";
    void bubble.offsetWidth;
    bubble.style.animation = "";
    if (mood) setPetMood(mood, 1900);
  }
  function setPetMood(mood, duration = 1800) {
    const pet = document.getElementById("pet");
    pet.dataset.mood = mood;
    if (mood !== "sleep") setTimeout(() => { if (!state.sleeping) pet.dataset.mood = currentMood(); }, duration);
  }
  function effect(emoji) {
    const target = document.getElementById("action-effect");
    target.textContent = emoji;
    target.animate([{ opacity: 0, transform: "translateY(12px) scale(.7)" }, { opacity: 1, transform: "translateY(-8px) scale(1.1)" }, { opacity: 0, transform: "translateY(-35px) scale(.8)" }], { duration: 1050, easing: "ease-out" });
  }
  function sound(kind = "tap") {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      const frequencies = { tap: 560, happy: 780, level: 950, coin: 660 };
      oscillator.frequency.value = frequencies[kind] || 560;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .18);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + .19);
    } catch (error) {
      console.warn("O áudio não está disponível neste navegador.", error);
    }
  }
  function requireAwake() {
    if (!state.sleeping) return true;
    speak("Zzz... mais cinco minutinhos? 🌙", "sleep");
    showToast("Seu bichinho está dormindo. Acorde-o para brincar!");
    return false;
  }
  function care(action, item) {
    if (!state.pet) { openAdoption(); return; }
    applyElapsedTime();
    if (action === "sleep") {
      state.sleeping = !state.sleeping;
      if (state.sleeping) {
        speak("Boa noite! Vou sonhar com você. 🌙", "sleep");
        effect("💤");
      } else {
        state.stats.energy = clamp(state.stats.energy + 16);
        speak("Bom dia! Estou prontinho para mais aventuras! ☀️", "happy");
        effect("☀️");
      }
      save(); render(); sound("happy"); return;
    }
    if (!requireAwake()) return;
    if (action === "feed") {
      const carriedFood = shop.food.find(foodItem => (state.inventory[foodItem.id] || 0) > 0);
      const food = item || carriedFood || shop.food[0];
      if (item) {
        if (!state.inventory[item.id]) { showToast("Você precisa comprar essa comidinha primeiro."); return; }
        state.inventory[item.id]--;
      }
      state.stats.hunger = clamp(state.stats.hunger + 30);
      state.stats.happiness = clamp(state.stats.happiness + 5);
      state.stats.health = clamp(state.stats.health + 2);
      state.feedCount++;
      speak(state.stats.hunger > 75 ? `Nhami! ${food.name} estava uma delícia! 🍓` : "Que delícia! Minha barriguinha agradece! 😋", "eating");
      effect(food.emoji);
    } else if (action === "play") {
      const toy = shop.toys.find(toyItem => (state.inventory[toyItem.id] || 0) > 0);
      if (toy) {
        state.inventory[toy.id]--;
        state.stats.happiness = clamp(state.stats.happiness + 8);
      }
      state.stats.happiness = clamp(state.stats.happiness + 22);
      state.stats.energy = clamp(state.stats.energy - 14);
      state.stats.hygiene = clamp(state.stats.hygiene - 3);
      const petCharacter = document.getElementById("pet");
      petCharacter.classList.add("walking");
      setTimeout(() => petCharacter.classList.remove("walking"), 1800);
      speak(toy ? `Adorei brincar com ${toy.name.toLowerCase()}! ${toy.emoji}` : ["Isso foi tão divertido! De novo? ✨", "Adoro brincar com você! 🥰", "Uhuuul! Somos uma ótima equipe! 🎉"][Math.floor(Math.random() * 3)], "excited");
      effect(toy ? toy.emoji : "✨");
    } else if (action === "bath") {
      state.stats.hygiene = clamp(state.stats.hygiene + 42);
      state.stats.happiness = clamp(state.stats.happiness - 2);
      state.stats.health = clamp(state.stats.health + 4);
      speak(["Plim, plim! Agora estou cheirosinho! 🫧", "Até que o banho foi gostoso... splash! 🛁"][Math.floor(Math.random() * 2)], "happy");
      effect("🫧");
    } else if (action === "pet") {
      state.stats.happiness = clamp(state.stats.happiness + 13);
      speak(["Esse carinho era tudo que eu precisava. 💕", "Gosto tanto de ficar pertinho de você! 🥰", "Você é meu humano favorito! 🤍"][Math.floor(Math.random() * 3)], "excited");
      effect("💖");
    }
    state.careCount++;
    addXP(action === "play" ? 12 : 8);
    checkAchievements(); save(); render(); sound("happy");
  }
  function buyItem(item) {
    if (item.effect === "accessory" && state.accessory === item.id || item.effect === "decor" && state.decor.includes(item.id)) {
      showToast("Esse mimo já está no seu cantinho!"); return;
    }
    if (state.coins < item.price) { showToast("Ainda faltam algumas moedinhas. Que tal jogar?"); return; }
    state.coins -= item.price;
    if (item.effect === "accessory") {
      state.accessory = item.id;
      speak(`Uau! Adorei meu ${item.name.toLowerCase()}! ${item.emoji}`, "excited");
      addMoment(item.emoji, "Look novo!");
    } else if (item.effect === "decor") {
      state.decor.push(item.id);
      document.getElementById("room").classList.add("decorated");
      speak(`Nosso cantinho ficou mais lindo! ${item.emoji}`, "happy");
      addMoment(item.emoji, "Quarto novo!");
    } else {
      state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
      showToast(`${item.name} guardado na mochilinha!`);
    }
    state.itemsBought++;
    addXP(5);
    checkAchievements(); save(); render(); sound("coin");
  }
  function openAdoption() {
    document.getElementById("adoption-modal").classList.remove("hidden");
    renderAdoptionChoices();
    setTimeout(() => document.getElementById("new-pet-name").focus(), 50);
  }
  function renderAdoptionChoices() {
    const choices = document.getElementById("pet-choices");
    choices.replaceChildren();
    pets.forEach(pet => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pet-choice${selectedPet === pet.id ? " selected" : ""}`;
      button.innerHTML = `<span>${pet.emoji}</span><span>${pet.name}</span>`;
      button.addEventListener("click", () => { selectedPet = pet.id; renderAdoptionChoices(); });
      choices.append(button);
    });
    const colorChoices = document.getElementById("color-choices");
    colorChoices.replaceChildren();
    colors.forEach((color, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `color-swatch${selectedColor === index ? " selected" : ""}`;
      button.style.background = color.fur;
      button.title = color.name;
      button.setAttribute("aria-label", color.name);
      button.addEventListener("click", () => { selectedColor = index; renderAdoptionChoices(); });
      colorChoices.append(button);
    });
  }
  function adopt() {
    const name = document.getElementById("new-pet-name").value.trim();
    if (!name) {
      document.getElementById("new-pet-name").focus();
      showToast("Escolha um nome bem especial para seu bichinho!"); return;
    }
    state.pet = selectedPet;
    state.name = name;
    state.colorIndex = selectedColor;
    state.adoptedAt = Date.now();
    state.lastTick = Date.now();
    state.welcomePending = true;
    state.sleeping = false;
    document.getElementById("adoption-modal").classList.add("hidden");
    render();
    const pet = getPet();
    speak(`${pet.hello} Obrigado por me adotar, ${name}! 💛`, "excited");
    effect("💛");
    addMoment(pet.emoji, "Nosso primeiro encontro!");
    save(); sound("level");
    showToast(`Uma amizade linda começou! ${pet.emoji}`);
  }
  function startGame(type) {
    if (!state.pet) { openAdoption(); return; }
    if (!requireAwake()) return;
    if (state.stats.energy < 10) { showToast("Seu bichinho está cansadinho. Deixe-o descansar primeiro."); return; }
    const modal = document.getElementById("game-modal");
    modal.classList.remove("hidden");
    if (type === "memory") startMemoryGame();
    else startStarGame();
  }
  function closeGame() {
    document.getElementById("game-modal").classList.add("hidden");
    clearInterval(gameTimer);
    clearInterval(gameSpawnTimer);
    gameSpawnTimer = null;
    memoryGame = null;
  }
  function startMemoryGame() {
    document.getElementById("game-title").textContent = "Memória mágica";
    document.getElementById("game-instructions").textContent = "Encontre os 4 pares! Cada par combina uma lembrancinha.";
    const symbols = ["🍓", "⭐", "🧸", "🌈"];
    const deck = [...symbols, ...symbols].sort(() => Math.random() - .5);
    memoryGame = { deck, open: [], matched: [], turns: 0, locked: false };
    const content = document.getElementById("game-content");
    content.innerHTML = `<div class="game-feedback" id="game-feedback">Toques: 0</div><div class="memory-board" id="memory-board"></div>`;
    const board = document.getElementById("memory-board");
    deck.forEach((symbol, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "memory-tile";
      tile.textContent = "♡";
      tile.setAttribute("aria-label", "Carta virada");
      tile.addEventListener("click", () => flipMemoryTile(index));
      board.append(tile);
    });
  }
  function flipMemoryTile(index) {
    const game = memoryGame;
    if (!game || game.locked || game.open.includes(index) || game.matched.includes(index)) return;
    const tiles = [...document.querySelectorAll(".memory-tile")];
    game.open.push(index);
    tiles[index].textContent = game.deck[index];
    tiles[index].classList.add("revealed");
    tiles[index].setAttribute("aria-label", game.deck[index]);
    if (game.open.length < 2) return;
    game.turns++;
    document.getElementById("game-feedback").textContent = `Toques: ${game.turns}`;
    const [first, second] = game.open;
    if (game.deck[first] === game.deck[second]) {
      game.matched.push(first, second);
      tiles[first].classList.add("matched");
      tiles[second].classList.add("matched");
      game.open = [];
      sound("happy");
      if (game.matched.length === game.deck.length) finishGame(30, `Memória afiada! Você ganhou 30 moedas em ${game.turns} toques!`);
    } else {
      game.locked = true;
      setTimeout(() => {
        if (!memoryGame) return;
        [first, second].forEach(i => { tiles[i].textContent = "♡"; tiles[i].classList.remove("revealed"); tiles[i].setAttribute("aria-label", "Carta virada"); });
        game.open = [];
        game.locked = false;
      }, 700);
    }
  }
  function startStarGame() {
    document.getElementById("game-title").textContent = "Caça às estrelas";
    document.getElementById("game-instructions").textContent = "Toque nas estrelas antes que o tempo acabe. Pegue 5 para ganhar!";
    document.getElementById("game-content").innerHTML = `<div class="game-countdown" id="game-countdown">15 segundos · 0/5 estrelas</div><div class="star-game-area" id="star-game-area"></div>`;
    let seconds = 15, caught = 0, ended = false;
    const area = document.getElementById("star-game-area");
    const counter = document.getElementById("game-countdown");
    const spawn = () => {
      if (ended || !area.isConnected) return;
      const star = document.createElement("button");
      star.type = "button";
      star.className = "star-target";
      star.textContent = ["⭐", "🌟", "✨"][Math.floor(Math.random() * 3)];
      star.style.left = `${Math.random() * 78}%`;
      star.style.top = `${Math.random() * 70}%`;
      star.setAttribute("aria-label", "Pegar estrela");
      star.addEventListener("click", () => {
        if (ended) return;
        caught++;
        star.remove();
        counter.textContent = `${seconds} segundos · ${caught}/5 estrelas`;
        sound("coin");
        if (caught >= 5) { ended = true; clearInterval(gameTimer); finishGame(20, "Que reflexos! Você ganhou 20 moedas!"); }
      });
      area.append(star);
      setTimeout(() => star.remove(), 1200);
    };
    spawn();
    gameSpawnTimer = setInterval(spawn, 700);
    gameTimer = setInterval(() => {
      seconds--;
      if (!counter.isConnected) { clearInterval(gameSpawnTimer); clearInterval(gameTimer); return; }
      counter.textContent = `${seconds} segundos · ${caught}/5 estrelas`;
      if (seconds <= 0) {
        ended = true; clearInterval(gameSpawnTimer); clearInterval(gameTimer);
        if (caught) finishGame(caught * 4, `Boa caça! ${caught} estrelas renderam ${caught * 4} moedas.`);
        else finishGame(0, "Quase! Tente de novo para pegar algumas estrelas.");
      }
    }, 1000);
  }
  function finishGame(reward, message) {
    clearInterval(gameTimer);
    clearInterval(gameSpawnTimer);
    state.coins += reward;
    state.gamesPlayed++;
    state.stats.energy = clamp(state.stats.energy - 9);
    state.stats.happiness = clamp(state.stats.happiness + 8);
    addXP(15);
    checkAchievements(); save(); render();
    const content = document.getElementById("game-content");
    content.innerHTML = `<p class="game-feedback">${message}</p><button type="button" class="primary-button start-game" id="game-done">Continuar <span>♡</span></button>`;
    document.getElementById("game-done").addEventListener("click", closeGame);
    speak(reward ? "Você foi incrível! Adoro jogar com você! 🎉" : "Foi divertido mesmo assim! Vamos tentar de novo? 💛", reward ? "excited" : "happy");
    effect(reward ? "🪙" : "✨");
    sound(reward ? "coin" : "tap");
  }
  function randomIdleMessage() {
    if (!state.pet || state.sleeping) return;
    const mood = currentMood();
    const messages = {
      sad: ["Estou com saudade de um carinho... 💭", "Vamos ficar juntinhos um pouquinho? 🥺"],
      hungry: ["Minha barriguinha está roncando... 🍓", "Será que tem uma frutinha para mim? 😋"],
      tired: ["Acho que um soninho me faria bem... 🥱", "Estou piscando de sono... 🌙"],
      happy: ["Gosto tanto do nosso cantinho! 🏡", "Você sabia que eu adoro estrelinhas? ⭐", "O melhor do dia é ficar com você! 💛"]
    };
    speak(messages[mood][Math.floor(Math.random() * messages[mood].length)]);
  }

  document.querySelectorAll(".care-button").forEach(button => button.addEventListener("click", () => care(button.dataset.action)));
  document.querySelectorAll(".game-card").forEach(button => button.addEventListener("click", () => startGame(button.dataset.game)));
  document.querySelectorAll(".shop-tab").forEach(button => button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    document.querySelectorAll(".shop-tab").forEach(tab => tab.classList.toggle("active", tab === button));
    renderShop();
  }));
  document.getElementById("adopt-button").addEventListener("click", adopt);
  document.getElementById("new-pet-name").addEventListener("keydown", event => { if (event.key === "Enter") adopt(); });
  document.getElementById("close-game").addEventListener("click", closeGame);
  document.getElementById("game-modal").addEventListener("click", event => { if (event.target.id === "game-modal") closeGame(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") { closeGame(); document.getElementById("adoption-modal").classList.add("hidden"); } });
  document.getElementById("sound-toggle").addEventListener("click", () => { state.sound = !state.sound; save(); render(); if (state.sound) sound("happy"); });
  document.getElementById("reset-game").addEventListener("click", () => {
    if (!window.confirm("Tem certeza de que deseja recomeçar? Todo o progresso deste bichinho será apagado.")) return;
    localStorage.removeItem(SAVE_KEY);
    state = defaultState();
    selectedPet = pets[0].id;
    selectedColor = 0;
    render();
    openAdoption();
    showToast("Um novo cantinho espera por vocês! ♡");
  });
  document.getElementById("snapshot-button").addEventListener("click", () => {
    if (!state.pet) { openAdoption(); return; }
    addMoment(getPet().emoji, "Um momento feliz!");
    state.coins += 2;
    state.stats.happiness = clamp(state.stats.happiness + 4);
    speak("Esse momento vai ficar guardado no coração! 📸", "happy");
    showToast("Momento registrado no álbum! +2 moedas");
    save(); render(); sound("happy");
  });

  applyElapsedTime();
  render();
  if (!state.pet) openAdoption();
  else if (state.welcomePending) {
    state.welcomePending = false;
    speak(`${getPet().hello} Que bom ter você aqui! 💛`, "excited");
    save();
  } else if (state.sleeping && state.stats.energy >= 95) {
    state.sleeping = false;
    speak("Acordei renovado! Bom dia! ☀️", "happy");
  } else {
    const lowStat = Object.entries(state.stats).find(([key, value]) => key !== "health" && value < 25);
    if (lowStat) randomIdleMessage();
  }
  setInterval(() => {
    if (!state.pet) return;
    applyElapsedTime();
    save();
    render();
    if (Math.random() < .12) randomIdleMessage();
  }, 60000);
  setInterval(save, 15000);
})();
