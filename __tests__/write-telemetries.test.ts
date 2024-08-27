import { SQSEvent, SQSRecord } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from '../src/handlers/write-telemetries';

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: jest.fn(),
    })),
  },
  PutCommand: jest.fn()
}));

describe('SQS Handler', () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    process.env.TABLE_NAME = 'TestTable';
    mockSend = jest.fn().mockResolvedValue({});

    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: mockSend,
    });

    console.info = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.TABLE_NAME;
  });

  const createSQSEvent = (bodies: any[]): SQSEvent => ({
    Records: bodies.map(body => ({
      body: JSON.stringify(body),
      messageId: '123',
      receiptHandle: '123',
      attributes: {},
      messageAttributes: {},
      md5OfBody: '123',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs',
      awsRegion: 'us-east-1'
    } as SQSRecord))
  });

  it('should process SQS event and store data in DynamoDB', async () => {
    const event = createSQSEvent([
      { siteId: 'site1', body: { temperature: 25, humidity: 60 } },
      { siteId: 'site2', body: { temperature: 30, humidity: 55 } }
    ]);

    await handler(event, undefined as any, undefined as any);

    expect(PutCommand).toHaveBeenCalledWith({
      TableName: 'TestTable',
      Item: { siteId: 'site2', temperature: 30, humidity: 55 }
    });
    expect(console.info).toHaveBeenCalledWith('Successfully stored data in dynamodb for siteId: site1');
    expect(console.info).toHaveBeenCalledWith('Successfully stored data in dynamodb for siteId: site2');
  });


  it('should log an error and not call DynamoDB when siteId is missing', async () => {
    const createSQSEvent = (bodies: any[]): SQSEvent => ({
      Records: bodies.map(body => ({
        body: JSON.stringify(body),
        messageId: '123',
        receiptHandle: '123',
        attributes: {},
        messageAttributes: {},
        md5OfBody: '123',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs',
        awsRegion: 'us-east-1'
      } as SQSRecord))
    });

    // Event with missing siteId
    const event = createSQSEvent([
      { body: { temperature: 25, humidity: 60 } }
    ]);

    await handler(event, undefined as any, undefined as any);

    // Since the siteId is missing, the DynamoDB client should not be called
    expect(mockSend).not.toHaveBeenCalled();

    expect(console.error).toHaveBeenCalledWith('siteId is required');
  });
});
