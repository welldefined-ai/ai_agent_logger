#!/usr/bin/env node

const readline = require('readline');
const { query } = require('@anthropic-ai/claude-code');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AICodeSimulator {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.conversationHistory = [];
    this.currentProvider = 'claude'; // Default to Claude
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

      // 使用Claude Code SDK的完整体验
      const abortController = new AbortController();
      const messages = [];

      for await (const message of query({
        prompt: userInput,
        abortController,
        options: {
          maxTurns: 3,
        },
      })) {
        messages.push(message);

        // 实时输出Claude Code的响应
        if (message.type === 'text') {
          process.stdout.write(message.text);
        } else if (message.type === 'tool_use') {
          console.log(`\n🔧 使用工具: ${message.name}`);
          if (message.input) {
            console.log(`参数: ${JSON.stringify(message.input, null, 2)}`);
          }
        } else if (message.type === 'tool_result') {
          console.log(`✅ 工具结果: ${message.content?.substring(0, 200)}${message.content?.length > 200 ? '...' : ''}`);
        }
      }

      console.log('\n' + '─'.repeat(50) + '\n');

    } catch (error) {
      console.error('❌ 错误:', error.message);

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

if (require.main === module) {
  const simulator = new AICodeSimulator();
  simulator.start();
}

module.exports = AICodeSimulator;