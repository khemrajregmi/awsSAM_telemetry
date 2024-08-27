import { SQSEvent, SQSHandler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: SQSHandler = async (event: SQSEvent, context?, callback?) => {
    for (const record of event.Records) {
        const message = JSON.parse(record.body);
        const siteId = message.siteId;
        const body = message.body;

        if (!siteId) {
            console.error('siteId is required');
            continue;
        }

        const params = {
            TableName: process.env.TABLE_NAME!,
            Item: {
                siteId: siteId,
                ...body
            }
        };

        try {
            await docClient.send(new PutCommand(params));
            console.info(`Successfully stored data in dynamodb for siteId: ${siteId}`);
        } catch (error) {
            console.error(`Error storing data for siteId: ${siteId}`, error);
        }
    }
};
