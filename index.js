#!/usr/bin/env node

import readline from 'readline';
import { query } from '@anthropic-ai/claude-code';
import { GoogleGenerativeAI } from '@google/generative-ai';

class AICodeSimulator {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.conversationHistory = [];
    this.currentProvider = 'claude'; // Default to Claude
    this.claudeSessionId = null; // 持续的Claude会话ID
    this.systemPrompt = `You are Claude Code, Anthropic's official CLI for Claude.
You are an interactive CLI tool that helps users with software engineering tasks.
You should be concise, direct, and to the point.
Your responses can use Github-flavored markdown for formatting.
Keep your responses short and focused on the specific task at hand.`;
  }

  async start() {
    console.log('🤖 AI Code Assistant - 支持 Claude Code 和 Gemini');
    console.log('请确保设置了 ANTHROPIC_API_KEY 和 GEMINI_API_KEY 环境变量');
    console.log(`当前使用: ${this.currentProvider.toUpperCase()}`);
    console.log('输入 "/help" 查看可用命令');
    if (this.currentProvider === 'claude') {
      console.log('🤖 Claude Code 模式: 享受完整的编程助手体验！');
    }
    console.log();

    this.promptUser();
  }

  promptUser() {
    const prompt = this.currentProvider === 'claude' ? '> ' : '> ';
    this.rl.question(prompt, async (input) => {
      // 处理特殊命令
      if (input.toLowerCase() === '/exit' || input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        this.rl.close();
        console.log('\n👋 再见！');
        process.exit(0);
      }

      if (input.toLowerCase() === '/clear' || input.toLowerCase() === 'clear') {
        this.conversationHistory = [];
        this.claudeSessionId = null; // 重置Claude会话ID
        console.log('💭 对话历史已清空\n');
        this.promptUser();
        return;
      }

      if (input.toLowerCase() === '/switch' || input.toLowerCase() === 'switch') {
        this.currentProvider = this.currentProvider === 'claude' ? 'gemini' : 'claude';
        console.log(`🔄 已切换到: ${this.currentProvider.toUpperCase()}`);
        if (this.currentProvider === 'claude') {
          console.log('现在您处于 Claude Code 模式，享受完整的编程助手体验！');
        } else {
          console.log('现在您处于 Gemini 模式。');
        }
        console.log();
        this.promptUser();
        return;
      }

      if (input.toLowerCase() === '/help') {
        this.showHelp();
        this.promptUser();
        return;
      }

      if (input.trim() === '') {
        this.promptUser();
        return;
      }

      await this.sendToAI(input);
    });
  }

  showHelp() {
    console.log('\n📖 可用命令:');
    console.log('  /switch - 切换AI提供商 (Claude Code ↔ Gemini)');
    console.log('  /clear  - 清空对话历史');
    console.log('  /exit   - 退出程序');
    console.log('  /help   - 显示此帮助信息');
    console.log('\n当前模式:', this.currentProvider.toUpperCase());
    if (this.currentProvider === 'claude') {
      console.log('🤖 Claude Code 模式: 完整的编程助手体验，支持文件操作、代码分析等');
    } else {
      console.log('🤔 Gemini 模式: 对话式AI助手');
    }
    console.log();
  }

  async sendToAI(userInput) {
    if (this.currentProvider === 'claude') {
      await this.sendToClaude(userInput);
    } else {
      await this.sendToGemini(userInput);
    }
  }

  async sendToClaude(userInput) {
    try {
      console.log('\n🤖 Claude Code 正在处理...\n');

      // 配置选项：使用持续会话
      const options = {
        maxTurns: 50, // 增加轮次限制
      };

      // 如果有现有会话ID，使用resume继续对话
      if (this.claudeSessionId) {
        options.resume = this.claudeSessionId;
        console.log('🔄 继续现有会话\n');
      } else {
        console.log('🔄 创建新的 Claude Code 会话\n');
      }

      // 使用Claude Code SDK查询
      const abortController = new AbortController();
      let sessionStarted = false;

      for await (const message of query({
        prompt: userInput,
        abortController,
        options,
      })) {
        // 保存会话ID用于后续对话
        if (message.session_id && !sessionStarted) {
          this.claudeSessionId = message.session_id;
          sessionStarted = true;
        }

        // 处理不同类型的消息
        if (message.type === 'assistant') {
          // 处理助手消息
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text') {
                process.stdout.write(block.text);
              } else if (block.type === 'tool_use') {
                console.log(`\n🔧 使用工具: ${block.name}`);
                if (block.input) {
                  console.log(`参数: ${JSON.stringify(block.input, null, 2)}`);
                }
              }
            }
          }
        } else if (message.type === 'system' && message.subtype === 'init') {
          console.log(`🤖 已连接 Claude Code (${message.model})`);
        } else if (message.type === 'result') {
          if (message.subtype === 'success') {
            console.log(`\n✅ 完成 (${message.num_turns} 轮对话, ${message.duration_ms}ms)`);
          } else {
            console.log(`\n❌ 错误: ${message.subtype}`);
            // 如果错误，重置会话
            if (message.subtype === 'error_max_turns') {
              this.claudeSessionId = null;
            }
          }
        }
      }

      console.log('\n' + '─'.repeat(50) + '\n');

    } catch (error) {
      console.error('❌ 错误:', error.message);

      // 如果会话出错，重置会话ID
      if (error.message.includes('session') || error.message.includes('context') || error.message.includes('resume')) {
        console.log('🔄 会话已重置，请重新开始对话');
        this.claudeSessionId = null;
      }

      if (error.message.includes('API key')) {
        console.log('\n💡 请设置 ANTHROPIC_API_KEY 环境变量:');
        console.log('export ANTHROPIC_API_KEY=your_api_key_here\n');
      }
    }

    this.promptUser();
  }

  async sendToGemini(userInput) {
    try {
      console.log('\n🤔 Gemini 正在思考...\n');

      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      // 构建对话历史
      const history = this.conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = model.startChat({ history });

      const result = await chat.sendMessageStream(userInput);

      let assistantResponse = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        process.stdout.write(chunkText);
        assistantResponse += chunkText;
      }

      this.conversationHistory.push(
        { role: 'user', content: userInput },
        { role: 'assistant', content: assistantResponse }
      );

      console.log('\n' + '─'.repeat(50) + '\n');

    } catch (error) {
      console.error('❌ 错误:', error.message);

      if (error.message.includes('API key') || error.message.includes('API_KEY')) {
        console.log('\n💡 请设置 GEMINI_API_KEY 环境变量:');
        console.log('export GEMINI_API_KEY=your_api_key_here\n');
      }
    }

    this.promptUser();
  }
}

const simulator = new AICodeSimulator();
simulator.start();

export default AICodeSimulator;