#!/usr/bin/env node

import readline from 'readline';
import { query } from '@anthropic-ai/claude-code';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 漂亮的加载动画类
class LoadingSpinner {
  constructor(text = 'Claude Code 正在处理') {
    this.text = text;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentFrame = 0;
    this.interval = null;
  }

  start() {
    process.stdout.write('\n');
    this.interval = setInterval(() => {
      process.stdout.write(`\r🤖 ${this.frames[this.currentFrame]} ${this.text}...`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // 清除加载行
    }
  }

  updateText(newText) {
    this.text = newText;
  }
}

// 权限确认处理类
class PermissionHandler {
  constructor(rl) {
    this.rl = rl;
  }

  async askPermission(toolName, action, details = '') {
    return new Promise((resolve) => {
      console.log(`\n🔐 权限请求:`);
      console.log(`   工具: ${toolName}`);
      console.log(`   操作: ${action}`);
      if (details) {
        console.log(`   详情: ${details}`);
      }
      
      this.rl.question('\n允许此操作吗? (y/n/always/never): ', (answer) => {
        const response = answer.toLowerCase().trim();
        
        if (response === 'y' || response === 'yes') {
          console.log('✅ 权限已授予');
          resolve('allow');
        } else if (response === 'always') {
          console.log('✅ 权限已永久授予');
          resolve('always');
        } else if (response === 'never') {
          console.log('❌ 权限已永久拒绝');
          resolve('never');
        } else {
          console.log('❌ 权限已拒绝');
          resolve('deny');
        }
      });
    });
  }
}

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
    this.permissionHandler = new PermissionHandler(this.rl);
    this.loadingSpinner = null;
    this.systemPrompt = `You are Claude Code, Anthropic's official CLI for Claude.
You are an interactive CLI tool that helps users with software engineering tasks.
You should be concise, direct, and to the point.
Your responses can use Github-flavored markdown for formatting.
Keep your responses short and focused on the specific task at hand.`;
  }

  async start() {
    console.log('╭──────────────────────────────────────────────────────╮');
    console.log('│  🤖 AI Code Assistant - Enhanced Claude Code CLI    │');
    console.log('│  支持 Claude Code SDK 和 Gemini 双引擎              │');
    console.log('╰──────────────────────────────────────────────────────╯');
    console.log();
    console.log(`🔮 当前模式: ${this.currentProvider.toUpperCase()}`);
    
    if (this.currentProvider === 'claude') {
      console.log('✨ Claude Code 特性:');
      console.log('   • 🔧 完整工具集成 (文件操作、代码分析、Shell命令)');
      console.log('   • 🔐 智能权限管理 (安全的文件系统访问)');
      console.log('   • 💬 持续对话会话 (上下文记忆)');
      console.log('   • ⚡ 实时加载动画');
    } else {
      console.log('🤔 Gemini 模式: 对话式AI助手');
    }
    
    console.log();
    console.log('💡 提示: 输入 "/help" 查看所有可用命令');
    console.log('📋 环境要求: 确保设置了 ANTHROPIC_API_KEY 和 GEMINI_API_KEY');
    console.log('─'.repeat(60));
    console.log();

    this.promptUser();
  }

  promptUser() {
    const prompt = this.currentProvider === 'claude' ? 
      '🤖 claude-code > ' : 
      '🤔 gemini > ';
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
      console.log('🤖 Claude Code 模式: 完整的编程助手体验');
      console.log('   ✨ 支持文件读写、代码分析、项目管理');
      console.log('   🔧 内置工具: Bash, Read, Write, Edit, Grep 等');
      console.log('   🔐 自动权限管理（工具使用时会提示确认）');
      console.log('   💬 持续对话会话（记住上下文）');
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
    // 启动加载动画
    this.loadingSpinner = new LoadingSpinner('Claude Code 正在处理');
    this.loadingSpinner.start();

    try {
      // 配置选项：使用持续会话和权限处理
      const options = {
        maxTurns: 50, // 增加轮次限制
        permissionMode: 'default', // 使用默认权限模式，会触发权限提示
        cwd: process.cwd(), // 设置工作目录
      };

      // 如果有现有会话ID，使用resume继续对话
      if (this.claudeSessionId) {
        options.resume = this.claudeSessionId;
        this.loadingSpinner.updateText('继续现有会话');
      } else {
        this.loadingSpinner.updateText('创建新的Claude Code会话');
      }

      // 使用Claude Code SDK查询
      const abortController = new AbortController();
      let sessionStarted = false;
      let isFirstMessage = true;
      let waitingForInput = false;

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
          // 停止加载动画并显示响应
          if (isFirstMessage) {
            this.loadingSpinner.stop();
            console.log('🤖 Claude Code:\n');
            isFirstMessage = false;
          }

          // 处理助手消息
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text') {
                process.stdout.write(block.text);
              } else if (block.type === 'tool_use') {
                // 显示工具使用信息
                await this.handleToolUse(block);
              }
            }
          }
        } else if (message.type === 'system' && message.subtype === 'init') {
          this.loadingSpinner.updateText(`已连接Claude Code (${message.model})`);
        } else if (message.type === 'user') {
          // 这些是Claude Code内部处理的用户消息（比如权限响应）
          // 通常我们不需要显示这些，因为它们是自动处理的
          if (message.parent_tool_use_id && !waitingForInput) {
            this.loadingSpinner.stop();
            console.log('\n🔐 Claude Code 正在请求权限...');
            waitingForInput = true;
            // 权限处理会通过Claude Code的内置机制自动处理
            this.loadingSpinner = new LoadingSpinner('等待权限确认');
            this.loadingSpinner.start();
          }
        } else if (message.type === 'result') {
          this.loadingSpinner.stop();
          waitingForInput = false;
          
          if (message.subtype === 'success') {
            console.log(`\n\n💫 完成 (${message.num_turns} 轮对话, ${message.duration_ms}ms, $${message.total_cost_usd.toFixed(4)})`);
          } else {
            console.log(`\n\n❌ 错误: ${message.subtype}`);
            // 如果错误，重置会话
            if (message.subtype === 'error_max_turns') {
              this.claudeSessionId = null;
            }
          }
        }
      }

      console.log('\n' + '─'.repeat(50) + '\n');

    } catch (error) {
      this.loadingSpinner?.stop();
      console.error('\n❌ 错误:', error.message);

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

  async handleToolUse(toolBlock) {
    console.log(`\n\n🔧 正在使用工具: ${toolBlock.name}`);
    
    // 显示工具参数（格式化显示）
    if (toolBlock.input && Object.keys(toolBlock.input).length > 0) {
      console.log('📋 参数:');
      for (const [key, value] of Object.entries(toolBlock.input)) {
        if (typeof value === 'string' && value.length > 100) {
          console.log(`   ${key}: ${value.substring(0, 100)}...`);
        } else {
          console.log(`   ${key}: ${JSON.stringify(value)}`);
        }
      }
    }
    console.log(); // 空行分隔
  }

  async handlePermissionRequest(message) {
    // 这里可以根据消息内容解析权限请求
    // 实际的权限处理会由Claude Code SDK内部处理
    // 这个方法预留用于未来扩展
    console.log('\n⚠️  等待权限确认...');
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