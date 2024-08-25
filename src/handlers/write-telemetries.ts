import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient();

const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
    const siteId = event.pathParameters?.siteId;
    if (!siteId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'siteId is required' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON in request body' })
        };
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
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data stored successfully' })
        };
    } catch (error) {
        console.error(`Error storing data for siteId: ${siteId}`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error storing data' })
        };
    }
};
