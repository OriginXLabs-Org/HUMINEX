targetScope = 'resourceGroup'

@description('Azure region for monitoring resources.')
param location string = resourceGroup().location

@description('Deployment environment (dev/stage/prod).')
@allowed([
  'dev'
  'stage'
  'prod'
])
param environment string

@description('Global naming prefix. Keep as huminex for resource identity.')
param namePrefix string = 'huminex'

@description('Log Analytics workspace name used by HUMINEX observability.')
param logAnalyticsWorkspaceName string = '${namePrefix}-${environment}-law'

@description('Workspace-based Application Insights component name.')
param appInsightsName string = '${namePrefix}-${environment}-appi'

@secure()
@description('Slack incoming webhook URL used by the Logic App relay.')
param slackWebhookUrl string

@description('Slack channel mention (example: #huminex-alerts). Leave empty to skip mention.')
param slackChannelMention string = '#huminex-alerts'

@description('Portal link to HUMINEX workbook/dashboard for drilldown.')
param workbookPortalUrl string = 'https://portal.azure.com/#view/Microsoft_Azure_Monitoring/AzureMonitoringBrowseBlade/~/workbooks'

@description('Daily spend threshold in billing currency for cost alerts.')
param dailySpendThresholdUsd int = 300

@description('Monthly spend threshold in billing currency for budget-style alerts.')
param monthlySpendThresholdUsd int = 9000

@description('Tag value: owner')
param owner string = 'platform@huminex'

@description('Tag value: team')
param team string = 'platform'

@description('Tag value: cost-center')
param costCenter string = 'huminex-platform'

var criticalActionGroupName = '${namePrefix}-${environment}-ag-critical'
var warningActionGroupName = '${namePrefix}-${environment}-ag-warning'
var logicAppName = '${namePrefix}-${environment}-alert-relay-la'
var dailySpendThresholdText = string(dailySpendThresholdUsd)
var monthlySpendThresholdText = string(monthlySpendThresholdUsd)
var dailySpendQuery = replace('''
CostUsage_CL
| where todatetime(UsageDate_t) >= startofday(now())
| summarize DailySpend=sum(CostInBillingCurrency_d)
| where DailySpend > __DAILY_THRESHOLD__
| summarize Violations=count()
''', '__DAILY_THRESHOLD__', dailySpendThresholdText)
var monthlySpendQuery = replace('''
CostUsage_CL
| where todatetime(UsageDate_t) >= startofmonth(now())
| summarize MonthlySpend=sum(CostInBillingCurrency_d)
| where MonthlySpend > __MONTHLY_THRESHOLD__
| summarize Violations=count()
''', '__MONTHLY_THRESHOLD__', monthlySpendThresholdText)

var resourceTags = {
  app: 'huminex'
  environment: environment
  owner: owner
  team: team
  'cost-center': costCenter
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsWorkspaceName
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

resource slackRelayWorkflow 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: location
  tags: resourceTags
  properties: {
    state: 'Enabled'
    definition: json(loadTextContent('./definitions/alert-to-slack.workflow.json'))
    parameters: {
      slackWebhookUrl: {
        value: slackWebhookUrl
      }
      channelMention: {
        value: slackChannelMention
      }
      workbookUrl: {
        value: workbookPortalUrl
      }
      azurePortalBaseUrl: {
        value: 'https://portal.azure.com'
      }
      defaultEnvironment: {
        value: environment
      }
    }
  }
}

resource slackRelayManualTrigger 'Microsoft.Logic/workflows/triggers@2019-05-01' existing = {
  parent: slackRelayWorkflow
  name: 'manual'
}

var slackRelayCallbackUrl = slackRelayManualTrigger.listCallbackUrl().value

resource actionGroupCritical 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: criticalActionGroupName
  location: 'global'
  tags: resourceTags
  properties: {
    groupShortName: 'HUMCRIT'
    enabled: true
    webhookReceivers: [
      {
        name: 'slack-critical'
        serviceUri: slackRelayCallbackUrl
        useCommonAlertSchema: true
      }
    ]
  }
}

resource actionGroupWarning 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: warningActionGroupName
  location: 'global'
  tags: resourceTags
  properties: {
    groupShortName: 'HUMWARN'
    enabled: true
    webhookReceivers: [
      {
        name: 'slack-warning'
        serviceUri: slackRelayCallbackUrl
        useCommonAlertSchema: true
      }
    ]
  }
}

var logAlerts = [
  {
    name: '${namePrefix}-${environment}-aks-node-cpu-high'
    description: 'AKS node CPU usage above 80%.'
    displayName: 'AKS Node CPU > 80%'
    severity: 1
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
Perf
| where TimeGenerated > ago(10m)
| where ObjectName =~ 'K8SNode' and CounterName =~ 'cpuUsagePercentage'
| summarize MaxCpu=max(CounterValue) by Computer
| where MaxCpu > 80
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-aks-node-memory-pressure'
    description: 'AKS node memory pressure detected.'
    displayName: 'AKS Node Memory Pressure'
    severity: 1
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
Perf
| where TimeGenerated > ago(10m)
| where ObjectName =~ 'K8SNode' and CounterName =~ 'memoryRssPercentage'
| summarize MaxMem=max(CounterValue) by Computer
| where MaxMem > 90
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-aks-pod-crashloop'
    description: 'Pod crash loops / restart spikes in AKS.'
    displayName: 'AKS Pod Crash Loops'
    severity: 1
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
KubePodInventory
| where TimeGenerated > ago(10m)
| summarize Restarts=sum(ContainerRestartCount) by ClusterName, Namespace
| where Restarts > 5
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-aks-deployment-failure'
    description: 'Kubernetes deployment failures detected.'
    displayName: 'AKS Deployment Failures'
    severity: 1
    windowSize: 'PT15M'
    evaluationFrequency: 'PT5M'
    query: '''
KubeEvents
| where TimeGenerated > ago(15m)
| where Reason has_any ('Failed', 'BackOff', 'FailedScheduling', 'FailedCreate')
| summarize Failures=count() by Namespace
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-ingress-5xx-spike'
    description: 'NGINX ingress 5xx response spike.'
    displayName: 'Ingress 5xx Spike'
    severity: 1
    windowSize: 'PT5M'
    evaluationFrequency: 'PT5M'
    query: '''
ContainerLogV2
| where TimeGenerated > ago(5m)
| where (PodName has 'ingress' or ContainerName has 'nginx')
| where LogMessage has ' 5'
| summarize Errors5xx=count()
| where Errors5xx > 20
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-aks-cluster-unavailable'
    description: 'AKS cluster heartbeat unavailable.'
    displayName: 'AKS Cluster Unavailable'
    severity: 0
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
Heartbeat
| where TimeGenerated > ago(10m)
| where ResourceProvider =~ 'MICROSOFT.CONTAINERSERVICE' or Computer has '-aks-'
| summarize Nodes=dcount(Computer)
| where Nodes < 1
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-api-error-rate-high'
    description: 'API error rate exceeded threshold.'
    displayName: 'API Error Rate Spike'
    severity: 1
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
AppRequests
| where TimeGenerated > ago(10m)
| summarize Total=count(), Failed=countif(Success == false)
| extend ErrorRate = iif(Total == 0, 0.0, (todouble(Failed) / todouble(Total)) * 100.0)
| where Total > 50 and ErrorRate > 5
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-api-p95-latency-spike'
    description: 'API latency (P95) exceeded threshold.'
    displayName: 'API P95 Latency Spike'
    severity: 2
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
AppRequests
| where TimeGenerated > ago(10m)
| summarize P95LatencyMs=percentile(DurationMs, 95)
| where P95LatencyMs > 2000
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-api-dependency-failure-spike'
    description: 'Dependency failure rate exceeded threshold.'
    displayName: 'API Dependency Failures'
    severity: 2
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
AppDependencies
| where TimeGenerated > ago(10m)
| summarize Total=count(), Failed=countif(Success == false)
| extend FailureRate = iif(Total == 0, 0.0, (todouble(Failed) / todouble(Total)) * 100.0)
| where Total > 20 and FailureRate > 3
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-api-healthcheck-failure'
    description: 'Health-check endpoint failures detected.'
    displayName: 'API Health Check Failures'
    severity: 1
    windowSize: 'PT5M'
    evaluationFrequency: 'PT5M'
    query: '''
AppRequests
| where TimeGenerated > ago(5m)
| where Name has '/health'
| summarize Failures=countif(Success == false)
| where Failures > 0
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-defender-high-severity'
    description: 'Defender for Cloud high severity alert fired.'
    displayName: 'Defender High Severity Alert'
    severity: 1
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
SecurityAlert
| where TimeGenerated > ago(10m)
| where AlertSeverity =~ 'High'
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-keyvault-unauthorized'
    description: 'Key Vault unauthorized access attempts detected.'
    displayName: 'Key Vault Unauthorized Access'
    severity: 1
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
AzureDiagnostics
| where TimeGenerated > ago(10m)
| where ResourceProvider =~ 'MICROSOFT.KEYVAULT'
| where ResultType == '403' or ResultSignature has_any ('Forbidden', 'Unauthorized')
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-entra-suspicious-signin'
    description: 'Suspicious Entra sign-ins detected.'
    displayName: 'Suspicious Entra Sign-ins'
    severity: 1
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
SigninLogs
| where TimeGenerated > ago(10m)
| where RiskLevelDuringSignIn in~ ('high', 'medium') or RiskState !in~ ('none', 'hidden')
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-entra-failed-logins-spike'
    description: 'Excessive failed sign-in attempts detected.'
    displayName: 'Failed Login Spike'
    severity: 2
    windowSize: 'PT10M'
    evaluationFrequency: 'PT5M'
    query: '''
SigninLogs
| where TimeGenerated > ago(10m)
| where ResultType != 0
| summarize Failed=count() by UserPrincipalName
| where Failed > 20
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-daily-spend-threshold'
    description: 'Daily cloud spend exceeded threshold.'
    displayName: 'Daily Spend Exceeded'
    severity: 2
    windowSize: 'PT1H'
    evaluationFrequency: 'PT1H'
    query: dailySpendQuery
  }
  {
    name: '${namePrefix}-${environment}-monthly-budget-threshold'
    description: 'Monthly spend exceeded target budget threshold.'
    displayName: 'Monthly Budget Exceeded'
    severity: 1
    windowSize: 'PT3H'
    evaluationFrequency: 'PT1H'
    query: monthlySpendQuery
  }
  {
    name: '${namePrefix}-${environment}-aks-namespace-cost-anomaly'
    description: 'AKS namespace spend anomaly detected.'
    displayName: 'AKS Namespace Cost Anomaly'
    severity: 2
    windowSize: 'PT3H'
    evaluationFrequency: 'PT1H'
    query: '''
let baseline = CostUsage_CL
| where todatetime(UsageDate_t) between (ago(8d) .. ago(1d))
| where tolower(ServiceName_s) has 'kubernetes' or tolower(ServiceName_s) has 'aks'
| summarize AvgDaily=avg(CostInBillingCurrency_d) by Namespace_s;
let current = CostUsage_CL
| where todatetime(UsageDate_t) >= startofday(now())
| where tolower(ServiceName_s) has 'kubernetes' or tolower(ServiceName_s) has 'aks'
| summarize CurrentDaily=sum(CostInBillingCurrency_d) by Namespace_s;
current
| join kind=inner baseline on Namespace_s
| where CurrentDaily > (AvgDaily * 1.5) and CurrentDaily > 10
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-service-cost-spike'
    description: 'Unexpected service-level cost spike detected.'
    displayName: 'Service Cost Spike'
    severity: 2
    windowSize: 'PT3H'
    evaluationFrequency: 'PT1H'
    query: '''
let baseline = CostUsage_CL
| where todatetime(UsageDate_t) between (ago(8d) .. ago(1d))
| summarize AvgDaily=avg(CostInBillingCurrency_d) by ServiceName_s;
let current = CostUsage_CL
| where todatetime(UsageDate_t) >= startofday(now())
| summarize CurrentDaily=sum(CostInBillingCurrency_d) by ServiceName_s;
current
| join kind=inner baseline on ServiceName_s
| where CurrentDaily > (AvgDaily * 1.7) and CurrentDaily > 15
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-deployments-failed'
    description: 'Deployment failures detected from Azure Activity logs.'
    displayName: 'Deployment Failed'
    severity: 1
    windowSize: 'PT15M'
    evaluationFrequency: 'PT5M'
    query: '''
AzureActivity
| where TimeGenerated > ago(15m)
| where ActivityStatusValue =~ 'Failed'
| where OperationNameValue has_any ('deployments/write', 'deployments/validate/action', 'rollouts/write')
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-deployments-succeeded'
    description: 'Deployment success event observed.'
    displayName: 'Deployment Succeeded'
    severity: 3
    windowSize: 'PT30M'
    evaluationFrequency: 'PT15M'
    query: '''
AzureActivity
| where TimeGenerated > ago(30m)
| where ActivityStatusValue =~ 'Succeeded'
| where OperationNameValue has_any ('deployments/write', 'rollouts/write')
| summarize Violations=count()
'''
  }
  {
    name: '${namePrefix}-${environment}-platform-scale-events'
    description: 'Scale up/down operation detected.'
    displayName: 'Scale Event Detected'
    severity: 3
    windowSize: 'PT15M'
    evaluationFrequency: 'PT5M'
    query: '''
AzureActivity
| where TimeGenerated > ago(15m)
| where OperationNameValue has_any ('agentPools/write', 'autoscaleSettings/write', 'virtualMachineScaleSets/write')
| where ActivityStatusValue in~ ('Succeeded', 'Started')
| summarize Violations=count()
'''
  }
]

resource logAlertRules 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = [for rule in logAlerts: {
  name: rule.name
  location: location
  tags: resourceTags
  properties: {
    description: rule.description
    displayName: rule.displayName
    enabled: true
    severity: rule.severity
    scopes: [
      logAnalytics.id
    ]
    evaluationFrequency: rule.evaluationFrequency
    windowSize: rule.windowSize
    autoMitigate: true
    skipQueryValidation: true
    criteria: {
      allOf: [
        {
          query: rule.query
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            minFailingPeriodsToAlert: 1
            numberOfEvaluationPeriods: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: rule.severity <= 1
        ? [
            actionGroupCritical.id
          ]
        : [
            actionGroupWarning.id
          ]
      customProperties: {
        project: 'HUMINEX'
        environment: environment
        source: 'AzureMonitor-LogAlert'
      }
    }
  }
}]

resource appInsightsFailedRequestMetricAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-appi-failed-requests-metric'
  location: 'global'
  tags: resourceTags
  properties: {
    description: 'App Insights failed request count spike.'
    severity: 1
    enabled: true
    scopes: [
      appInsights.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'failed-requests-total'
          metricName: 'requests/failed'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: 25
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroupCritical.id
      }
    ]
    autoMitigate: true
    targetResourceType: 'microsoft.insights/components'
  }
}

resource appInsightsExceptionMetricAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-appi-exceptions-metric'
  location: 'global'
  tags: resourceTags
  properties: {
    description: 'App Insights exception count spike.'
    severity: 2
    enabled: true
    scopes: [
      appInsights.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'exceptions-count'
          metricName: 'exceptions/count'
          metricNamespace: 'microsoft.insights/components'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroupWarning.id
      }
    ]
    autoMitigate: true
    targetResourceType: 'microsoft.insights/components'
  }
}

output slackRelayLogicAppName string = slackRelayWorkflow.name
output criticalActionGroupResourceId string = actionGroupCritical.id
output warningActionGroupResourceId string = actionGroupWarning.id
output totalLogAlertRules int = length(logAlerts)
output monitoringPortalHint string = 'Azure Portal > Monitor > Alerts > Alert rules (filter prefix: ${namePrefix}-${environment}-)'
