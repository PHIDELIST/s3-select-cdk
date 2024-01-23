// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3, SelectObjectContentCommandInput } from "@aws-sdk/client-s3";

const s3client = new S3({ region: process.env.REGION });
const BUCKET_NAME = process.env.BUCKET_NAME;
const SAMPLE_DATA = process.env.SAMPLE_DATA;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let name,
    location,
    occupation = undefined;
  if (event.body) ({ name, location, occupation } = JSON.parse(event.body));
  console.log(queryBuilder(name, location, occupation));
  const params: SelectObjectContentCommandInput = {
    Bucket: BUCKET_NAME,
    Key: SAMPLE_DATA,
    ExpressionType: "SQL",
    Expression: queryBuilder(name, location, occupation),
    InputSerialization: {
      CSV: {
        FileHeaderInfo: "USE",
        RecordDelimiter: "\r\n",
        FieldDelimiter: ",",
      },
    },
    OutputSerialization: {
      CSV: {
        RecordDelimiter: "\n",
        FieldDelimiter: ",",
      },
    },
  };

  try {
    const resp = await s3client.selectObjectContent(params);
    if (resp.Payload === undefined) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify("Error: no payload in response"),
      };
    }
    let records = "";
    for await (const event of resp.Payload) {
      if (event.Records && event.Records.Payload) {
        records += Buffer.from(event.Records.Payload).toString("utf-8");
      }
    }
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(records.split("\n")),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(error),
    };
  }
};

const queryBuilder = (
  name: string | undefined,
  location: string | undefined,
  occupation: string | undefined
): string => {
  const query = `SELECT * FROM S3Object s `;
  let conditions = [];
  if (name) {
    conditions.push(`WHERE s.name like '%${sanitize(name)}%'`);
  }
  if (occupation) {
    conditions.push(`WHERE s.Occupation like '%${sanitize(occupation)}%'`);
  }
  if (location) {
    conditions.push(`WHERE s.City like '%${sanitize(location)}%'`);
  }
  return query + conditions.join(" AND ");
};

const sanitize = (str: string) => str.replace(/[^a-z0-9 ]/gi, "");
