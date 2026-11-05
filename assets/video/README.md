# 影像素材说明

本目录存放站点的 10 段现场影像（合计约 432 MB）。

## 为什么没有纳入 Git 仓库

| 问题 | 说明 |
|---|---|
| 单文件超限 | `qinqiang.mp4` 为 158 MB，**超过 GitHub / Gitee 单文件 100 MB 硬限制**，直接推送会被拒绝 |
| 仓库体积 | 10 段影像合计 432 MB，克隆成本高，评审拉取体验差 |
| 无 LFS | 当前环境未安装 Git LFS，无法用大文件托管方案 |

因此 `.gitignore` 已排除本目录下的 `*.mp4`，影像**随作品压缩包一并提交**。

## 缺失时会发生什么

**站点功能不受影响。** `assets/videos.js` 中同时保存了本地文件名（`file`）与哔哩哔哩视频号（`bvid`）：

- 本地文件存在 → 优先播放本地 MP4
- 本地文件缺失 → 自动回退为哔哩哔哩在线播放器

也就是说，从 Git 克隆下来的仓库**依然可以完整演示影像功能**（需要联网）。

## 如何恢复本地影像

### 方式一：从作品压缩包解压

把提交包中的 `assets/video/*.mp4` 释放到本目录即可。

### 方式二：用 yt-dlp 重新下载

```bash
# 安装（任选其一）
pip install yt-dlp
# 或 https://github.com/yt-dlp/yt-dlp/releases 下载可执行文件

# 逐条下载（文件名必须与下表一致）
yt-dlp -f "bestvideo[height<=480]+bestaudio/best" --merge-output-format mp4 \
  -o "assets/video/yaogu.mp4" "https://www.bilibili.com/video/BV1424y1G7EC"
```

### 方式三：浏览器手动下载

访问下表的哔哩哔哩链接，自行下载后按文件名重命名放入本目录。

## 文件与来源对照

| 文件名 | 对应项目 | BV 号 | 时长 |
|---|---|---|---|
| `yaogu.mp4` | 安塞腰鼓 | BV1424y1G7EC | 02:21 |
| `pixi.mp4` | 华县皮影戏 | BV1n14y1y7pD | 02:43 |
| `qinqiang.mp4` | 秦腔 | BV1ornQ6ZEtg | 22:40 |
| `shanbeiminge.mp4` | 陕北民歌 | BV1uX4y12748 | 30:43 |
| `linxiahuaer.mp4` | 临夏花儿 | BV1Ch4y1f7sN | 04:08 |
| `regongyishu.mp4` | 热贡唐卡 | BV1qJn1zfE1o | 07:51 |
| `muqam.mp4` | 维吾尔木卡姆 | BV1wq4y1S7KP | 05:36 |
| `dawaazi.mp4` | 维吾尔族达瓦孜 | BV1SiNc6NETT | 03:11 |
| `aidelaisi.mp4` | 艾德莱斯绸 | BV1kS4y1H7jd | 05:41 |
| `meshrep.mp4` | 维吾尔族麦西热甫 | BV1Gc411K7uK | 07:02 |

播放链接格式：`https://www.bilibili.com/video/<BV 号>`

## 版权提示

以上影像均来自哔哩哔哩公开视频，**仅用于非商业展示**。正式公开发布前应替换为已授权素材或自摄内容。
