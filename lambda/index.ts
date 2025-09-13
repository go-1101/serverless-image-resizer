import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import sharp from "sharp";

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

interface S3Event {
  Records: { s3: { bucket: { name: string }; object: { key: string } } }[];
}

export const handler = async (event: S3Event) => {
  const record = event.Records[0];
  const sourceBucket = record.s3.bucket.name;
  const sourceKey = record.s3.object.key;
  const destinationBucket = process.env.DESTINATION_BUCKET_NAME;

  try {
    // 1. S3からオリジナルの画像を取得
    const getObjectParams = {
      Bucket: sourceBucket,
      Key: sourceKey,
    };
    const { Body, ContentType } = await s3Client.send(new GetObjectCommand(getObjectParams));

    if (!Body) {
      throw new Error("Image body is empty.");
    }

    // 2. sharpで画像をリサイズ
    const resizedImageBuffer = await sharp(await Body.transformToByteArray())
      .resize({ width: 200 }) // 幅を200pxにリサイズ
      .toBuffer();

    // 3. リサイズ済みの画像を別のS3バケットにアップロード
    const putObjectParams = {
      Bucket: destinationBucket,
      Key: sourceKey,
      Body: resizedImageBuffer,
      ContentType: ContentType,
    };
    await s3Client.send(new PutObjectCommand(putObjectParams));

    console.log(`Successfully resized and uploaded ${sourceKey} to ${destinationBucket}`);
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
};
