import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHttpRequestMethods,
  NodeOperationError,
} from 'n8n-workflow';

export class EvoGuard implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'EvoGuard',
    name: 'evoGuard',
    group: ['trigger'],
    version: 1,
    description: 'Evolution API diagnostics and monitoring helper',
    defaults: {
      name: 'EvoGuard',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: false,
        options: [
          {
            name: 'Health Check',
            value: 'healthCheck',
            description: 'Check Evolution API server health',
          },
          {
            name: 'Instance Status',
            value: 'instanceStatus', 
            description: 'Get status of WhatsApp instances',
          },
          {
            name: 'Monitor Webhooks',
            value: 'monitorWebhooks',
            description: 'Check webhook connectivity',
          },
          {
            name: 'QR Code Status',
            value: 'qrStatus',
            description: 'Check QR code generation status',
          },
        ],
        default: 'healthCheck',
        description: 'The diagnostic operation to perform',
      },
      {
        displayName: 'Evolution API Base URL',
        name: 'baseUrl',
        type: 'string',
        default: 'http://localhost:8080',
        required: true,
        description: 'Evolution API server base URL',
      },
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        typeOptions: {
          password: true,
        },
        default: '',
        required: true,
        description: 'Evolution API authentication key',
      },
      {
        displayName: 'Instance Name',
        name: 'instanceName',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['instanceStatus', 'qrStatus'],
          },
        },
        description: 'WhatsApp instance name to check',
      },
      {
        displayName: 'Webhook URL',
        name: 'webhookUrl',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['monitorWebhooks'],
          },
        },
        description: 'Webhook URL to test connectivity',
      },
      {
        displayName: 'Timeout (seconds)',
        name: 'timeout',
        type: 'number',
        default: 30,
        description: 'Request timeout in seconds',
      },
      {
        displayName: 'Include Details',
        name: 'includeDetails',
        type: 'boolean',
        default: true,
        description: 'Include detailed response information',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string;
      const baseUrl = this.getNodeParameter('baseUrl', i) as string;
      const apiKey = this.getNodeParameter('apiKey', i) as string;
      const timeout = this.getNodeParameter('timeout', i) as number;
      const includeDetails = this.getNodeParameter('includeDetails', i) as boolean;

      try {
        let result: any = {};
        
        switch (operation) {
          case 'healthCheck':
            try {
              const options = {
                method: 'GET' as IHttpRequestMethods,
                url: `${baseUrl}/manager/info`,
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                timeout: timeout * 1000,
                json: true,
              };

              const response = await this.helpers.request(options);
              
              result = {
                health: {
                  status: response ? 'online' : 'offline',
                  instances: response.instances || [],
                  uptime: response.uptime || 0,
                  version: response.version,
                  memory: response.memory,
                },
                serverInfo: includeDetails ? response : undefined,
                recommendations: response 
                  ? (response.instances && response.instances.length === 0 
                    ? ['No WhatsApp instances found', 'Consider creating instances for WhatsApp connections']
                    : ['Evolution API server health looks good'])
                  : ['Evolution API server appears to be offline', 'Check server logs and restart if necessary'],
              };
            } catch (error) {
              result = {
                health: { 
                  status: 'error',
                  instances: [],
                  uptime: 0,
                },
                error: error instanceof Error ? error.message : 'Health check failed',
                recommendations: [
                  'Check if Evolution API server is running',
                  'Verify API key is correct', 
                  'Ensure network connectivity'
                ],
              };
            }
            break;
            
          case 'instanceStatus':
            const instanceName = this.getNodeParameter('instanceName', i) as string;
            try {
              const options = {
                method: 'GET' as IHttpRequestMethods,
                url: `${baseUrl}/instance/connectionState/${instanceName}`,
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                timeout: timeout * 1000,
                json: true,
              };

              const response = await this.helpers.request(options);
              
              result = {
                instanceName,
                connectionState: response.instance?.connectionStatus || 'unknown',
                isConnected: response.instance?.connectionStatus === 'open',
                details: includeDetails ? response : undefined,
                recommendations: response.instance?.connectionStatus === 'open'
                  ? ['Instance is connected and ready']
                  : response.instance?.connectionStatus === 'close'
                  ? ['Instance is disconnected', 'Generate new QR code to reconnect']
                  : response.instance?.connectionStatus === 'connecting'
                  ? ['Instance is connecting', 'Wait for connection to complete']
                  : ['Instance status is unknown', 'Check instance configuration'],
              };
            } catch (error) {
              result = {
                instanceName,
                connectionState: 'error',
                isConnected: false,
                error: error instanceof Error ? error.message : 'Instance check failed',
                recommendations: ['Check if instance exists', 'Verify instance name is correct'],
              };
            }
            break;
            
          case 'monitorWebhooks':
            const webhookUrl = this.getNodeParameter('webhookUrl', i) as string;
            try {
              const testPayload = {
                event: 'evoguard.test',
                data: {
                  timestamp: new Date().toISOString(),
                  test: true,
                },
              };

              const options = {
                method: 'POST' as IHttpRequestMethods,
                url: webhookUrl,
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'EvoGuard/1.0',
                },
                body: testPayload,
                timeout: timeout * 1000,
                json: true,
              };

              const response = await this.helpers.request(options);
              
              result = {
                webhookUrl,
                isReachable: true,
                responseTime: new Date().toISOString(),
                statusCode: response.statusCode || 200,
                response: includeDetails ? response : undefined,
                recommendations: ['Webhook is responding normally'],
              };
            } catch (error) {
              result = {
                webhookUrl,
                isReachable: false,
                error: error instanceof Error ? error.message : 'Webhook test failed',
                recommendations: [
                  'Check if webhook URL is accessible',
                  'Verify webhook endpoint is running',
                  'Check firewall and network settings',
                ],
              };
            }
            break;
            
          case 'qrStatus':
            const qrInstanceName = this.getNodeParameter('instanceName', i) as string;
            try {
              const options = {
                method: 'GET' as IHttpRequestMethods,
                url: `${baseUrl}/instance/qrcode/${qrInstanceName}`,
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                timeout: timeout * 1000,
                json: true,
              };

              const response = await this.helpers.request(options);
              
              result = {
                instanceName: qrInstanceName,
                qrCodeAvailable: !!response.qrcode,
                qrCode: includeDetails ? response.qrcode : undefined,
                pairingCode: includeDetails ? response.pairingCode : undefined,
                recommendations: response.qrcode 
                  ? ['QR code is available for scanning']
                  : ['QR code not available - check if instance needs pairing'],
              };
            } catch (error) {
              result = {
                instanceName: qrInstanceName,
                qrCodeAvailable: false,
                error: error instanceof Error ? error.message : 'QR code check failed',
                recommendations: [
                  'Check if instance exists and is in correct state',
                  'Verify instance is not already connected',
                ],
              };
            }
            break;
            
          default:
            throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
        }

        returnData.push({
          json: {
            operation,
            timestamp: new Date().toISOString(),
            success: !result.error,
            ...result,
          },
        });
        
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              operation,
              timestamp: new Date().toISOString(),
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              item: i,
            },
          });
        } else {
          throw new NodeOperationError(
            this.getNode(),
            error instanceof Error ? error : new Error('Unknown error'),
            { itemIndex: i }
          );
        }
      }
    }

    return [returnData];
  }

}