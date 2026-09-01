#!/bin/sh
set -e

awslocal s3 mb "s3://${S3_BUCKET_NAME}"

awslocal s3api put-bucket-cors --bucket "${S3_BUCKET_NAME}" --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'
