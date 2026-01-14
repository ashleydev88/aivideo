require('dotenv').config();

process.env.AWS_ACCESS_KEY_ID = process.env.REMOTION_AWS_ACCESS_KEY_ID;
process.env.AWS_SECRET_ACCESS_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
process.env.AWS_REGION = process.env.REMOTION_AWS_REGION;

const { IAMClient, CreateRoleCommand, PutRolePolicyCommand, GetRoleCommand, UpdateAssumeRolePolicyCommand } = require("@aws-sdk/client-iam");

const client = new IAMClient({ region: "eu-west-2" }); // Region from previous output

const roleName = "remotion-lambda-role";

const trustPolicy = {
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
};

const permissionsPolicy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "0",
            "Effect": "Allow",
            "Action": [
                "s3:ListAllMyBuckets"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Sid": "1",
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:ListBucket",
                "s3:PutBucketAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl",
                "s3:PutObject",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::remotionlambda-*"
            ]
        },
        {
            "Sid": "2",
            "Effect": "Allow",
            "Action": [
                "lambda:InvokeFunction"
            ],
            "Resource": [
                "arn:aws:lambda:*:*:function:remotion-render-*"
            ]
        },
        {
            "Sid": "3",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup"
            ],
            "Resource": [
                "arn:aws:logs:*:*:log-group:/aws/lambda-insights"
            ]
        },
        {
            "Sid": "4",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:*:*:log-group:/aws/lambda/remotion-render-*",
                "arn:aws:logs:*:*:log-group:/aws/lambda-insights:*"
            ]
        }
    ]
};

async function main() {
    try {
        console.log(`Checking if role ${roleName} exists...`);
        try {
            await client.send(new GetRoleCommand({ RoleName: roleName }));
            console.log("Role exists. Updating trust policy...");
            await client.send(new UpdateAssumeRolePolicyCommand({
                RoleName: roleName,
                PolicyDocument: JSON.stringify(trustPolicy)
            }));
        } catch (e) {
            if (e.name === 'NoSuchEntityException') {
                console.log("Role does not exist. Creating...");
                await client.send(new CreateRoleCommand({
                    RoleName: roleName,
                    AssumeRolePolicyDocument: JSON.stringify(trustPolicy)
                }));
            } else {
                throw e;
            }
        }

        console.log("Attaching permission policy...");
        await client.send(new PutRolePolicyCommand({
            RoleName: roleName,
            PolicyName: "remotion-lambda-policy",
            PolicyDocument: JSON.stringify(permissionsPolicy)
        }));

        console.log("Successfully setup remotion-lambda-role.");
    } catch (err) {
        console.error("Error setting up role:", err);
        process.exit(1);
    }
}

main();
