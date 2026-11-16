/* 影像资料清单
   - bvid：哔哩哔哩视频号（用于 iframe 兜底播放）
   - file：本地视频文件（位于 assets/video/）。
           若本地文件存在则优先播放本地文件；不存在时自动回退到 B 站 iframe。
   注意：*.mp4 未纳入 Git（单文件超 100MB，见 .gitignore 与 assets/video/README.md），
         影像随作品压缩包提交；克隆仓库后文件缺失属于预期行为，保留 bvid 即可在线播放。 */
window.VIDEO_LIST = [
  {
    "topic": "安塞腰鼓",
    "bvid": "BV1424y1G7EC",
    "file": "assets/video/yaogu.mp4",
    "title": "安塞腰鼓 · 正月神木现场表演",
    "up": "安塞腰鼓张海学",
    "dur": 142,
    "hit": true
  },
  {
    "topic": "华县皮影戏",
    "bvid": "BV1n14y1y7pD",
    "file": "assets/video/pixi.mp4",
    "title": "开篇——源远流长的华县皮影(中文版)",
    "up": "华县皮影之译介与传播",
    "dur": 164,
    "hit": true
  },
  {
    "topic": "秦腔",
    "bvid": "BV1ornQ6ZEtg",
    "file": "assets/video/qinqiang.mp4",
    "title": "甘肃省秦剧团郭宝宝主演秦腔折子戏《看女》",
    "up": "奇男子英俊少年",
    "dur": 2990,
    "hit": true
  },
  {
    "topic": "陕北民歌",
    "bvid": "BV1uX4y12748",
    "file": "assets/video/shanbeiminge.mp4",
    "title": "8首陕北民歌郭涛 《山那边》《酒杯杯》《走西口》《泪蛋蛋掉在酒杯杯里》",
    "up": "小松鼠漫社",
    "dur": 1843,
    "hit": true
  },
  {
    "topic": "临夏花儿",
    "bvid": "BV1Ch4y1f7sN",
    "file": "assets/video/linxiahuaer.mp4",
    "title": "《临夏花儿》——《一路阳光一路歌》2023新歌MV展播",
    "up": "快乐阳光组委会",
    "dur": 248,
    "hit": true
  },
  {
    "topic": "热贡唐卡",
    "bvid": "BV1qJn1zfE1o",
    "file": "assets/video/regongyishu.mp4",
    "title": "热贡唐卡市场的水有多深？【唐弟说唐卡】",
    "up": "唐弟唐卡",
    "dur": 472,
    "hit": true
  },

  /* 新疆维吾尔自治区 */
  {
    "topic": "维吾尔木卡姆艺术",
    "bvid": "BV1wq4y1S7KP",
    "file": "assets/video/muqam.mp4",
    "title": "十二木卡姆《拉克木卡姆·第一达斯坦间奏曲》｜中央民族乐团",
    "up": "中央民族乐团",
    "dur": 0,
    "hit": true
  },
  {
    "topic": "维吾尔族达瓦孜",
    "bvid": "BV1SiNc6NETT",
    "file": "assets/video/dawaazi.mp4",
    "title": "新疆非遗杂技《达瓦孜》",
    "up": "哔哩哔哩",
    "dur": 192,
    "hit": true
  },
  {
    "topic": "艾德莱斯绸织染技艺",
    "bvid": "BV1kS4y1H7jd",
    "file": "assets/video/aidelaisi.mp4",
    "title": "《这里是新疆》和田 艾德莱斯 维族的丝绸记忆",
    "up": "哔哩哔哩",
    "dur": 342,
    "hit": true
  },
  {
    "topic": "维吾尔族麦西热甫",
    "bvid": "BV1Gc411K7uK",
    "file": "assets/video/meshrep.mp4",
    "title": "中华非物质文化遗产 32 · 麦西热甫",
    "up": "哔哩哔哩",
    "dur": 423,
    "hit": true
  }
];
