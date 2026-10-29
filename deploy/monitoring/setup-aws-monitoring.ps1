<#
.SYNOPSIS
  One-time AWS setup for off-host logs and external uptime alerts. Safe to re-run.

.DESCRIPTION
  1. Creates the CloudWatch log group /clearcaseiq/<env> with a retention limit.
  2. Lets each host's instance role write to that group (inline policy).
  3. Creates an SNS topic and subscribes the alert email (confirm the email AWS sends).
  4. Creates Route 53 health checks on the API readiness endpoint and the site,
     with CloudWatch alarms that mail the topic when either goes down.

  Afterwards, add CLOUDWATCH_LOG_GROUP=/clearcaseiq/<env> to .env.<env> on every
  host and redeploy; deploy/deploy.sh then layers docker-compose.cloudwatch.yml.

.EXAMPLE
  .\deploy\monitoring\setup-aws-monitoring.ps1 -Environment prod `
    -InstanceIds i-0abc,i-0def -AlertEmail ops@clearcaseiq.com
#>
param(
  [ValidateSet('prod', 'qa')][string]$Environment = 'prod',
  [Parameter(Mandatory)][string[]]$InstanceIds,
  [Parameter(Mandatory)][string]$AlertEmail,
  [int]$RetentionDays = 30,
  [string]$Region = 'us-east-1'
)

$ErrorActionPreference = 'Stop'
function Aws { $out = & aws @args; if ($LASTEXITCODE -ne 0) { throw "aws $($args -join ' ') failed" }; $out }

$hosts = @{
  prod = @{ Api = 'api.clearcaseiq.com'; Web = 'www.clearcaseiq.com' }
  qa   = @{ Api = 'api-qa.clearcaseiq.com'; Web = 'qa.clearcaseiq.com' }
}[$Environment]

$account = Aws sts get-caller-identity --query Account --output text
$logGroup = "/clearcaseiq/$Environment"

Write-Host "==> Log group $logGroup (retention $RetentionDays days)"
$existing = Aws logs describe-log-groups --region $Region --log-group-name-prefix $logGroup --query "logGroups[?logGroupName=='$logGroup'] | length(@)" --output text
if ($existing -eq '0') { Aws logs create-log-group --region $Region --log-group-name $logGroup | Out-Null }
Aws logs put-retention-policy --region $Region --log-group-name $logGroup --retention-in-days $RetentionDays | Out-Null

Write-Host '==> Instance role permissions'
$policy = @{
  Version   = '2012-10-17'
  Statement = @(@{
      Effect   = 'Allow'
      Action   = @('logs:CreateLogStream', 'logs:PutLogEvents', 'logs:DescribeLogStreams')
      Resource = "arn:aws:logs:${Region}:${account}:log-group:${logGroup}:*"
    })
} | ConvertTo-Json -Depth 5 -Compress
$policyFile = New-TemporaryFile
Set-Content -Path $policyFile -Value $policy -Encoding ascii
$roles = @{}
foreach ($id in ($InstanceIds -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
  $profileArn = Aws ec2 describe-instances --region $Region --instance-ids $id --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text
  if (-not $profileArn -or $profileArn -eq 'None') { throw "$id has no instance profile; attach one before enabling CloudWatch logs." }
  $profileName = $profileArn.Split('/')[-1]
  $role = Aws iam get-instance-profile --instance-profile-name $profileName --query 'InstanceProfile.Roles[0].RoleName' --output text
  $roles[$role] = $true
}
foreach ($role in $roles.Keys) {
  Aws iam put-role-policy --role-name $role --policy-name "clearcaseiq-$Environment-cloudwatch-logs" --policy-document "file://$policyFile" | Out-Null
  Write-Host "    $role can write to $logGroup"
}
Remove-Item $policyFile

Write-Host '==> Alert topic'
$topicArn = Aws sns create-topic --region $Region --name "clearcaseiq-$Environment-alerts" --query TopicArn --output text
$subscribed = Aws sns list-subscriptions-by-topic --region $Region --topic-arn $topicArn --query "Subscriptions[?Endpoint=='$AlertEmail'] | length(@)" --output text
if ($subscribed -eq '0') {
  Aws sns subscribe --region $Region --topic-arn $topicArn --protocol email --notification-endpoint $AlertEmail | Out-Null
  Write-Host "    Confirmation sent to $AlertEmail - alerts start after you click the link."
}

Write-Host '==> Route 53 health checks'
$checks = Aws route53 list-health-checks --output json | ConvertFrom-Json
foreach ($target in @(
    @{ Name = 'api'; Fqdn = $hosts.Api; Path = '/health/ready' },
    @{ Name = 'web'; Fqdn = $hosts.Web; Path = '/' })) {
  $match = $checks.HealthChecks | Where-Object {
    $_.HealthCheckConfig.FullyQualifiedDomainName -eq $target.Fqdn -and $_.HealthCheckConfig.ResourcePath -eq $target.Path
  } | Select-Object -First 1
  if ($match) {
    $checkId = $match.Id
  } else {
    $config = @{
      Type                     = 'HTTPS'
      FullyQualifiedDomainName = $target.Fqdn
      Port                     = 443
      ResourcePath             = $target.Path
      RequestInterval          = 30
      FailureThreshold         = 3
      EnableSNI                = $true
    } | ConvertTo-Json -Compress
    $configFile = New-TemporaryFile
    Set-Content -Path $configFile -Value $config -Encoding ascii
    $checkId = Aws route53 create-health-check --caller-reference "clearcaseiq-$Environment-$($target.Name)-$(Get-Date -Format yyyyMMddHHmmss)" --health-check-config "file://$configFile" --query HealthCheck.Id --output text
    Remove-Item $configFile
    Aws route53 change-tags-for-resource --resource-type healthcheck --resource-id $checkId --add-tags "Key=Name,Value=clearcaseiq-$Environment-$($target.Name)" | Out-Null
  }

  # Route 53 health check metrics exist only in us-east-1.
  Aws cloudwatch put-metric-alarm --region us-east-1 `
    --alarm-name "clearcaseiq-$Environment-$($target.Name)-down" `
    --alarm-description "https://$($target.Fqdn)$($target.Path) is failing Route 53 health checks" `
    --namespace AWS/Route53 --metric-name HealthCheckStatus `
    --dimensions "Name=HealthCheckId,Value=$checkId" `
    --statistic Minimum --period 60 --evaluation-periods 2 --threshold 1 `
    --comparison-operator LessThanThreshold --treat-missing-data breaching `
    --alarm-actions $topicArn --ok-actions $topicArn | Out-Null
  Write-Host "    $($target.Fqdn)$($target.Path) -> alarm clearcaseiq-$Environment-$($target.Name)-down"
}

Write-Host ''
Write-Host "Done. Next: add CLOUDWATCH_LOG_GROUP=$logGroup to .env.$Environment on each host, then redeploy."
