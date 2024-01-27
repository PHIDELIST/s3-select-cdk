# S3 Select CDK
## [Amazon S3 Select supports only the SELECT SQL command](https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html). 
**The following ANSI standard clauses are supported for SELECT:**
+ SELECT list
+ FROM clause
+ WHERE clause
+ LIMIT clause
## Useful CDK commands
* `cdk deploy --context language=python`
* `cdk deploy --context language=typescript`
* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
## Architecture
![s3-select-1](https://github.com/PHIDELIST/s3-select-cdk/assets/64526896/140fec0a-a757-4b35-9bf9-eb30d59bc0c0)

## Getting a single record
![image](https://github.com/PHIDELIST/s3-select-cdk/assets/64526896/a1aeae9d-8b2c-48ed-8497-116c85c89d42)
## Getting All records
![image](https://github.com/PHIDELIST/s3-select-cdk/assets/64526896/77f61547-e9d7-4e34-aba3-029f01ad469f)

