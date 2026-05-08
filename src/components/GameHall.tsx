import { For, Show, createMemo, createSignal, onMount } from 'solid-js'

type Game = {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  duration: string
  vibe: string
  description: string
  rules: string[]
  tips?: string
}

type Room = {
  id: string
  gameId: string
  capacity: number
  players: string[]
  createdAt: number
}

const games: Game[] = [
  {
    id: 'catan',
    name: '卡坦岛',
    minPlayers: 3,
    maxPlayers: 4,
    duration: '60-90 分钟',
    vibe: '策略协作',
    description: '玩家在卡坦岛上建设道路与村庄，交换资源、争夺胜利点，互动丰富且充满谈判。',
    rules: [
      '轮到你时掷骰，根据点数领取相应地形的资源。',
      '使用资源建造道路、村庄、城市或购买发展卡。',
      '率先累积 10 点胜利点的玩家获胜。',
    ],
    tips: '主持人可以在前两轮多做示范交易，帮助第一次玩的人熟悉资源交换。',
  },
  {
    id: 'werewolf',
    name: '狼人杀/谁是卧底',
    minPlayers: 6,
    maxPlayers: 12,
    duration: '20-40 分钟/局',
    vibe: '推理派对',
    description: '适合人多热闹的聚会，隐藏阵营、推理和演绎为核心，春节合家欢的经典选择。',
    rules: [
      '分发身份：狼人阵营 vs. 好人阵营（可根据人数加入预言家/女巫等角色）。',
      '夜晚闭眼按顺序发动技能，白天讨论并投票淘汰嫌疑人。',
      '好人消灭全部狼人或狼人达到人数优势即获胜。',
    ],
    tips: '作为主持人可以压节奏，控制发言时长，让气氛既热烈又不拖沓。',
  },
  {
    id: 'dixit',
    name: '妙语说书人（Dixit）',
    minPlayers: 3,
    maxPlayers: 6,
    duration: '30 分钟',
    vibe: '想象力&家庭',
    description: '配合充满想象的插画，用一句描述引导他人猜牌，欢乐又温和，长辈和孩子都能参与。',
    rules: [
      '轮到说书人时，从手牌挑一张并用一句话/声音/动作提示。',
      '其他玩家选一张最像提示的牌，一起洗牌摊开。',
      '除全对/全错外，猜中说书人牌的玩家和说书人得分。',
    ],
  },
  {
    id: 'saboteur',
    name: '矮人矿坑',
    minPlayers: 3,
    maxPlayers: 10,
    duration: '30 分钟',
    vibe: '阵营&逆风翻盘',
    description: '扮演挖矿的矮人或搅局的破坏者，铺路挖金或暗中使坏，人少人多都合适。',
    rules: [
      '每人获得身份卡（矿工或破坏者）与手牌。',
      '轮到你时打出道路/行动牌或弃牌补牌，目标是连通起点到金矿。',
      '矿工连通即可赢得金币，破坏者则在阻挠成功时得分。',
    ],
  },
  {
    id: 'justone',
    name: '妙语说不停（Just One）',
    minPlayers: 3,
    maxPlayers: 7,
    duration: '20 分钟',
    vibe: '合作&破冰',
    description: '全员合作给提示词，重复的提示会被屏蔽，需要默契又避免撞车，非常适合家人朋友热身。',
    rules: [
      '抽取待猜词语，除猜词者外其他玩家悄悄写下单词提示。',
      '去掉重复的提示后，猜词者根据剩余提示作答。',
      '累计猜对数量达到目标即全队获胜。',
    ],
  },
  {
    id: 'azul',
    name: '阿兹尔',
    minPlayers: 2,
    maxPlayers: 4,
    duration: '30-45 分钟',
    vibe: '轻策略&拼图',
    description: '取色彩瓷砖来拼壁画，规则简单又有策略深度，颜值高、节奏轻快。',
    rules: [
      '每轮按顺序从工坊取同色瓷砖放入个人行列。',
      '一行填满后移入计分墙，按连接和行列加分。',
      '任意玩家完成一整行时触发游戏结束，分高者胜。',
    ],
  },
  {
    id: 'uno',
    name: 'UNO',
    minPlayers: 2,
    maxPlayers: 10,
    duration: '15-30 分钟',
    vibe: '轻松&快速',
    description: '简单易上手的经典牌局，老人孩子都能玩，快速轮流出牌、喊 UNO 增加紧张感。',
    rules: [
      '按顺序出与前一张同色或同数字/符号的牌。',
      '手牌仅剩一张时需要喊“UNO”，被抓到没喊需罚牌。',
      '最先出完手牌者胜，或按积分结算。',
    ],
  },
]

const STORAGE_PREFIX = 'spring-boardgame-room-'

const pickId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)

export default function GameHall() {
  const [playerCount, setPlayerCount] = createSignal(6)
  const [selectedGameId, setSelectedGameId] = createSignal(games[0].id)
  const [room, setRoom] = createSignal<Room>()
  const [joinName, setJoinName] = createSignal('')
  const [toast, setToast] = createSignal('')

  const filteredGames = createMemo(() => {
    const count = playerCount()
    const fit = games.filter(game => count >= game.minPlayers && count <= game.maxPlayers)
    return fit.length ? fit : games
  })

  const selectedGame = createMemo(() => games.find(game => game.id === selectedGameId()) || games[0])

  const roomLink = createMemo(() => room() ? `${window.location.origin}${window.location.pathname}?room=${room().id}` : '')
  const qrUrl = createMemo(() => roomLink()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(roomLink())}`
    : '')

  const loadRoomFromParams = () => {
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get('room')
    if (!roomId)
      return

    const saved = localStorage.getItem(`${STORAGE_PREFIX}${roomId}`)
    if (saved) {
      try {
        const parsed: Room = JSON.parse(saved)
        setRoom(parsed)
        setSelectedGameId(parsed.gameId)
        setPlayerCount(parsed.capacity)
        setToast('已从本地记录恢复桌局，可直接加入或继续主持。')
        return
      } catch (error) {
        console.error(error)
      }
    }

    const capacity = Number(params.get('capacity')) || 6
    const gameId = params.get('game') || games[0].id
    const placeholder: Room = {
      id: roomId,
      gameId,
      capacity,
      players: [],
      createdAt: Date.now(),
    }
    setRoom(placeholder)
    setSelectedGameId(gameId)
    setPlayerCount(capacity)
    setToast('这是一个新链接，当前浏览器会记录后续加入的人数。')
  }

  onMount(loadRoomFromParams)

  const persistRoom = (value: Room) => {
    localStorage.setItem(`${STORAGE_PREFIX}${value.id}`, JSON.stringify(value))
  }

  const createRoom = () => {
    const game = selectedGame()
    const capacity = Math.max(game.minPlayers, Math.min(game.maxPlayers, playerCount()))
    const newRoom: Room = {
      id: pickId(),
      gameId: game.id,
      capacity,
      players: ['主持人'],
      createdAt: Date.now(),
    }
    setRoom(newRoom)
    persistRoom(newRoom)
    setToast('房间已创建，扫码或复制链接邀请好友，人数满额会自动提示。')
    history.replaceState(null, '', `${window.location.pathname}?room=${newRoom.id}&capacity=${capacity}&game=${game.id}`)
  }

  const joinRoom = () => {
    const current = room()
    if (!current) {
      setToast('请先创建或打开一个房间链接。')
      return
    }

    if (current.players.length >= current.capacity) {
      setToast('房间已满，换个局或者等一会儿吧！')
      return
    }

    const name = (joinName() || '').trim() || `玩家${current.players.length}`
    if (current.players.includes(name)) {
      setToast('这个名字已经在房间里啦，换一个昵称吧。')
      return
    }

    const updated: Room = { ...current, players: [...current.players, name] }
    setRoom(updated)
    persistRoom(updated)
    setJoinName('')
    setToast('加入成功！人满后会自动提醒。')
  }

  const seatsLeft = createMemo(() => room() ? Math.max(room().capacity - room().players.length, 0) : 0)

  return (
    <section class="hall-wrapper">
      <div class="hero">
        <div>
          <p class="badge">春节合家欢 · 桌游主持人</p>
          <h1>输入人数，立刻挑选合适桌游</h1>
          <p class="lead">我会在每个游戏里继续担任主持人，简述规则、提醒流程、控制节奏，让家人朋友轻松开桌。</p>
          <div class="hero-actions">
            <label class="input-chip">
              <span>预计人数</span>
              <input
                type="number"
                min="2"
                max="12"
                value={playerCount()}
                onInput={event => setPlayerCount(Number(event.currentTarget.value || 0))}
              />
              <span class="hint">推荐将座位控制在游戏上限内</span>
            </label>
            <button class="primary" type="button" onClick={createRoom}>创建桌局 & 生成二维码</button>
          </div>
          <Show when={room()}>
            <div class="room-info">
              <div>
                <p class="room-title">当前桌局：{selectedGame().name}</p>
                <p class="room-sub">容量 {room().capacity} 人 · 已加入 {room().players.length} 人</p>
                <p class="room-sub">剩余席位 {seatsLeft()}，满员后会提示“房间已满”。</p>
              </div>
              <div class="room-actions">
                <Show when={roomLink()}>
                  <button class="ghost" type="button" onClick={() => navigator.clipboard?.writeText(roomLink())}>复制房间链接</button>
                  <img class="qr" src={qrUrl()} alt="房间二维码" loading="lazy" />
                </Show>
              </div>
            </div>
          </Show>
          <div class="join-box">
            <p>扫码或直接输入昵称加入这个桌局</p>
            <div class="join-inline">
              <input
                type="text"
                placeholder="你的昵称/座位名称"
                value={joinName()}
                onInput={event => setJoinName(event.currentTarget.value)}
              />
              <button class="primary" type="button" onClick={joinRoom}>我要入座</button>
            </div>
            <Show when={toast()}>
              <p class="toast">{toast()}</p>
            </Show>
          </div>
        </div>
        <div class="host-note">
          <p>主持人会帮忙：</p>
          <ul>
            <li>引导开局分配身份、发牌或布置物件</li>
            <li>按人数自动推荐合适的桌游与变体</li>
            <li>在游戏中提醒阶段、计分和时间控制</li>
            <li>发现房间满员时提示换桌或观战</li>
          </ul>
        </div>
      </div>

      <div class="game-grid">
        <For each={filteredGames()}>
          {(game) => (
            <article class={`game-card ${selectedGameId() === game.id ? 'active' : ''}`}>
              <header>
                <div>
                  <p class="tag">{game.vibe}</p>
                  <h2>{game.name}</h2>
                  <p class="sub">{game.minPlayers} - {game.maxPlayers} 人 · {game.duration}</p>
                </div>
                <button class="ghost" type="button" onClick={() => setSelectedGameId(game.id)}>
                  {selectedGameId() === game.id ? '已选' : '选择'}
                </button>
              </header>
              <p class="desc">{game.description}</p>
              <ul class="rules">
                <For each={game.rules}>
                  {(rule) => <li>{rule}</li>}
                </For>
              </ul>
              <Show when={game.tips}>
                <p class="tips">主持人提示：{game.tips}</p>
              </Show>
            </article>
          )}
        </For>
      </div>
    </section>
  )
}
