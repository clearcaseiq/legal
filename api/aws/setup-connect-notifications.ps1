# =============================================================================
# Wire Amazon Connect call recordings + Contact Lens output -> your API webhook.
#
# What it does (idempotent):
#   1. Creates an SNS topic in the Connect region.
#   2. Subscribes your API's HTTPS webhook to it (auto-confirmed by the webhook).
#   3. Grants the recordings S3 bucket permission to publish to the topic.
#   4. Points the bucket's ObjectCreated events at the topic.
#
# Prereqs: AWS CLI v2 installed + `aws configure` done with a user that can do
# sns:CreateTopic/SetTopicAttributes/Subscribe and s3:PutBucketNotification.
#
# Local dev: $Endpoint must be a PUBLIC https URL. Run a tunnel first, e.g.:
#   ngrok http 4000   ->  https://<something>.ngrok-free.app
# then use that host below. On EC2, use your real API domain.
# =============================================================================

$ErrorActionPreference = "Stop"

# ---- EDIT THESE FOUR VALUES -------------------------------------------------
$Region    = "us-west-2"
$AccountId = "302524629649"
$Bucket    = "REPLACE_WITH_RECORDINGS_BUCKET"          # from Connect -> Data storage
$Endpoint  = "https://REPLACE_WITH_PUBLIC_HOST/v1/calls/connect/events"
# -----------------------------------------------------------------------------

$TopicName = "caseiq-connect-recordings"
$TopicArn  = "arn:aws:sns:${Region}:${AccountId}:${TopicName}"

Write-Host "1/4 Creating SNS topic $TopicName ..." -ForegroundColor Cyan
aws sns create-topic --name $TopicName --region $Region | Out-Null

Write-Host "2/4 Subscribing webhook $Endpoint ..." -ForegroundColor Cyan
aws sns subscribe --topic-arn $TopicArn --protocol https --notification-endpoint $Endpoint --region $Region | Out-Null

Write-Host "3/4 Allowing S3 bucket $Bucket to publish to the topic ..." -ForegroundColor Cyan
$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowConnectRecordingsBucketPublish",
      "Effect": "Allow",
      "Principal": { "Service": "s3.amazonaws.com" },
      "Action": "SNS:Publish",
      "Resource": "$TopicArn",
      "Condition": {
        "StringEquals": { "aws:SourceAccount": "$AccountId" },
        "ArnLike": { "aws:SourceArn": "arn:aws:s3:::$Bucket" }
      }
    }
  ]
}
"@
$policyFile = Join-Path $env:TEMP "caseiq-sns-policy.json"
$policy | Set-Content -Path $policyFile -Encoding ascii
aws sns set-topic-attributes --topic-arn $TopicArn --attribute-name Policy --attribute-value "file://$policyFile" --region $Region | Out-Null

Write-Host "4/4 Enabling ObjectCreated notifications on $Bucket ..." -ForegroundColor Cyan
# NOTE: this REPLACES the bucket's notification config. If you already have
# other notifications on this bucket, merge them into TopicConfigurations.
$notif = @"
{
  "TopicConfigurations": [
    {
      "Id": "caseiq-connect-recordings-and-analysis",
      "TopicArn": "$TopicArn",
      "Events": ["s3:ObjectCreated:*"]
    }
  ]
}
"@
$notifFile = Join-Path $env:TEMP "caseiq-s3-notif.json"
$notif | Set-Content -Path $notifFile -Encoding ascii
aws s3api put-bucket-notification-configuration --bucket $Bucket --notification-configuration "file://$notifFile" --region $Region

Write-Host ""
Write-Host "Done. Topic: $TopicArn" -ForegroundColor Green
Write-Host "The API webhook auto-confirms the SNS subscription on first delivery." -ForegroundColor Green
Write-Host "Verify: aws sns list-subscriptions-by-topic --topic-arn $TopicArn --region $Region" -ForegroundColor DarkGray
