#!/usr/bin/env python3
import json
import boto3
import os
import re

s3 = boto3.client('s3')

SAMPLE_DATA = os.getenv('SAMPLE_DATA')
BUCKET_NAME = os.getenv('BUCKET_NAME')


def handler(event, context):
    name, occupation, location = None, None, None
    if event['body'] is not None:
        body = json.loads(event['body'])
        name = body.get('name', None)
        occupation = body.get('occupation', None)
        location = body.get('location', None)

    query = queryBuilder(name, occupation, location)
    print(query)
    resp = s3.select_object_content(
        Bucket=BUCKET_NAME,
        Key=SAMPLE_DATA,
        ExpressionType='SQL',
        Expression=query,
        InputSerialization={
            'CSV': {
                "FileHeaderInfo": "Use",
                "RecordDelimiter": "\r\n",
                "FieldDelimiter": ",",
            },
            'CompressionType': 'NONE'
        },
        OutputSerialization={
            'CSV': {
                "RecordDelimiter": "\n",
                "FieldDelimiter": ",",
            }
        },
    )

    records = ''
    for event in resp['Payload']:
        if 'Records' in event:
            records += event['Records']['Payload'].decode('utf-8')
        elif 'Stats' in event:
            statsDetails = event['Stats']['Details']
            print("Stats details bytesScanned: ")
            print(statsDetails['BytesScanned'])
            print("Stats details bytesProcessed: ")
            print(statsDetails['BytesProcessed'])
            print("Stats details bytesReturned: ")
            print(statsDetails['BytesReturned'])

        response = {
            "statusCode": 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            "body": json.dumps(records.split("\n")),
            "isBase64Encoded": False
        }
        return response


def queryBuilder(name, occupation, location):
    conditions = []
    if name:
        conditions.append(f"WHERE s.Name like '%{sanitize(name)}%'")
    if occupation:
        conditions.append(f"WHERE s.Occupation like '%{sanitize(occupation)}%'")
    if location:
        conditions.append(f"WHERE s.City like '%{sanitize(location)}%'")
    return "SELECT * FROM s3object s " + " AND ".join(conditions)


def sanitize(str):
    return re.sub(r'[^a-zA-Z0-9 ]','', str)