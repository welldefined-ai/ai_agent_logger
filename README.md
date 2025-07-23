# AI Agent Logger 

一个支持多个AI提供商的命令行聊天工具，支持 Claude code 和 Google Gemini，会将对话记录存储在logs中。

## 安装

```bash
npm install
```

## 使用

1. 设置 API Keys：
```bash
export ANTHROPIC_API_KEY=your_anthropic_api_key_here
export GEMINI_API_KEY=your_gemini_api_key_here
```

2. 运行：
```bash
npm start
```

## 命令

- `exit` 或 `quit` - 退出程序
- `clear` - 清空对话历史
- `switch` - 切换AI提供商（Claude ↔ Gemini）
- 其他任何输入 - 发送给当前选择的AI

## 功能

- 支持 Claude 和 Google Gemini 两个AI提供商
- 实时流式响应显示
- 多轮对话支持
- 一键切换AI提供商
- 保持对话历史记录
- 简洁的命令行界面

## 支持的AI模型

- **Claude**: claude-3-5-sonnet-20241022
- **Gemini**: gemini-pro