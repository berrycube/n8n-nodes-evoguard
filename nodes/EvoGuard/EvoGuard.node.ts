import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
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
    inputs: [{ type: 'main' }],
    outputs: [{ type: 'main' }],
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
        description: 'Base URL of the Evolution API server',
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
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const baseUrl = this.getNodeParameter('baseUrl', i) as string;
        const apiKey = this.getNodeParameter('apiKey', i) as string;
        const timeout = this.getNodeParameter('timeout', i) as number;
        const includeDetails = this.getNodeParameter('includeDetails', i) as boolean;

        let result: any = {};

        switch (operation) {
          case 'healthCheck':
            try {
              const response = await this.helpers.request({
                method: 'GET',
                url: `${baseUrl}/manager/info`,
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                json: true,
                timeout: timeout * 1000,
              });

              const recommendations: string[] = [];
              if (response.instances && response.instances.length === 0) {
                recommendations.push('No WhatsApp instances found');
                recommendations.push('Consider creating instances for WhatsApp connections');
              } else {
                recommendations.push('Evolution API server health looks good');
              }

              result = {
                success: true,
                health: {
                  status: 'online',
                  instances: response.instances || [],
                },
                recommendations,
                serverInfo: includeDetails ? response : undefined,
              };
            } catch (error) {
              result = {
                success: false,
                health: {
                  status: 'error',
                },
                error: error instanceof Error ? error.message : 'Health check failed',
                recommendations: [
                  'Check if Evolution API server is running',
                  'Verify API key is correct',
                  'Check network connectivity',
                ],
              };
            }
            break;

          case 'instanceStatus':
            const instanceName = this.getNodeParameter('instanceName', i) as string;
            try {
              const response = await this.helpers.request({
                method: 'GET',
                url: `${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`,
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                json: true,
                timeout: timeout * 1000,
              });

              const connectionStatus = response.instance?.connectionStatus || 'unknown';
              const isConnected = connectionStatus === 'open';

              const recommendations: string[] = [];
              if (isConnected) {
                recommendations.push('Instance is connected and ready');
              } else if (connectionStatus === 'close') {
                recommendations.push('Instance is disconnected');
                recommendations.push('Generate new QR code to reconnect');
              } else if (connectionStatus === 'connecting') {
                recommendations.push('Instance is connecting');
                recommendations.push('Wait for connection to complete');
              } else {
                recommendations.push('Instance status is unknown');
                recommendations.push('Check instance configuration');
              }

              result = {
                instanceName,
                connectionState: connectionStatus,
                isConnected,
                recommendations,
                details: includeDetails ? response : undefined,
              };
            } catch (error) {
              result = {
                instanceName,
                connectionState: 'error',
                isConnected: false,
                error: error instanceof Error ? error.message : 'Instance check failed',
                recommendations: [
                  'Check if instance exists',
                  'Verify instance name is correct',
                ],
              };
            }
            break;

          case 'monitorWebhooks':
            const webhookUrl = this.getNodeParameter('webhookUrl', i) as string;
            try {
              const testPayload = {
                event: 'evoguard.test',
                timestamp: new Date().toISOString(),
                data: {
                  message: 'EvoGuard webhook connectivity test',
                  instance: 'test-instance'
                }
              };

              const response = await this.helpers.request({
                method: 'POST',
                url: webhookUrl,
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'EvoGuard/1.0',
                },
                body: testPayload,
                json: true,
                timeout: timeout * 1000,
              });

              result = {
                webhookUrl,
                isReachable: true,
                statusCode: response.statusCode || 200,
                recommendations: ['Webhook is responding normally'],
                response: includeDetails ? response : undefined,
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
              const response = await this.helpers.request({
                method: 'GET',
                url: `${baseUrl}/instance/connect/${qrInstanceName}`,
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                json: true,
                timeout: timeout * 1000,
              });

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