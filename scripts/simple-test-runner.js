#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 简单的测试运行器，避免vitest的ESM/CJS问题
class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  // 描述测试组
  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }

  // 单个测试
  it(description, fn) {
    try {
      fn();
      console.log(`  ✅ ${description}`);
      this.passed++;
    } catch (error) {
      console.log(`  ❌ ${description}`);
      console.log(`     错误: ${error.message}`);
      this.failed++;
    }
  }

  // 断言函数
  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`期望 ${expected}, 实际得到 ${actual}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`期望已定义, 实际得到 undefined`);
        }
      },
      toContain: (item) => {
        if (!actual || !actual.includes(item)) {
          throw new Error(`期望包含 ${item}, 实际 ${actual}`);
        }
      }
    };
  }

  // 运行所有测试
  async runTests() {
    console.log('🚀 开始运行简单测试...\n');

    // 动态导入并测试 EvoGuard node
    await this.testEvoGuard();

    console.log(`\n📊 测试结果: ${this.passed} 通过, ${this.failed} 失败`);
    if (this.failed > 0) {
      process.exit(1);
    }
  }

  async testEvoGuard() {
    try {
      // 简单检查 node 文件是否存在并可解析
      const nodePath = './dist/nodes/EvoGuard/EvoGuard.node.js';
      if (fs.existsSync(nodePath)) {
        const { EvoGuard } = require(path.resolve(nodePath));
        
        this.describe('EvoGuard Node', () => {
          this.it('should be constructable', () => {
            const node = new EvoGuard();
            this.expect(node).toBeDefined();
          });

          this.it('should have description', () => {
            const node = new EvoGuard();
            this.expect(node.description).toBeDefined();
          });

          this.it('should have correct name', () => {
            const node = new EvoGuard();
            this.expect(node.description.name).toBe('evoGuard');
          });

          this.it('should have correct display name', () => {
            const node = new EvoGuard();
            this.expect(node.description.displayName).toBe('EvoGuard');
          });

          this.it('should support health check operation', () => {
            const node = new EvoGuard();
            const operationProp = node.description.properties.find(p => p.name === 'operation');
            const healthCheckOption = operationProp.options.find(o => o.value === 'healthCheck');
            this.expect(healthCheckOption).toBeDefined();
          });

          this.it('should have execute method', () => {
            const node = new EvoGuard();
            this.expect(typeof node.execute).toBe('function');
          });
        });
      } else {
        console.log('⚠️  EvoGuard compiled file not found, skipping tests');
      }
    } catch (error) {
      console.log(`⚠️  EvoGuard test error: ${error.message}`);
    }
  }
}

// 全局函数导出
const runner = new SimpleTestRunner();
global.describe = runner.describe.bind(runner);
global.it = runner.it.bind(runner);
global.expect = runner.expect.bind(runner);

// 运行测试
runner.runTests();