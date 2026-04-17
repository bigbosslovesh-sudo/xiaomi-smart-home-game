// ===== Level Configuration =====

export interface DeviceInfo {
  id: string;
  name: string;
  targetRoom: string;
  description: string;
  imageSrc?: string;
  isDecoy?: boolean;
  decoyFeedback?: string;
}

export interface TriggerOption {
  id: string;
  label: string;
  correct: boolean;
  fb: string;
}

export interface ActionOption {
  id: string;
  label: string;
  correct: boolean;
  fb: string;
}

export interface TimelineItem {
  time: string;
  text: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  subName: string;
  timeRange: string;
  storyText: string;
  challengeText: string;
  devices: DeviceInfo[];
  triggers: TriggerOption[];
  actions: ActionOption[];
  hints: string[];
  timeline: TimelineItem[];
  successTitle: string;
  successText: string;
  nextText: string;
  // Device placement positions in 3D (FullApartment coordinate system)
  devicePositions: Record<string, [number, number, number]>;
  // Device model overrides
  deviceModels?: Record<string, { glb: string; scale: number; rotateY?: number }>;
  // Room zones for drag detection (screen x percentage ranges)
  roomZones: { id: string; range: [number, number] }[];
  // Which rooms are active/interactive in this level
  activeRooms: string[];
  // Camera config per level
  camera?: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
  // Transition text shown after success, before next level button
  transitionText?: string;
  // Level 3: multi-rule linking (two separate trigger→action chains)
  multiRule?: {
    rules: {
      name: string;
      triggers: TriggerOption[];
      actions: ActionOption[];
    }[];
  };
  // Level 4: card selection mode (instead of drag+link)
  cardMode?: {
    introText?: string; // HyperMind opening text before cards
    cards: {
      id: string;
      title: string;
      description: string;
      source?: string; // AI learning source explanation
      clue: string;
      correctChoice: 'enable' | 'disable';
      feedback: string;
      mustBeCorrect?: boolean;
    }[];
    passThreshold: number;
  };
}

// ===== Level 1: 无声默契 =====
export const level1: LevelConfig = {
  id: 1,
  name: '无声默契',
  subName: '1-1',
  timeRange: '7:00 — 7:30',
  storyText: '周六，早上 7:00。\n新的一天开始了。\n如果家里的设备足够聪明，起床这件事可以变得很美好——\n不用手忙脚乱，不用等待，一切都在你醒来的那一刻自动准备好。',
  challengeText: '请用米家生态设备为准备起床的小明打造"无声的默契"：\n1. 设备检测到小明自然醒来\n2. 卧室窗帘自动拉开\n3. 浴室热水已备好\n4. 厨房早粥已在等他',
  devices: [
    { id: 'band', name: 'Xiaomi 手环 10', targetRoom: 'bedroom', description: '睡眠监测、震动闹钟、无声唤醒', imageSrc: '/assets/level1/devices/band.png' },
    { id: 'curtain', name: '米家智能窗帘 2', targetRoom: 'bedroom', description: '定时开合、联动触发、静音电机', imageSrc: '/assets/level1/devices/smart-curtain.png' },
    { id: 'cooker', name: '米家智能IH电饭煲P1 3L', targetRoom: 'kitchen', description: '预约煮粥、联动触发、智能保温', imageSrc: '/assets/level1/devices/rice-cooker.png' },
    { id: 'heater', name: '米家智能电热水器 Pro 60L', targetRoom: 'bathroom', description: '预约加热、联动触发、恒温控制', imageSrc: '/assets/level1/devices/water-heater.png' },
    { id: 'xiaoai', name: 'Xiaomi 智能音箱 Pro', targetRoom: '', description: '语音助手，但小明在睡觉', imageSrc: '/assets/level1/devices/xiaoai.png', isDecoy: true, decoyFeedback: '需要你先醒来开口说话才能工作。这不是自动感知，而是等你下指令。' },
    { id: 'alarm', name: '普通闹钟', targetRoom: '', description: '定时响铃、贪睡模式', isDecoy: true, decoyFeedback: '只会响铃，窗帘不会动，粥不会煮。它是一座孤岛，没法联动。' },
  ],
  triggers: [
    { id: 'band-wakeup', label: '手环检测到起床', correct: true, fb: '' },
    { id: 'alarm-ring', label: '闹钟响铃', correct: false, fb: '普通闹钟只会响铃，没法触发其他设备联动。' },
    { id: 'xiaoai-voice', label: '对小爱说指令', correct: false, fb: '小明还在睡觉，没法开口说话。' },
  ],
  actions: [
    { id: 'curtain-open', label: '窗帘缓缓打开', correct: true, fb: '' },
    { id: 'cooker-start', label: '电饭煲启动煮粥', correct: true, fb: '' },
    { id: 'heater-start', label: '热水器开始加热', correct: true, fb: '' },
    { id: 'xiaoai-morning', label: '小爱播报"早上好"', correct: false, fb: '这一关的核心是"无声"——不需要语音播报。' },
  ],
  hints: ['有没有一种设备，能感知你的睡眠状态？', 'Xiaomi 手环 10 可以监测睡眠，作为联动触发条件'],
  timeline: [
    { time: '7:00', text: '手环震动，小明自然醒了' },
    { time: '7:01', text: '窗帘拉开 + 电饭煲启动 + 热水器启动' },
    { time: '7:10', text: '走进浴室，热水到了舒适温度' },
    { time: '7:25', text: '走进厨房，热粥冒着香气，豆豆跑过来' },
  ],
  successTitle: '无声默契 — 完成',
  successText: '无声默契——你还没起身，家已经为你准备好了一切。\n它们像有生命的个体一样，读懂了你的需要。',
  transitionText: '早餐吃完了，小明窝在沙发上，想看一部电影。\n但客厅阳光刺眼，灯也太亮了……',
  nextText: '进入第2关',
  activeRooms: ['bedroom', 'bathroom', 'kitchen'],
  camera: {
    position: [0, 10, 6],
    target: [0, 2.9, -2.15],
    fov: 38,
  },
  devicePositions: {
    'Xiaomi 手环 10': [-0.2, 3.63, -4.6],
    '米家智能窗帘 2': [-0.2, 4.94, -6.15],
    '米家智能IH电饭煲P1 3L': [2.12, 3.86, -5.9],
    '米家智能电热水器 Pro 60L': [-3.72, 4.98, -6.15],
    'Xiaomi 智能音箱 Pro': [0.8, 3.56, -5.1],
    '普通闹钟': [-1.2, 3.56, -5.1],
  },
  deviceModels: {
    'Xiaomi 手环 10': { glb: '/assets/models/band.glb', scale: 0.15 },
    '米家智能IH电饭煲P1 3L': { glb: '/assets/models/rice-cooker.glb', scale: 0.25, rotateY: Math.PI / 2 },
  },
  roomZones: [
    { id: 'bathroom', range: [0.02, 0.32] },
    { id: 'bedroom', range: [0.32, 0.62] },
    { id: 'kitchen', range: [0.62, 0.85] },
  ],
};

// ===== Level 2: 光影时刻 =====
export const level2: LevelConfig = {
  id: 2,
  name: '光影时刻',
  subName: '2-1',
  timeRange: '10:00 — 10:30',
  storyText: '上午 10:00，早餐吃完了。\n小明想窝在沙发上看一部电影。\n但现在的客厅——阳光刺眼，主灯太亮，根本没有观影的氛围。\n在小米的智能家居生态里，你只需要对小爱说一句话，整个客厅就能变成一间私人影院。',
  challengeText: '对小爱说一句"观影模式"，把客厅变成私人影院：挡住刺眼的阳光，用氛围灯营造影院般的氛围灯光，大屏和音响音效准备就绪。注意：观影是一件安静、沉浸的事——别让不合适的设备打破氛围',
  devices: [
    { id: 'curtain', name: '米家智能窗帘 2', targetRoom: 'living', description: '联动开合、静音遮光', imageSrc: '/assets/level2/devices/curtain.png' },
    { id: 'led-strip', name: '米家追光氛围灯带', targetRoom: 'living', description: '1600万色、多种模式、亮度色温可调' },
    { id: 'tv', name: '小米电视S Pro Mini LED 2026', targetRoom: 'living', description: '4K高清、影院模式、小爱语音控制', imageSrc: '/assets/level2/devices/tv.png' },
    { id: 'speaker', name: 'Xiaomi 智能音箱 Pro', targetRoom: 'living', description: '语音助手、影院音效、场景控制', imageSrc: '/assets/level2/devices/speaker.png' },
    { id: 'vacuum', name: '米家扫拖机器人 M40 S', targetRoom: '', description: '自动清扫、定时清扫', isDecoy: true, decoyFeedback: '观影氛围被打破了！扫地机器人突然在脚边轰隆隆地跑，豆豆吓了一跳，电影也看不下去了。观影需要的是安静和沉浸。' },
    { id: 'band', name: 'Xiaomi 手环 10', targetRoom: '', description: '睡眠监测、震动闹钟', imageSrc: '/assets/level1/devices/band.png', isDecoy: true, decoyFeedback: '手环能感知你的身体状态，但"想看电影"不是一个身体动作。这种主动的需求，用语音告诉小爱是最自然的方式。' },
  ],
  triggers: [
    { id: 'xiaoai-cinema', label: '对小爱说"观影模式"', correct: true, fb: '' },
    { id: 'band-detect', label: '手环检测到坐下', correct: false, fb: '手环能感知你的身体状态，但"想看电影"不是一个身体动作。这种主动的需求，用语音告诉小爱是最自然的方式。' },
  ],
  actions: [
    { id: 'curtain-close', label: '窗帘关闭遮光', correct: true, fb: '阳光太刺眼了——任务说了"挡住刺眼的阳光"，窗帘还开着，阳光直射屏幕，什么都看不清。' },
    { id: 'led-cinema', label: '氛围灯带开启影院模式（暖色低亮度）', correct: true, fb: '太黑了，没有影院的感觉——窗帘关了，但没有氛围灯光，客厅一片漆黑。电影院也不是全黑的——走道总有一排柔和的灯。' },
    { id: 'tv-on', label: '电视打开', correct: true, fb: '影院的核心还没就位——氛围到位了，但没有画面。电影院的灵魂是大屏和好声音。' },
    { id: 'speaker-cinema', label: '音箱切换影院音效', correct: true, fb: '影院的核心还没就位——氛围到位了，但没有声音。电影院的灵魂是大屏和好声音。' },
    { id: 'vacuum-clean', label: '扫地机器人开始清扫', correct: false, fb: '观影氛围被打破了！扫地机器人突然在脚边轰隆隆地跑，豆豆吓了一跳，电影也看不下去了。' },
  ],
  hints: ['看电影首先要遮光——窗帘和灯光是关键', '想看电影这种主动需求，用语音告诉小爱最自然'],
  timeline: [
    { time: '10:00', text: '小爱同学，观影模式。——好的，正在为你切换。' },
    { time: '10:01', text: '窗帘缓缓合上，阳光被挡在外面。氛围灯带亮起柔和的暖光。电视亮了，音箱切到影院音效。' },
    { time: '10:02', text: '小明靠在沙发上，豆豆趴在脚边，电影开始了。' },
  ],
  successTitle: '光影时刻 — 完成',
  successText: '光影时刻——一句话，整个家为你切换。\n在小米的智能家居生态里，小爱同学是连接一切的声音。它听懂你的需求，让家里的每一个设备默契配合。',
  transitionText: '一句话，客厅变影院。小爱同学，就是这个家的灵魂。\n电影看完了，下午阳光正好。小明看了眼豆豆："走，去公园逛逛？"\n豆豆的尾巴已经摇起来了。接下来，家和车要一起配合了。',
  nextText: '进入第3关',
  activeRooms: ['living'],
  camera: {
    position: [-2, 6, 8],
    target: [-3.12, 1.4, 0],
    fov: 40,
  },
  devicePositions: {
    '米家智能窗帘 2': [-5.56, 1.96, -0.5],
    '米家追光氛围灯带': [-3.12, 2.72, -1.8],
    '小米电视S Pro Mini LED 2026': [-3.12, 1.2, -1.65],
    'Xiaomi 智能音箱 Pro': [-3.92, 0.55, -1.7],
    '米家扫拖机器人 M40 S': [-4.12, 0.1, 0.5],
    'Xiaomi 手环 10': [-3.12, 0.55, 1.5],
  },
  roomZones: [
    { id: 'living', range: [0.05, 0.82] },
  ],
};

// ===== Level 3: 安心出门 =====
export const level3: LevelConfig = {
  id: 3,
  name: '安心出门',
  subName: '3-1',
  timeRange: '14:00 — 14:05',
  storyText: '下午 2:00，阳光正好。\n小明揣上手机，准备开车去公园逛逛。豆豆今天留在家里。\n在小米人车家全生态中，"出门"不只是锁门走人——家会自动进入守护状态，车会提前为你准备好。\n关上门的那一刻，家和车同时响应。这就是人车家的默契。',
  challengeText: '让家和车同时为你准备好，安心出发：关上大门后，家里的灯自动关闭，摄像头自动开启守护安全；豆豆一个人在家，得有点声音陪着它；走近SU7时，车门自动解锁，车内已经凉快了。注意：豆豆还在家里，别让它受到惊吓。这一关需要设置两条联动规则——一条管家，一条管车',
  devices: [
    { id: 'door-sensor', name: '米家门窗传感器 2', targetRoom: 'hallway', description: '检测门窗开关状态、触发联动', imageSrc: '/assets/level3/devices/door-sensor.png' },
    { id: 'camera', name: '小米智能摄像机 云台版2K', targetRoom: 'living', description: '实时监控、移动侦测、双向对讲', imageSrc: '/assets/level3/devices/camera.png' },
    { id: 'speaker', name: 'Xiaomi 智能音箱 Pro', targetRoom: 'living', description: '语音助手、播放音乐、智能控制', imageSrc: '/assets/level3/devices/speaker.png' },
    { id: 'phone', name: 'Xiaomi 17', targetRoom: 'parking', description: '靠近车辆自动感应解锁、远程控车', imageSrc: '/assets/level3/devices/phone.png' },
    { id: 'vacuum', name: '米家扫拖机器人 M40 S', targetRoom: '', description: '自动清扫、定时清扫', imageSrc: '/assets/level3/devices/vacuum.png', isDecoy: true, decoyFeedback: '豆豆被吓到了！扫地机器人突然启动，豆豆吓得满屋跑。家里有宠物时，离家别启动扫地机——等豆豆不在家时再清扫。' },
    { id: 'car-key', name: '实体车钥匙', targetRoom: '', description: '按键解锁、机械启动', isDecoy: true, decoyFeedback: '实体车钥匙可以解锁车门，但做不到"提前开空调"。Xiaomi 17 靠近车辆就能自动感应，解锁和空调一步到位。' },
  ],
  triggers: [],
  actions: [],
  multiRule: {
    rules: [
      {
        name: '离家模式',
        triggers: [
          { id: 'door-close', label: '门窗传感器检测到关门', correct: true, fb: '' },
          { id: 'voice-cmd', label: '对小爱说"离家模式"', correct: false, fb: '用小爱语音触发可以，但你每次出门都得记得喊一句——万一忘了呢？门窗传感器能自动检测到你关门，完全不用操心。' },
        ],
        actions: [
          { id: 'camera-on', label: '摄像头开启布防', correct: true, fb: '灯关了，但没有摄像头在看家。豆豆一个人在家，万一有情况呢？' },
          { id: 'music-play', label: '小爱给豆豆播放轻音乐', correct: true, fb: '灯关了，家里突然变得很安静。豆豆焦躁地在屋里走来走去。宠物独自在家时，一点声音可以让它安心。' },
          { id: 'vacuum-start', label: '扫地机器人开始清扫', correct: false, fb: '豆豆被吓到了！扫地机器人突然启动，豆豆吓得满屋跑。家里有宠物时，离家别启动扫地机。' },
        ],
      },
      {
        name: '上车模式',
        triggers: [
          { id: 'phone-uwb', label: '手机靠近车辆自动感应', correct: true, fb: '' },
          { id: 'car-key', label: '按下钥匙解锁键', correct: false, fb: '实体车钥匙可以解锁车门，但做不到"提前开空调"。Xiaomi 17 靠近车辆就能自动感应，解锁和空调一步到位。这就是智能手机和传统钥匙的区别。' },
        ],
        actions: [
          { id: 'car-unlock', label: '车门自动解锁', correct: true, fb: '' },
          { id: 'car-ac', label: '车内空调提前启动', correct: true, fb: '' },
        ],
      },
    ],
  },
  hints: ['出门时最自然的触发方式是什么？关门这个动作本身就是信号', '豆豆独自在家，需要安抚——但别用会吓到它的设备'],
  timeline: [
    { time: '14:00', text: '大门关上了——离家模式启动。' },
    { time: '14:01', text: '灯光关闭，摄像头开始守护这个家。小爱播放起轻音乐——豆豆竖了竖耳朵，安心地趴下了。' },
    { time: '14:03', text: '走向SU7，Xiaomi 17 感应到了车辆——' },
    { time: '14:04', text: '车门自动解锁，车内空调已经在工作。坐进去，温度刚刚好。' },
    { time: '14:05', text: '小明看了一眼手机上的米家——摄像头画面里，豆豆正趴在沙发上听音乐，很安心。' },
  ],
  successTitle: '安心出门 — 完成',
  successText: '安心出门——关上门的那一刻，家自动进入守护模式。走近车的那一刻，SU7已经为你准备好了。\n这就是小米人车家全生态的力量：家和车不再是两个孤立的空间，而是通过小米生态紧密相连。\n"人在家里可以控制车，人在车里可以控制家。"——这就是人车家。',
  transitionText: '车子驶出小区，小明瞄了一眼手机——摄像头画面里，豆豆趴在沙发上，耳朵随着音乐轻轻动。\n关门的瞬间家自动守护，走近车的瞬间SU7自动迎接。这就是人车家全生态——家和车，从此不再是两个孤立的世界。\n一个下午过得很快。傍晚，夕阳西下，该回家了。\n回家的路上，小明在想：要是到家时，一切都已经准备好了就好了……',
  nextText: '进入第4关',
  activeRooms: ['living', 'hallway', 'parking'],
  camera: {
    position: [2, 6, 8],
    target: [0, 1.4, 0],
    fov: 40,
  },
  devicePositions: {
    '米家门窗传感器 2': [0.75, 1.68, 1.9],
    '小米智能摄像机 云台版2K': [-0.92, 2.5, -1.7],
    'Xiaomi 智能音箱 Pro': [-3.92, 0.55, -1.7],
    'Xiaomi 17': [3.37, 0.5, 0],
    '米家扫拖机器人 M40 S': [-2.12, 0.1, 0.8],
  },
  roomZones: [
    { id: 'living', range: [0.05, 0.48] },
    { id: 'hallway', range: [0.45, 0.62] },
    { id: 'parking', range: [0.58, 0.88] },
  ],
};

// ===== Level 4: 家的记忆 =====
export const level4: LevelConfig = {
  id: 4,
  name: '家的记忆',
  subName: '4-1',
  timeRange: '17:55 — 18:05',
  storyText: '傍晚 6:00，公园逛了一下午，小明开车回家。\n"这首歌真好听，回家接着听。"\n"走了一下午好渴，回家第一件事喝杯温水。"\n小明看了眼窗外，太阳快下山了。\n翻了翻手机相册：今天拍了好多照片，回家放到大屏上看看。\n打开米家看了眼豆豆的摄像头：它下午自己在家乖不乖啊？\n出去了一下午，家里肯定闷了。\n"今晚自己做饭，冰箱里还有菜。"\n终于要到家了，有点累，想安安静静的。',
  challengeText: 'HyperMind 学习了小明的习惯，给出了9条建议。根据小明此刻的状态，选择启用或禁用每条建议',
  devices: [], // Level 4 uses card mode, not device drag
  triggers: [],
  actions: [],
  cardMode: {
    introText: '经过这一天，你的家已经在学习你的生活习惯。\n现在，HyperMind 根据你过去的行为，为"回家"这个时刻准备了一组建议。\n但AI再聪明，也不完全了解此刻的你。\n请根据刚才的情况，选择哪些建议应该启用、哪些不需要。',
    passThreshold: 7,
    cards: [
      { id: 'ac-precool', title: '提前调节室温', description: '到家前5分钟，根据室外温度自动调节小米空调至舒适温度', source: '你每次回家后都会手动开空调', clue: '出去了一下午，家里肯定闷了', correctChoice: 'enable', feedback: '家里闷了一下午，还可以更舒适。' },
      { id: 'lights-curtain', title: '灯光与窗帘', description: '检测到日落，到家后自动开启吸顶灯（暖色40%）并关闭窗帘', source: '你通常在天黑后回家会开灯关帘', clue: '太阳快下山了', correctChoice: 'enable', feedback: '天都黑了，还可以更舒适。' },
      { id: 'music-handoff', title: '音乐无缝流转', description: '车内正在播放的歌曲，到家后无缝流转到客厅音箱继续播放', source: '你经常在车和家之间连续听歌', clue: '这首歌真好听，回家接着听', correctChoice: 'enable', feedback: '歌声断了——小明说过"这首歌真好听，回家接着听"。' },
      { id: 'warm-water', title: '温水已备好', description: '到家前10分钟，恒温水壶自动加热至45度', source: '你每次回家后习惯先喝一杯温水', clue: '走了一下午好渴，回家第一件事喝杯温水', correctChoice: 'enable', feedback: '小明回来想喝杯温水，但水壶没有提前烧。' },
      { id: 'pet-report', title: '豆豆状态简报', description: '到家时，音箱播报豆豆下午的活动情况、进食时间、有无异常', source: '你出门后经常查看摄像机画面', clue: '它下午自己在家乖不乖啊？', correctChoice: 'enable', feedback: '豆豆下午过得怎么样？小明一直惦记着呢。' },
      { id: 'photo-sync', title: '照片投屏到大屏', description: '连接WiFi后，手机今天拍的照片自动同步到电视上轮播', source: '你周末回家后经常在大屏看照片', clue: '今天拍了好多照片，回家放到大屏上看看', correctChoice: 'enable', feedback: '今天的照片还在手机里——小明想在大屏上看看。' },
      { id: 'vacuum-start', title: '启动扫地机器人', description: '到家后，启动米家扫拖机器人全屋清扫', source: '你通常回家后会启动一次清扫', clue: '', correctChoice: 'disable', feedback: '豆豆又被吓到了！扫地机器人启动了，豆豆满屋乱跑。还记得出门那一关吗？家里有宠物时，不适合启动扫地机。', mustBeCorrect: true },
      { id: 'loud-welcome', title: '小爱大声播报欢迎语', description: '开门后，音箱大声播报"欢迎回家！今天天气晴，明天多云..."', source: '你之前设置过回家欢迎语', clue: '有点累，想安安静静的', correctChoice: 'disable', feedback: '打破了安静的氛围——刚流转过来的音乐被大声播报打断了。小明说过"想安安静静的"。' },
      { id: 'order-food', title: '帮你预约常吃的外卖', description: '根据周末习惯，音箱帮你预约常点的那家餐厅外卖', source: '你最近三个周末都点了同一家', clue: '今晚自己做饭，冰箱里还有菜', correctChoice: 'disable', feedback: '今晚要自己做饭哦——小明说了"冰箱里还有菜，自己做"。AI帮你做决定很方便，但有些事还是自己说了算。' },
    ],
  },
  hints: ['仔细回忆开场故事里小明提到的每一个细节', '豆豆刚到家，什么设备会吓到它？'],
  timeline: [
    { time: '17:55', text: '车辆驶近，空调启动，水壶加热' },
    { time: '18:00', text: '到家，停车，车门锁定' },
    { time: '18:01', text: '开门，暖光亮起，窗帘合上' },
    { time: '18:02', text: '豆豆跑来迎接，音箱播报它下午的状态' },
    { time: '18:03', text: '温水已好，小明端起杯子' },
    { time: '18:04', text: '车里的歌在音箱继续播放，无缝流转' },
    { time: '18:05', text: '公园照片出现在电视上，温馨的一天' },
  ],
  successTitle: '家的记忆 — 完成',
  successText: '从清晨的第一碗热粥，到傍晚的一杯温水。\n从出门时的自动守护，到回家时的一切就绪。\n它们像有生命的个体，串联起家、车和你。\n这就是人车家全生态。\n也许，这也是一种触手可及的美好。',
  nextText: '通关',
  activeRooms: ['living', 'hallway', 'parking', 'kitchen'],
  camera: {
    position: [0, 10, 6],
    target: [0, 2.9, -2.15],
    fov: 38,
  },
  devicePositions: {},
  roomZones: [],
};

export const allLevels = [level1, level2, level3, level4];
