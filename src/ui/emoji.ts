import { t } from '../i18n'

/** [emoji, english name] — curated common set; names double as search terms. */
type EmojiEntry = [string, string]

const EMOJIS: EmojiEntry[] = [
  // smileys
  ['😀', 'grinning face happy'], ['😃', 'smiley happy'], ['😄', 'laughing joy'], ['😁', 'beaming'],
  ['😆', 'laughing squint'], ['😅', 'sweat laugh'], ['🤣', 'rofl laughing'], ['😂', 'joy tears'],
  ['🙂', 'slight smile'], ['😊', 'blush smile'], ['😇', 'innocent halo'], ['🙂', 'smile'],
  ['😉', 'wink'], ['😍', 'heart eyes love'], ['🥰', 'smiling hearts love'], ['😘', 'kiss'],
  ['😋', 'yum tasty'], ['😜', 'zany tongue'], ['🤪', 'zany crazy'], ['🤨', 'eyebrow suspicious'],
  ['🧐', 'monocle inspect'], ['😎', 'cool sunglasses'], ['🥳', 'party celebrate'], ['😏', 'smirk'],
  ['😌', 'relieved'], ['🤯', 'mind blown'], ['🥺', 'pleading'], ['😭', 'cry sob'],
  ['😱', 'scream fear'], ['😡', 'angry rage'], ['🤬', 'cursing'], ['🤔', 'thinking hmm'],
  ['🤫', 'shush quiet'], ['🤥', 'lying nose'], ['😐', 'neutral'], ['😴', 'sleeping zzz'],
  ['🤒', 'sick fever'], ['🤕', 'bandage hurt'], ['🥴', 'woozy dizzy'], ['😵', 'dizzy'],
  ['🤠', 'cowboy'], ['🥸', 'disguise'], ['🤖', 'robot'], ['👻', 'ghost boo'],
  ['💀', 'skull dead'], ['💩', 'poop'], ['🤡', 'clown'], ['😈', 'devil'],
  ['👽', 'alien ufo'], ['🎃', 'halloween pumpkin'], ['😺', 'cat smile'], ['🐶', 'dog puppy'],
  // gestures & people
  ['👋', 'wave hello bye'], ['🤚', 'raised hand'], ['🖐', 'hand five'], ['✌️', 'victory peace'],
  ['🤞', 'fingers crossed luck'], ['🤟', 'love you'], ['🤘', 'rock horns'], ['🤙', 'call me'],
  ['👈', 'point left'], ['👉', 'point right'], ['👆', 'point up'], ['👇', 'point down'],
  ['👍', 'thumbs up like ok'], ['👎', 'thumbs down dislike'], ['✊', 'fist power'], ['👊', 'punch bump'],
  ['👏', 'clap applause'], ['🙌', 'raised hands hooray'], ['🤝', 'handshake deal'], ['🙏', 'pray thanks please'],
  ['💪', 'muscle strong flex'], ['🧠', 'brain smart'], ['👀', 'eyes look'], ['👁', 'eye watch'],
  ['👄', 'mouth lips'], ['👶', 'baby'], ['🧒', 'child kid'], ['👨', 'man'],
  ['👩', 'woman'], ['🧓', 'older'], ['👨‍💻', 'developer coder technologist'], ['👩‍🍳', 'cook chef'],
  ['🕺', 'dancing man'], ['💃', 'dancing woman'], ['🧑‍🚀', 'astronaut'], ['🦸', 'superhero'],
  ['🧙', 'mage wizard'], ['🧚', 'fairy'], ['🎅', 'santa christmas'], ['🦵', 'leg'],
  ['🏃', 'running run'], ['🚶', 'walking'], ['🧘', 'yoga meditate'], ['🤺', 'fencing'],
  // animals & nature
  ['🐶', 'dog puppy'], ['🐱', 'cat kitten'], ['🐭', 'mouse'], ['🐹', 'hamster'],
  ['🐰', 'rabbit bunny'], ['🦊', 'fox'], ['🐻', 'bear'], ['🐼', 'panda'],
  ['🐨', 'koala'], ['🐯', 'tiger'], ['🦁', 'lion'], ['🐮', 'cow'],
  ['🐷', 'pig'], ['🐸', 'frog'], ['🐵', 'monkey'], ['🙈', 'see no evil'],
  ['🐔', 'chicken'], ['🐧', 'penguin'], ['🐦', 'bird'], ['🦆', 'duck'],
  ['🦉', 'owl'], ['🦄', 'unicorn'], ['🐝', 'bee'], ['🦋', 'butterfly'],
  ['🐞', 'ladybug'], ['🐢', 'turtle'], ['🐍', 'snake'], ['🐙', 'octopus'],
  ['🦑', 'squid'], ['🦐', 'shrimp'], ['🐠', 'fish tropical'], ['🐳', 'whale'],
  ['🐬', 'dolphin'], ['🦈', 'shark'], ['🐊', 'crocodile'], ['🐘', 'elephant'],
  ['🦒', 'giraffe'], ['🦓', 'zebra'], ['🐴', 'horse'], ['🦕', 'dinosaur'],
  ['🌵', 'cactus'], ['🌲', 'evergreen tree'], ['🌴', 'palm tree'], ['🌱', 'seedling'],
  ['🍀', 'clover luck'], ['🍁', 'maple leaf'], ['🌸', 'cherry blossom'], ['🌺', 'hibiscus'],
  ['🌻', 'sunflower'], ['🌹', 'rose'], ['🌍', 'earth world'], ['🌙', 'moon night'],
  ['⭐', 'star'], ['🌟', 'glowing star'], ['✨', 'sparkles shine'], ['⚡', 'lightning zap'],
  ['🔥', 'fire hot'], ['🌈', 'rainbow'], ['☀️', 'sun'], ['⛅', 'cloud sun'],
  ['☁️', 'cloud'], ['❄️', 'snowflake'], ['🌊', 'wave water'], ['💧', 'droplet'],
  // food & drink
  ['🍏', 'green apple'], ['🍎', 'red apple'], ['🍐', 'pear'], ['🍊', 'orange tangerine'],
  ['🍋', 'lemon'], ['🍌', 'banana'], ['🍉', 'watermelon'], ['🍇', 'grapes'],
  ['🍓', 'strawberry'], ['🫐', 'blueberries'], ['🍒', 'cherries'], ['🍑', 'peach'],
  ['🥭', 'mango'], ['🍍', 'pineapple'], ['🥥', 'coconut'], ['🥝', 'kiwi'],
  ['🍅', 'tomato'], ['🥑', 'avocado'], ['🥦', 'broccoli'], ['🥕', 'carrot'],
  ['🌽', 'corn'], ['🌶', 'pepper hot'], ['🥒', 'cucumber'], ['🍞', 'bread'],
  ['🥐', 'croissant'], ['🥖', 'baguette'], ['🧀', 'cheese'], ['🍳', 'egg cooking'],
  ['🍔', 'burger'], ['🍟', 'fries'], ['🍕', 'pizza'], ['🌮', 'taco'],
  ['🌯', 'burrito'], ['🥗', 'salad'], ['🍝', 'spaghetti pasta'], ['🍜', 'noodles ramen'],
  ['🍣', 'sushi'], ['🍤', 'shrimp fry'], ['🍗', 'chicken leg'], ['🍖', 'meat'],
  ['🍿', 'popcorn'], ['🧈', 'butter'], ['🧂', 'salt'], ['🥫', 'can'],
  ['🍦', 'ice cream'], ['🍩', 'donut doughnut'], ['🍪', 'cookie'], ['🎂', 'birthday cake'],
  ['🍰', 'cake slice'], ['🍫', 'chocolate'], ['🍬', 'candy'], ['🍭', 'lollipop'],
  ['☕', 'coffee'], ['🍵', 'tea'], ['🧃', 'juice box'], ['🥤', 'soda cup'],
  ['🍺', 'beer'], ['🍻', 'beers cheers'], ['🥂', 'champagne clink'], ['🍷', 'wine'],
  ['🥃', 'whisky'], ['🍸', 'cocktail martini'], ['🧉', 'mate'], ['🥛', 'milk'],
  // objects
  ['📱', 'phone mobile'], ['💻', 'laptop computer'], ['🖥', 'desktop computer'], ['⌨️', 'keyboard'],
  ['🖱', 'mouse computer'], ['💾', 'floppy save'], ['💿', 'cd disc'], ['📷', 'camera photo'],
  ['🎥', 'camera movie'], ['📺', 'tv television'], ['📻', 'radio'], ['⏰', 'alarm clock'],
  ['⌚', 'watch time'], ['🔋', 'battery'], ['🔌', 'plug power'], ['💡', 'light idea bulb'],
  ['🔍', 'search magnify'], ['🔎', 'search right'], ['🔒', 'lock secure'], ['🔑', 'key'],
  ['🔨', 'hammer tool'], ['🪛', 'screwdriver'], ['🔧', 'wrench tool'], ['⚙️', 'gear settings'],
  ['🧲', 'magnet'], ['💉', 'syringe medical'], ['💊', 'pill medicine'], ['🩹', 'bandage'],
  ['🚪', 'door'], ['🪑', 'chair'], ['🛏', 'bed sleep'], ['🚿', 'shower'],
  ['🧹', 'broom clean'], ['🧺', 'basket laundry'], ['🛒', 'cart shop'], ['🎁', 'gift present'],
  ['🎈', 'balloon party'], ['🎉', 'party popper celebrate'], ['🎊', 'confetti'], ['🪄', 'magic wand'],
  ['📦', 'package box'], ['✉️', 'envelope mail'], ['📮', 'postbox mail'], ['📝', 'memo write'],
  ['✏️', 'pencil'], ['🖊', 'pen'], ['📚', 'books read'], ['📖', 'open book'],
  ['🔖', 'bookmark'], ['🔗', 'link chain'], ['📎', 'paperclip'], ['✂️', 'scissors cut'],
  ['📌', 'pushpin'], ['📐', 'ruler design'], ['📏', 'ruler'], ['💰', 'money bag'],
  ['💳', 'credit card pay'], ['💎', 'gem diamond'], ['⏳', 'hourglass time'], ['🧸', 'teddy bear'],
  ['🛠', 'hammer wrench tools'], ['⛏', 'pick mining'], ['🪙', 'coin'], ['🗺', 'map'],
  ['🧭', 'compass'], ['🚀', 'rocket launch'], ['🛸', 'ufo'], ['🔬', 'microscope science'],
  ['🔭', 'telescope'], ['📡', 'satellite antenna'], ['🎙', 'microphone'], ['🎧', 'headphones'],
  ['🎸', 'guitar music'], ['🎹', 'piano keyboard'], ['🥁', 'drum'], ['🎤', 'microphone sing'],
  ['🏆', 'trophy win'], ['🥇', 'gold medal first'], ['🎯', 'target dart bullseye'], ['🎲', 'dice game'],
  ['🎮', 'game controller'], ['🕹', 'joystick arcade'], ['♟', 'chess pawn'], ['🧩', 'puzzle piece'],
  ['⚽', 'soccer football'], ['🏀', 'basketball'], ['🏈', 'football american'], ['🎾', 'tennis'],
  // symbols
  ['❤️', 'red heart love'], ['🧡', 'orange heart'], ['💛', 'yellow heart'], ['💚', 'green heart'],
  ['💙', 'blue heart'], ['💜', 'purple heart'], ['🖤', 'black heart'], ['🤍', 'white heart'],
  ['💔', 'broken heart'], ['❣️', 'heart exclamation'], ['💕', 'two hearts'], ['💞', 'revolving hearts'],
  ['💯', 'hundred perfect'], ['💢', 'anger'], ['💥', 'collision boom'], ['💫', 'dizzy star'],
  ['💦', 'sweat droplets'], ['🕳', 'hole'], ['💬', 'speech bubble chat'], ['💭', 'thought bubble'],
  ['💤', 'zzz sleep'], ['✅', 'check yes done'], ['☑️', 'checkbox'], ['✔️', 'check mark'],
  ['❌', 'cross no x'], ['❎', 'cross mark'], ['➕', 'plus add'], ['➖', 'minus'],
  ['➗', 'divide'], ['✖️', 'multiply'], ['♾', 'infinity'], ['‼️', 'exclamation double'],
  ['⁉️', 'interrobang'], ['❓', 'question red'], ['❓', 'question'], ['❗', 'exclamation'],
  ['🔔', 'bell notification'], ['🔕', 'bell off mute'], ['🎵', 'note music'], ['🎶', 'notes music'],
  ['💲', 'dollar'], ['💱', 'exchange'], ['©', 'copyright'], ['®', 'registered'],
  ['⚠️', 'warning caution'], ['🚸', 'children crossing'], ['♻️', 'recycle'], ['🔱', 'trident'],
  ['📛', 'name badge'], ['🔰', 'beginner'], ['⭕', 'circle'], ['🆗', 'ok button'],
  ['🆒', 'cool button'], ['🆓', 'free button'], ['🆕', 'new button'], ['🆙', 'up button'],
  ['🔴', 'red circle'], ['🟠', 'orange circle'], ['🟡', 'yellow circle'], ['🟢', 'green circle'],
  ['🔵', 'blue circle'], ['🟣', 'purple circle'], ['⚫', 'black circle'], ['⚪', 'white circle'],
  ['🟥', 'red square'], ['🟧', 'orange square'], ['🟨', 'yellow square'], ['🟩', 'green square'],
  ['🟦', 'blue square'], ['🟪', 'purple square'], ['⬛', 'black square'], ['⬜', 'white square'],
  ['🔶', 'orange diamond'], ['🔷', 'blue diamond'], ['🔺', 'red triangle'], ['▶️', 'play'],
  ['⏸', 'pause'], ['⏹', 'stop'], ['⏭', 'next track'], ['🔀', 'shuffle'],
  ['🔁', 'repeat'], ['🔄', 'refresh sync'], ['↩️', 'return'], ['⤴️', 'curve up'],
  ['🅰️', 'a blood'], ['🅱️', 'b blood'], ['🆎', 'ab blood'], ['🅾️', 'o blood'],
  ['♠️', 'spade'], ['♥️', 'heart suit'], ['♦️', 'diamond suit'], ['♣️', 'club'],
  ['🃏', 'joker card'], ['🎴', 'flower cards'], ['🀄', 'mahjong']
]

const CATEGORIES: { key: string; test: (e: EmojiEntry, i: number) => boolean }[] = [
  { key: 'smileys', test: (_e, i) => i < 56 },
  { key: 'gestures', test: (_e, i) => i >= 56 && i < 92 },
  { key: 'animals', test: (_e, i) => i >= 92 && i < 160 },
  { key: 'food', test: (_e, i) => i >= 160 && i < 224 },
  { key: 'objects', test: (_e, i) => i >= 224 && i < 336 },
  { key: 'symbols', test: (_e, i) => i >= 336 }
]

const emojiCanvasCache = new Map<string, string>()

/** Rasterize an emoji glyph to a square PNG data URL via the platform color-emoji font. */
export function rasterizeEmoji(emoji: string, px = 512): string {
  const cached = emojiCanvasCache.get(emoji)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const fontPx = Math.floor(px * 0.78)
  ctx.font = `${fontPx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",emoji,sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, px / 2, px * 0.54)
  const url = canvas.toDataURL('image/png')
  emojiCanvasCache.set(emoji, url)
  return url
}

/**
 * Emoji picker overlay. Calls `onPick(dataUrl)` with the rasterized emoji
 * and resolves when the dialog closes.
 */
export function openEmojiPicker(onPick: (emoji: string, dataUrl: string) => void): void {
  const overlay = document.createElement('div')
  overlay.className = 'emoji-overlay'

  const dialog = document.createElement('div')
  dialog.className = 'emoji-dialog'

  const search = document.createElement('input')
  search.type = 'search'
  search.className = 'emoji-search'
  search.placeholder = t('emoji.search')

  const cats = document.createElement('div')
  cats.className = 'emoji-cats'

  const grid = document.createElement('div')
  grid.className = 'emoji-grid'

  let activeCat = 'all'

  function render(): void {
    const q = search.value.trim().toLowerCase()
    grid.innerHTML = ''
    for (const [idx, [emoji, name]] of EMOJIS.entries()) {
      if (q && !name.includes(q)) continue
      if (activeCat !== 'all' && !CATEGORIES.find((c) => c.key === activeCat)?.test([emoji, name], idx)) continue
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'emoji-cell'
      btn.textContent = emoji
      btn.title = name
      btn.addEventListener('click', () => {
        onPick(emoji, rasterizeEmoji(emoji))
        overlay.remove()
      })
      grid.appendChild(btn)
    }
  }

  const catButtons: { key: string; label: string }[] = [
    { key: 'all', label: '✳️' },
    ...CATEGORIES.map((c) => ({ key: c.key, label: t(`emoji.cat.${c.key}`) }))
  ]
  for (const c of catButtons) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'emoji-cat'
    b.textContent = c.label
    if (c.key === 'all') b.classList.add('active')
    b.addEventListener('click', () => {
      activeCat = c.key
      cats.querySelectorAll('.emoji-cat').forEach((el) => el.classList.remove('active'))
      b.classList.add('active')
      render()
    })
    cats.appendChild(b)
  }

  search.addEventListener('input', render)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })
  window.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      overlay.remove()
      window.removeEventListener('keydown', esc)
    }
  })

  dialog.append(search, cats, grid)
  overlay.appendChild(dialog)
  document.body.appendChild(overlay)
  render()
  search.focus()
}
