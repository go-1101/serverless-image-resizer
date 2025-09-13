import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class ServerlessImageResizerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const destinationBucket = new s3.Bucket(this, 'DestinationBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const imageResizerLambda = new NodejsFunction(this, 'ImageResizerLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/index.ts'),
      handler: 'handler',
      environment: {
        DESTINATION_BUCKET_NAME: destinationBucket.bucketName,
      },
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      // --- ここから追加 ---
      bundling: {
        externalModules: ['sharp'], // sharpを外部依存関係として扱う
      },
      // --- ここまで追加 ---
    });

    sourceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(imageResizerLambda)
    );

    sourceBucket.grantRead(imageResizerLambda);
    destinationBucket.grantWrite(imageResizerLambda);
  }
}
