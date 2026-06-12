# TermPix

[English](README.md) | [简体中文](README_zh.md)

---

[![GitHub License](https://img.shields.io/badge/license-GPL%20v3-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.0.1-green.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

> 支持 iTerm2 和 Sixel 协议的终端图片编解码工具。

**⚠️ 声明：本项目的代码和文档由 AI 生成，仅供参考，请在使用前自行验证。**

## 目录

- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [安装](#安装)
- [使用方法](#使用方法)
  - [编码](#编码)
  - [解码](#解码)
  - [生成密码](#生成密码)
- [项目结构](#项目结构)
- [支持的协议](#支持的协议)
- [许可证](#许可证)

## 功能特性

- **双协议支持**：iTerm2 和 Sixel 编解码
- **批量处理**：一次编解码多个文件
- **加密功能**：AES-256-GCM 加密，PBKDF2 密钥派生
- **随机密码生成**：内置安全密码生成器
- **耗时显示**：显示编解码操作的耗时
- **多种量化算法**：Median Cut 和 PNN（Pairwise Nearest Neighbor）
- **抖动支持**：Floyd-Steinberg 和 Bayer 有序抖动

## 环境要求

| 依赖 | 版本 | 是否必需 |
|------|------|----------|
| Node.js | >= 18 | 是 |

## 安装

```bash
# 克隆仓库
git clone -b main https://github.com/hyfaust/termpix.git
cd termpix

# 安装依赖
npm install

# （可选）全局链接
npm link
```

## 使用方法

### 编码

```bash
# 编码为 iTerm2 格式
termpix encode -f iterm2 image.png

# 编码为 Sixel 格式
termpix encode -f sixel image.png

# 带加密的编码
termpix encode -f iterm2 --encrypt -p mypassword image.png

# 使用自动生成的密码编码
termpix encode -f iterm2 --encrypt --gen-password image.png

# 批量编码多个文件
termpix encode -f iterm2 -o output/ *.png

# 保持原始分辨率（不缩放）
termpix encode -f iterm2 --no-resize image.png

# Sixel 选项：颜色数、量化算法、抖动模式
termpix encode -f sixel --colors 128 --quantize pnn --dither fs image.png
```

#### 编码选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --format <fmt>` | 输出格式：`iterm2` 或 `sixel` | `iterm2` |
| `-o, --output <path>` | 输出文件或目录 | stdout |
| `--max-width <n>` | 最大宽度（像素） | 800 |
| `--max-height <n>` | 最大高度（像素） | 600 |
| `--no-resize` | 保持原始分辨率 | false |
| `--bg <hex>` | 背景色（十六进制） | `000000` |
| `--colors <n>` | 最大调色板颜色数（2-256，仅 Sixel） | 256 |
| `--quantize <algo>` | 算法：`median-cut` 或 `pnn` | `median-cut` |
| `--dither <mode>` | 模式：`none`、`bayer` 或 `fs` | `fs` |
| `--encrypt` | 启用加密 | false |
| `-p, --password <pwd>` | 加密密码 | - |
| `--gen-password` | 生成随机密码 | false |

### 解码

```bash
# 自动检测格式并解码
termpix decode sequence.iterm2

# 解码 Sixel 文件
termpix decode -f sixel sixel-data.txt

# 解密并解码
termpix decode --decrypt -p mypassword encrypted.enc

# 批量解码多个文件
termpix decode -o output/ *.iterm2 *.sixel

# 保存为 JPEG
termpix decode -f jpeg -q 90 -o output.jpg sequence.iterm2
```

#### 解码选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --format <fmt>` | 输入格式：`auto`、`iterm2`、`sixel` | `auto` |
| `-o, --output <path>` | 输出文件或目录 | stdout |
| `--decrypt` | 解密输入 | false |
| `-p, --password <pwd>` | 解密密码 | - |

### 生成密码

```bash
# 生成 16 位密码（默认）
termpix gen-password

# 生成 32 位密码
termpix gen-password -l 32
```

## 项目结构

```
termpix-cli/
├── bin/
│   └── termpix.js            # CLI 入口
├── src/
│   ├── index.js              # 模块导出
│   ├── framebuffer.js        # 像素数据结构
│   ├── image-loader.js       # 图片加载（文件/URL）
│   ├── scaler.js             # 图片缩放
│   ├── iterm2-encoder.js     # iTerm2 协议编码器
│   ├── iterm2-decoder.js     # iTerm2 协议解码器
│   ├── sixel-encoder.js      # Sixel 协议编码器
│   ├── sixel-decoder.js      # Sixel 协议解码器
│   ├── quantize.js           # 颜色量化（Median Cut, PNN）
│   ├── dither.js             # 抖动算法（Floyd-Steinberg, Bayer）
│   ├── crypto.js             # AES-256-GCM 加密
│   └── zip.js                # ZIP 文件处理
├── test/                     # 测试文件
├── package.json
└── LICENSE
```

## 支持的协议

### iTerm2

适用于 iTerm2、WezTerm、VS Code、Warp、mintty、rio 等终端的内联图片协议。

```
ESC ] 1337 ; File = size=N ; width=Wpx ; height=Hpx ; inline=1 : BASE64_DATA BEL
```

### Sixel

大多数现代终端支持的 DEC Sixel 图形协议。

## 许可证

本项目基于 [GNU 通用公共许可证 v3.0](LICENSE) 授权。

---

**注意**：本项目的代码和文档由 AI 生成，仅供参考。
