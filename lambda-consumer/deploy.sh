#!/bin/bash
# Deploy Lambda Consumer to AWS
# Usage: ./deploy.sh <AWS_ACCOUNT_ID>

set -e

# Use full path to $AWS cli
AWS=/usr/local/bin/aws
DOCKER=/usr/local/bin/docker

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <AWS_ACCOUNT_ID>"
    echo "Example: ./deploy.sh 614628091955"
    exit 1
fi

AWS_ACCOUNT_ID=$1
AWS_REGION="eu-west-2"
ECR_REPO="video-render-consumer"
FUNCTION_NAME="video-render-consumer"
SQS_QUEUE_NAME="video-render-queue"
ROLE_NAME="video-render-consumer-role"

echo "🚀 Deploying Lambda Consumer..."
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   Region: $AWS_REGION"

# 0. Create IAM Role (if doesn't exist)
echo "👤 Checking IAM role..."
ROLE_EXISTS=$($AWS iam get-role --role-name $ROLE_NAME 2>/dev/null && echo "yes" || echo "no")

if [ "$ROLE_EXISTS" == "no" ]; then
    echo "   Creating IAM role: $ROLE_NAME"
    
    # Trust policy allowing Lambda to assume this role
    cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    $AWS iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file:///tmp/trust-policy.json

    # Attach necessary policies
    echo "   Attaching policies..."
    $AWS iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    $AWS iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
    
    # Wait for role to propagate
    echo "   Waiting for role to propagate..."
    sleep 10
else
    echo "   Role already exists"
fi

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"

# 1. Create ECR Repository (ignore if exists)
echo "📦 Creating ECR repository..."
$AWS ecr create-repository \
    --repository-name $ECR_REPO \
    --region $AWS_REGION 2>/dev/null || echo "   Repository already exists"

# 2. Login to ECR
echo "🔑 Logging into ECR..."
$AWS ecr get-login-password --region $AWS_REGION | $DOCKER login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 3. Build Docker Image
echo "🔨 Building Docker image..."
$DOCKER build --platform linux/amd64 -t $ECR_REPO .

# 4. Tag and Push
echo "📤 Pushing to ECR..."
$DOCKER tag $ECR_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest
$DOCKER push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest

# 5. Check if Lambda exists
LAMBDA_EXISTS=$($AWS lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>/dev/null && echo "yes" || echo "no")

if [ "$LAMBDA_EXISTS" == "no" ]; then
    echo "⚡ Creating Lambda function..."
    $AWS lambda create-function \
        --function-name $FUNCTION_NAME \
        --package-type Image \
        --code ImageUri=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest \
        --role $ROLE_ARN \
        --timeout 900 \
        --memory-size 1024 \
        --region $AWS_REGION
else
    echo "🔄 Updating Lambda function..."
    $AWS lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --image-uri $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest \
        --region $AWS_REGION
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure environment variables in AWS Console or run:"
echo "      $AWS lambda update-function-configuration \\"
echo "        --function-name $FUNCTION_NAME \\"
echo "        --environment \"Variables={SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=...}\""
echo ""
echo "   2. Add SQS trigger (if not already added):"
echo "      $AWS lambda create-event-source-mapping \\"
echo "        --function-name $FUNCTION_NAME \\"
echo "        --batch-size 1 \\"
echo "        --event-source-arn arn:aws:sqs:$AWS_REGION:$AWS_ACCOUNT_ID:$SQS_QUEUE_NAME"

