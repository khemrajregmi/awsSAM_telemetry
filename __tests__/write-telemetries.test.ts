import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from '../src/handlers/write-telemetries';

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn()
}));

jest.mock("@aws-sdk/lib-dynamodb", () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: jest.fn(),
      })),
    },
    PutCommand: jest.fn()
  };
});

describe('API Gateway Handler', () => {
  let mockSend: jest.Mock;
  let mockContext: Context;
  const mockDate = new Date('2023-01-01T00:00:00Z');

  beforeEach(() => {
    process.env.TABLE_NAME = 'TestTable';
    mockSend = jest.fn().mockResolvedValue({});
    
    // Update the mock implementation for each test
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: mockSend,
    });
    
    console.log = jest.fn();
    console.error = jest.fn();

    mockContext = {} as Context;

    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    delete process.env.TABLE_NAME;
  });

  it('should process API Gateway event and store data in DynamoDB', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { siteId: 'testSite' },
      body: JSON.stringify({ temperature: 25, humidity: 60 })
    };
  
    const response = await handler(event as APIGatewayProxyEvent, mockContext, () => {});
    expect(response).toEqual({
      statusCode: 200,
      body: '{"message":"Data stored successfully"}'
    });
  });

  it('should return 400 if siteId is missing', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: {},
      body: JSON.stringify({ temperature: 25, humidity: 60 })
    };

    const response = await handler(event as APIGatewayProxyEvent, mockContext, () => {});

    expect(response).toEqual({
      statusCode: 400,
      body: JSON.stringify({ message: 'siteId is required' })
    });
  });

  it('should return 400 if body is invalid JSON', async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      pathParameters: { siteId: 'testSite' },
      body: 'invalid JSON'
    };

    const response = await handler(event as APIGatewayProxyEvent, mockContext, () => {});

    expect(response).toEqual({
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON in request body' })
    });
  });
});