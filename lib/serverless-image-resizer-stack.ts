import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import { Function, Runtime, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';

export class ServerlessImageResizerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30),
        },
      ],
    });

    const destinationBucket = new s3.Bucket(this, 'DestinationBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const sharpLayer = new LayerVersion(this, 'SharpLayer', {
      code: Code.fromAsset(path.join(__dirname, '../lambda-layer')),
      compatibleRuntimes: [Runtime.NODEJS_20_X],
      description: 'Contains the sharp module',
    });

    const imageResizerLambda = new Function(this, 'ImageResizerLambda', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        DESTINATION_BUCKET_NAME: destinationBucket.bucketName,
      },
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      layers: [sharpLayer],
    });

    sourceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(imageResizerLambda)
    );

    sourceBucket.grantRead(imageResizerLambda);
    destinationBucket.grantWrite(imageResizerLambda);
  }
}
