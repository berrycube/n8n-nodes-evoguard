import { vi } from 'vitest';

// Mock n8n-workflow types and interfaces for testing
vi.mock('n8n-workflow', () => ({
  NodeConnectionType: {
    Main: 'main',
    AiAgent: 'ai_agent',
  },
  NodeOperationError: class NodeOperationError extends Error {
    constructor(node: any, error: Error | string, options: any = {}) {
      super(typeof error === 'string' ? error : error.message);
      this.name = 'NodeOperationError';
    }
  },
  // Mock interfaces that are imported but used as types
  IExecuteFunctions: class {},
  INodeExecutionData: class {},
  INodeType: class {},
  INodeTypeDescription: class {},
  IHttpRequestMethods: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
  },
  sleep: vi.fn().mockResolvedValue(undefined),
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console logs during tests unless explicitly needed
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};