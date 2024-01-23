import {
  Stack,
  StackProps,
  aws_lambda as lambda,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
  aws_apigateway as apigateway,
  aws_lambda_nodejs as nodejslambda,
  aws_wafregional as wafregional,
  Fn,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class S3SelectCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "SampleData");

    new s3deploy.BucketDeployment(this, "Deploy Sample Data", {
      sources: [s3deploy.Source.asset("sample_data")],
      destinationBucket: bucket,
      retainOnDelete: false,
    });

    const language = this.node.tryGetContext('language') || 'typescript';
    const fn = language === "typescript" ? 
      new nodejslambda.NodejsFunction(this, "S3SelectHandler", {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "handler",
        entry: "./lambda/lambda-handler.ts",
        environment: {
          BUCKET_NAME: bucket.bucketName,
          SAMPLE_DATA: "sample_data.csv",
          REGION: Stack.of(this).region,
        },
      }) :
      new lambda.Function(this, "S3SelectHandler", {
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "lambda-handler.handler",
        code: lambda.Code.fromAsset("lambda"),
        environment: {
          BUCKET_NAME: bucket.bucketName,
          SAMPLE_DATA: "sample_data.csv",
          REGION: Stack.of(this).region
        }
      })

    bucket.grantRead(fn);

    const apigw = new apigateway.LambdaRestApi(this, "Endpoint", {
      handler: fn,
    });

    const SqlIDetection = new wafregional.CfnSqlInjectionMatchSet(
      this,
      "SQLI Detection",
      {
        name: "Find SQL Injections in message body",
        sqlInjectionMatchTuples: [
          {
            fieldToMatch: { type: "BODY" },
            textTransformation: "NONE",
          },
        ],
      }
    );
    const SqliRule = new wafregional.CfnRule(this, "SqlInjRule", {
      name: "SqlInjRule",
      metricName: "SqlInjRule",
      predicates: [
        {
          dataId: SqlIDetection.ref,
          negated: false,
          type: "SqlInjectionMatch",
        },
      ],
    });

    const S3SelectACL = new wafregional.CfnWebACL(this, "S3SelectACL", {
      name: "S3SelectACL",
      defaultAction: {
        type: "ALLOW",
      },
      metricName: "S3SelectACL",
      rules: [
        {
          priority: 3,
          ruleId: SqliRule.ref,
          action: {
            type: "BLOCK",
          },
        },
      ],
    });

    const AclAssociation = new wafregional.CfnWebACLAssociation(
      this,
      "ACL Association",
      {
        resourceArn: Fn.join("", [
          "arn:aws:apigateway:",
          Fn.sub("${AWS::Region}"),
          "::/restapis/",
          apigw.restApiId,
          "/stages/",
          apigw.deploymentStage.stageName,
        ]),
        webAclId: S3SelectACL.ref,
      }
    );
    AclAssociation.addDependsOn(S3SelectACL); // This is required or the stack still sometimes fail
  }
}
