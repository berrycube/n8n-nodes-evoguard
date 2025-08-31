import { describe, it, expect, vi } from 'vitest';
import { EvoGuard } from './EvoGuard.node';

describe('EvoGuard Node', () => {
  describe('基本配置', () => {
    it('should have correct node type name', () => {
      const node = new EvoGuard();
      expect(node.description.name).toBe('evoGuard');
    });

    it('should have correct display name', () => {
      const node = new EvoGuard();
      expect(node.description.displayName).toBe('EvoGuard');
    });

    it('should be categorized as trigger', () => {
      const node = new EvoGuard();
      expect(node.description.group).toContain('trigger');
    });

    it('should have correct version', () => {
      const node = new EvoGuard();
      expect(node.description.version).toBe(1);
    });
  });

  describe('节点属性', () => {
    it('should have operation parameter', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const operationProp = properties.find((p: any) => p.name === 'operation');
      
      expect(operationProp).toBeDefined();
      expect(operationProp?.type).toBe('options');
      expect(operationProp?.default).toBe('healthCheck');
    });

    it('should have baseUrl parameter', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const baseUrlProp = properties.find((p: any) => p.name === 'baseUrl');
      
      expect(baseUrlProp).toBeDefined();
      expect(baseUrlProp?.type).toBe('string');
      expect(baseUrlProp?.required).toBe(true);
      expect(baseUrlProp?.default).toBe('http://localhost:8080');
    });

    it('should have apiKey parameter with password type', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const apiKeyProp = properties.find((p: any) => p.name === 'apiKey');
      
      expect(apiKeyProp).toBeDefined();
      expect(apiKeyProp?.type).toBe('string');
      expect(apiKeyProp?.required).toBe(true);
      expect(apiKeyProp?.typeOptions?.password).toBe(true);
    });

    it('should have instanceName parameter for specific operations', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const instanceNameProp = properties.find((p: any) => p.name === 'instanceName');
      
      expect(instanceNameProp).toBeDefined();
      expect(instanceNameProp?.type).toBe('string');
      expect(instanceNameProp?.displayOptions?.show?.operation).toEqual(['instanceStatus', 'qrStatus']);
    });

    it('should have webhookUrl parameter for webhook monitoring', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const webhookUrlProp = properties.find((p: any) => p.name === 'webhookUrl');
      
      expect(webhookUrlProp).toBeDefined();
      expect(webhookUrlProp?.type).toBe('string');
      expect(webhookUrlProp?.displayOptions?.show?.operation).toEqual(['monitorWebhooks']);
    });

    it('should have timeout parameter with default value', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const timeoutProp = properties.find((p: any) => p.name === 'timeout');
      
      expect(timeoutProp).toBeDefined();
      expect(timeoutProp?.type).toBe('number');
      expect(timeoutProp?.default).toBe(30);
    });

    it('should have includeDetails parameter', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const includeDetailsProp = properties.find((p: any) => p.name === 'includeDetails');
      
      expect(includeDetailsProp).toBeDefined();
      expect(includeDetailsProp?.type).toBe('boolean');
      expect(includeDetailsProp?.default).toBe(true);
    });
  });

  describe('操作选项', () => {
    it('should support health check operation', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const operationProp = properties.find((p: any) => p.name === 'operation');
      const healthCheckOption = operationProp?.options.find((o: any) => o.value === 'healthCheck');
      
      expect(healthCheckOption).toBeDefined();
      expect(healthCheckOption?.name).toBe('Health Check');
      expect(healthCheckOption?.description).toBe('Check Evolution API server health');
    });

    it('should support instance status operation', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const operationProp = properties.find((p: any) => p.name === 'operation');
      const instanceStatusOption = operationProp?.options.find((o: any) => o.value === 'instanceStatus');
      
      expect(instanceStatusOption).toBeDefined();
      expect(instanceStatusOption?.name).toBe('Instance Status');
      expect(instanceStatusOption?.description).toBe('Get status of WhatsApp instances');
    });

    it('should support webhook monitoring operation', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const operationProp = properties.find((p: any) => p.name === 'operation');
      const monitorWebhooksOption = operationProp?.options.find((o: any) => o.value === 'monitorWebhooks');
      
      expect(monitorWebhooksOption).toBeDefined();
      expect(monitorWebhooksOption?.name).toBe('Monitor Webhooks');
      expect(monitorWebhooksOption?.description).toBe('Check webhook connectivity');
    });

    it('should support QR status operation', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const operationProp = properties.find((p: any) => p.name === 'operation');
      const qrStatusOption = operationProp?.options.find((o: any) => o.value === 'qrStatus');
      
      expect(qrStatusOption).toBeDefined();
      expect(qrStatusOption?.name).toBe('QR Code Status');
      expect(qrStatusOption?.description).toBe('Check QR code generation status');
    });
  });

  describe('执行功能', () => {
    it('should implement execute method', () => {
      const node = new EvoGuard();
      expect(typeof node.execute).toBe('function');
    });

    it('should have private helper methods', () => {
      const node = new EvoGuard();
      // TypeScript private methods can't be directly tested, but we can check the class has them
      expect(node).toBeDefined();
      
      // We can test that the methods exist by checking the prototype
      const proto = Object.getPrototypeOf(node);
      const methods = Object.getOwnPropertyNames(proto);
      
      expect(methods).toContain('execute');
      // Private methods are not enumerable, but we can verify core functionality through execute
    });
  });

  describe('Evolution API功能', () => {
    it('should handle health check data structure', () => {
      const node = new EvoGuard();
      
      // Test that the node is structured to handle Evolution API responses
      const properties = node.description.properties;
      const operationProp = properties.find((p: any) => p.name === 'operation');
      
      expect(operationProp?.options.length).toBe(4);
      expect(operationProp?.options.map((o: any) => o.value)).toEqual([
        'healthCheck',
        'instanceStatus', 
        'monitorWebhooks',
        'qrStatus'
      ]);
    });

    it('should have appropriate timeout configuration', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const timeoutProp = properties.find((p: any) => p.name === 'timeout');
      
      // 30 seconds is appropriate for API diagnostics
      expect(timeoutProp?.default).toBe(30);
      expect(timeoutProp?.type).toBe('number');
    });

    it('should support detailed response option', () => {
      const node = new EvoGuard();
      const properties = node.description.properties;
      const includeDetailsProp = properties.find((p: any) => p.name === 'includeDetails');
      
      expect(includeDetailsProp?.default).toBe(true);
      expect(includeDetailsProp?.description).toBe('Include detailed response information');
    });
  });
});