import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvoGuard } from './EvoGuard.node';

// Mock the n8n-workflow module
vi.mock('n8n-workflow', () => ({
  NodeOperationError: class extends Error {
    constructor(node: any, error: Error | string, options?: any) {
      const message = typeof error === 'string' ? error : error.message;
      super(message);
      this.name = 'NodeOperationError';
    }
  }
}));

describe('EvoGuard Node - Business Logic Tests', () => {
  let evoGuard: EvoGuard;
  let mockExecuteFunctions: any;

  beforeEach(() => {
    evoGuard = new EvoGuard();
    mockExecuteFunctions = {
      getInputData: vi.fn(() => [{ json: { test: 'data' } }]),
      getNodeParameter: vi.fn(),
      getNode: vi.fn(() => ({ name: 'Test EvoGuard Node' })),
      continueOnFail: vi.fn(() => false),
      helpers: {
        request: vi.fn()
      }
    };
  });

  describe('Health Check Operation', () => {
    it('should handle successful health check response', async () => {
      const mockResponse = {
        instances: [{ name: 'test-instance', status: 'open' }],
        uptime: 12345,
        version: '1.5.0',
        memory: { used: '100MB', total: '512MB' }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('healthCheck') // operation
        .mockReturnValueOnce('http://localhost:8080') // baseUrl
        .mockReturnValueOnce('test-api-key') // apiKey
        .mockReturnValueOnce(30) // timeout
        .mockReturnValueOnce(true); // includeDetails

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.success).toBe(true);
      expect(result[0][0].json.health.status).toBe('online');
      expect(result[0][0].json.health.instances).toEqual(mockResponse.instances);
      expect(result[0][0].json.recommendations).toContain('Evolution API server health looks good');
      expect(result[0][0].json.serverInfo).toEqual(mockResponse);
    });

    it('should handle health check API failure', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('healthCheck')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('invalid-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(false);

      mockExecuteFunctions.helpers.request.mockRejectedValue(new Error('API request failed'));

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.success).toBe(false);
      expect(result[0][0].json.health.status).toBe('error');
      expect(result[0][0].json.error).toBe('API request failed');
      expect(result[0][0].json.recommendations).toContain('Check if Evolution API server is running');
    });

    it('should provide no-instances recommendations when server is empty', async () => {
      const emptyResponse = { instances: [], uptime: 0 };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('healthCheck')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true);

      mockExecuteFunctions.helpers.request.mockResolvedValue(emptyResponse);

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.health.status).toBe('online');
      expect(result[0][0].json.recommendations).toContain('No WhatsApp instances found');
      expect(result[0][0].json.recommendations).toContain('Consider creating instances for WhatsApp connections');
    });
  });

  describe('Instance Status Operation', () => {
    it('should handle connected instance status', async () => {
      const mockResponse = {
        instance: {
          connectionStatus: 'open',
          name: 'test-instance'
        }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('instanceStatus')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('test-instance'); // instanceName

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.instanceName).toBe('test-instance');
      expect(result[0][0].json.connectionState).toBe('open');
      expect(result[0][0].json.isConnected).toBe(true);
      expect(result[0][0].json.recommendations).toContain('Instance is connected and ready');
    });

    it('should handle disconnected instance with appropriate recommendations', async () => {
      const mockResponse = {
        instance: {
          connectionStatus: 'close',
          name: 'test-instance'
        }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('instanceStatus')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('test-instance');

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.connectionState).toBe('close');
      expect(result[0][0].json.isConnected).toBe(false);
      expect(result[0][0].json.recommendations).toContain('Instance is disconnected');
      expect(result[0][0].json.recommendations).toContain('Generate new QR code to reconnect');
      expect(result[0][0].json.details).toBeUndefined(); // includeDetails = false
    });

    it('should handle connecting instance status', async () => {
      const mockResponse = {
        instance: {
          connectionStatus: 'connecting'
        }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('instanceStatus')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('connecting-instance');

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.connectionState).toBe('connecting');
      expect(result[0][0].json.recommendations).toContain('Instance is connecting');
      expect(result[0][0].json.recommendations).toContain('Wait for connection to complete');
    });

    it('should handle instance not found error', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('instanceStatus')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('nonexistent-instance');

      mockExecuteFunctions.helpers.request.mockRejectedValue(new Error('Instance not found'));

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.connectionState).toBe('error');
      expect(result[0][0].json.isConnected).toBe(false);
      expect(result[0][0].json.error).toBe('Instance not found');
      expect(result[0][0].json.recommendations).toContain('Check if instance exists');
    });
  });

  describe('Webhook Monitoring Operation', () => {
    it('should successfully test webhook connectivity', async () => {
      const mockResponse = { statusCode: 200, message: 'OK' };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('monitorWebhooks')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('https://webhook.test.com/endpoint'); // webhookUrl

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.webhookUrl).toBe('https://webhook.test.com/endpoint');
      expect(result[0][0].json.isReachable).toBe(true);
      expect(result[0][0].json.statusCode).toBe(200);
      expect(result[0][0].json.recommendations).toContain('Webhook is responding normally');

      // Verify the test payload was sent correctly
      const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0][0];
      expect(requestCall.method).toBe('POST');
      expect(requestCall.url).toBe('https://webhook.test.com/endpoint');
      expect(requestCall.headers['Content-Type']).toBe('application/json');
      expect(requestCall.headers['User-Agent']).toBe('EvoGuard/1.0');
      expect(requestCall.body.event).toBe('evoguard.test');
    });

    it('should handle webhook connection failure', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('monitorWebhooks')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('https://unreachable.webhook.com/endpoint');

      mockExecuteFunctions.helpers.request.mockRejectedValue(new Error('Connection timeout'));

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.isReachable).toBe(false);
      expect(result[0][0].json.error).toBe('Connection timeout');
      expect(result[0][0].json.recommendations).toContain('Check if webhook URL is accessible');
      expect(result[0][0].json.recommendations).toContain('Check firewall and network settings');
    });

    it('should respect timeout parameter in webhook test', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('monitorWebhooks')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(45) // Custom timeout
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('https://webhook.test.com/endpoint');

      mockExecuteFunctions.helpers.request.mockResolvedValue({ statusCode: 200 });

      await evoGuard.execute.call(mockExecuteFunctions);

      const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0][0];
      expect(requestCall.timeout).toBe(45000); // 45 seconds in milliseconds
    });
  });

  describe('QR Code Status Operation', () => {
    it('should handle available QR code', async () => {
      const mockResponse = {
        qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...',
        pairingCode: '123456'
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('qrStatus')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('pairing-instance'); // instanceName

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.instanceName).toBe('pairing-instance');
      expect(result[0][0].json.qrCodeAvailable).toBe(true);
      expect(result[0][0].json.qrCode).toBe(mockResponse.qrcode);
      expect(result[0][0].json.pairingCode).toBe(mockResponse.pairingCode);
      expect(result[0][0].json.recommendations).toContain('QR code is available for scanning');
    });

    it('should handle unavailable QR code', async () => {
      const mockResponse = {}; // No QR code

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('qrStatus')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(false) // Don't include details
        .mockReturnValueOnce('connected-instance');

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.qrCodeAvailable).toBe(false);
      expect(result[0][0].json.qrCode).toBeUndefined();
      expect(result[0][0].json.pairingCode).toBeUndefined();
      expect(result[0][0].json.recommendations).toContain('QR code not available - check if instance needs pairing');
    });

    it('should handle QR code request error', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('qrStatus')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('invalid-instance');

      mockExecuteFunctions.helpers.request.mockRejectedValue(new Error('Instance not in pairing state'));

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.qrCodeAvailable).toBe(false);
      expect(result[0][0].json.error).toBe('Instance not in pairing state');
      expect(result[0][0].json.recommendations).toContain('Check if instance exists and is in correct state');
      expect(result[0][0].json.recommendations).toContain('Verify instance is not already connected');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unknown operation', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('unknownOperation')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true);

      let thrownError;
      try {
        await evoGuard.execute.call(mockExecuteFunctions);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError.message).toBe('Unknown operation: unknownOperation');
      expect(thrownError.name).toBe('NodeOperationError');
    });

    it('should handle continueOnFail mode', async () => {
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('healthCheck')
        .mockReturnValueOnce('http://invalid-url')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true);

      mockExecuteFunctions.helpers.request.mockRejectedValue(new Error('Network error'));

      const result = await evoGuard.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.success).toBe(false);
      expect(result[0][0].json.health.status).toBe('error');
    });

    it('should include timestamp in all responses', async () => {
      const beforeTime = new Date().toISOString();

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('healthCheck')
        .mockReturnValueOnce('http://localhost:8080')
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(true);

      mockExecuteFunctions.helpers.request.mockResolvedValue({ instances: [] });

      const result = await evoGuard.execute.call(mockExecuteFunctions);
      const afterTime = new Date().toISOString();

      expect(result[0][0].json.timestamp).toBeDefined();
      expect(result[0][0].json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result[0][0].json.timestamp >= beforeTime).toBe(true);
      expect(result[0][0].json.timestamp <= afterTime).toBe(true);
    });

    it('should properly structure API request headers', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('healthCheck')
        .mockReturnValueOnce('https://api.evoapi.com')
        .mockReturnValueOnce('secret-api-key')
        .mockReturnValueOnce(60)
        .mockReturnValueOnce(false);

      mockExecuteFunctions.helpers.request.mockResolvedValue({ instances: [] });

      await evoGuard.execute.call(mockExecuteFunctions);

      const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0][0];
      expect(requestCall.method).toBe('GET');
      expect(requestCall.url).toBe('https://api.evoapi.com/manager/info');
      expect(requestCall.headers['Authorization']).toBe('Bearer secret-api-key');
      expect(requestCall.headers['Content-Type']).toBe('application/json');
      expect(requestCall.timeout).toBe(60000);
      expect(requestCall.json).toBe(true);
    });
  });
});