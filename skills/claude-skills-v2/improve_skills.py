#!/usr/bin/env python3
"""
Claude Skills 配置改进脚本
Fix and improve the Skills configuration based on validation results
"""

import json
import copy
from datetime import datetime
from pathlib import Path

def load_config(path: str) -> dict:
    """Load configuration file"""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_config(config: dict, path: str) -> None:
    """Save configuration file"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

def fix_metadata(config: dict) -> dict:
    """Fix metadata section"""
    if 'metadata' not in config:
        config['metadata'] = {}
    
    metadata = config['metadata']
    
    # Add missing version
    if 'version' not in metadata:
        metadata['version'] = config.get('version', '1.0.0')
    
    # Ensure all required fields
    defaults = {
        'name': 'Home Maintenance AI Architecture Skills',
        'description': 'Comprehensive Claude Skills suite for home issue diagnosis with AI-powered continuous learning feedback loop',
        'author': 'House Maintenance AI Team',
        'created': '2026-01-25',
        'updated': datetime.now().strftime('%Y-%m-%d'),
        'deploymentTarget': 'Claude API v1'
    }
    
    for key, default_value in defaults.items():
        if key not in metadata:
            metadata[key] = default_value
    
    return config

def fix_integrations(config: dict) -> dict:
    """Fix integration configurations"""
    if 'integrations' not in config:
        config['integrations'] = {}
    
    services = config['integrations'].get('externalServices', {})
    
    # Fix database endpoint
    if 'database' in services:
        if 'endpoint' not in services['database']:
            services['database']['endpoint'] = 'file:///data/home-maintenance.db'
        if 'timeout' not in services['database']:
            services['database']['timeout'] = 5000
    
    # Fix dataLake endpoint
    if 'dataLake' in services:
        if 'endpoint' not in services['dataLake']:
            services['dataLake']['endpoint'] = 'https://s3.amazonaws.com'
        if 'timeout' not in services['dataLake']:
            services['dataLake']['timeout'] = 30000
    
    # Fix vectorStore timeout
    if 'vectorStore' in services:
        if 'timeout' not in services['vectorStore']:
            services['vectorStore']['timeout'] = 5000
    
    config['integrations']['externalServices'] = services
    return config

def fix_deployment_config(config: dict) -> dict:
    """Fix deployment configuration"""
    if 'deploymentConfig' not in config:
        config['deploymentConfig'] = {}
    
    deploy = config['deploymentConfig']
    
    # Add missing skill to priority order
    if 'priorityOrder' in deploy:
        all_skills = set(config.get('skills', {}).keys())
        ordered_skills = set()
        
        for priority, skills in deploy['priorityOrder'].items():
            ordered_skills.update(skills)
        
        missing = all_skills - ordered_skills
        
        # Add missing skills to HIGH priority by default
        if missing and 'HIGH' in deploy['priorityOrder']:
            deploy['priorityOrder']['HIGH'].extend(list(missing))
    
    return config

def add_property_descriptions(config: dict) -> dict:
    """Add missing descriptions to schema properties"""
    skills = config.get('skills', {})
    
    # Property description templates
    descriptions = {
        # Common input properties
        'userSessionId': 'Unique identifier for the user session',
        'sessionId': 'Unique session identifier for tracking',
        'userId': 'Unique user identifier',
        'timestamp': 'ISO 8601 formatted timestamp',
        'originalDiagnosis': 'The original diagnosis result to analyze',
        'actionSequence': 'Sequence of user actions with timestamps',
        'sessionOutcome': 'Final outcome of the user session',
        'metricsData': 'Array of metrics data points for analysis',
        'userEvents': 'Array of user interaction events',
        'diagnosisResult': 'The diagnosis result to evaluate',
        'userFeedback': 'Text feedback provided by the user',
        'diagnosisFields': 'Individual fields from the diagnosis',
        'historicalData': 'Historical data points for comparison',
        'recentData': 'Recent data points for analysis',
        'seasonalityEnabled': 'Whether to account for seasonal patterns',
        'failedDiagnoses': 'Array of failed diagnosis cases',
        'currentPrompt': 'Current prompt being optimized',
        'testSet': 'Test dataset for evaluation',
        'variationCount': 'Number of prompt variations to generate',
        'successfulDiagnoses': 'Array of successful diagnosis cases',
        'vectorStoreConfig': 'Configuration for vector store',
        'pruneThreshold': 'Threshold for pruning low-quality examples',
        'predictions': 'Array of prediction results',
        'diagnosis': 'The diagnosis to validate',
        'category': 'Issue category classification',
        'recommendedAction': 'Recommended action for the issue',
        'severity': 'Severity level of the issue',
        'postDeploymentMetrics': 'Metrics collected after deployment',
        'baselineMetrics': 'Baseline metrics for comparison',
        'deploymentId': 'Unique deployment identifier',
        'changeType': 'Type of change being coordinated',
        'changeDetails': 'Detailed information about the change',
        'requiresApproval': 'Whether human approval is required',
        'urgencyLevel': 'Urgency level of the change',
        'feedbackEvents': 'Array of feedback events to process',
        'batchSize': 'Number of events to process per batch',
        'userJourney': 'Complete user journey data',
        'action': 'Action to perform on knowledge base',
        'knowledgeItems': 'Knowledge items to add/update/remove',
        'issueInput': 'User input describing the issue',
        'userSession': 'Complete user session data',
        'triggerEvent': 'Event that triggered the pipeline',
        'metricsWindow': 'Time window for metrics calculation',
        'eventData': 'Event data for metrics calculation',
        'alertTriggers': 'Conditions that trigger alerts',
        'notificationChannels': 'Channels for sending notifications',
        
        # Common output properties
        'confidenceScore': 'Confidence score between 0 and 1',
        'implicitSignals': 'Detected implicit feedback signals',
        'suggestedTrainingLabel': 'Suggested label for training data',
        'accuracyScore': 'Calculated accuracy score',
        'categoryBreakdown': 'Breakdown of results by category',
        'correctionRate': 'Rate of user corrections',
        'anomalies': 'Detected anomalies or issues',
        'triggerReason': 'Reason for triggering action',
        'signals': 'Detected user signals',
        'feedbackSentiment': 'Overall sentiment of feedback',
        'sentiment': 'Sentiment classification result',
        'sentimentScore': 'Numeric sentiment score',
        'extractedComplaints': 'Complaints extracted from feedback',
        'extractedPraise': 'Praise extracted from feedback',
        'mentionedCategories': 'Categories mentioned in feedback',
        'sarcasmDetected': 'Whether sarcasm was detected',
        'frustrationLevel': 'User frustration level estimate',
        'fieldMappings': 'Mapping of feedback to fields',
        'driftDetected': 'Whether data drift was detected',
        'driftScore': 'Calculated drift score',
        'categoryShifts': 'Detected category distribution shifts',
        'confidenceDegradation': 'Confidence score degradation info',
        'emergingCategories': 'Newly emerging issue categories',
        'seasonalPatterns': 'Detected seasonal patterns',
        'alerts': 'Generated alert messages',
        'candidates': 'Generated candidate prompts',
        'topCandidate': 'Best performing candidate',
        'shadowTestRecommendation': 'Shadow testing recommendation',
        'trafficAllocation': 'Traffic allocation percentage',
        'addedExamples': 'Number of examples added',
        'removedExamples': 'Number of examples removed',
        'categoryBalance': 'Category distribution balance',
        'vectorStoreStats': 'Vector store statistics',
        'fewShotContext': 'Few-shot learning context',
        'calibrationCurves': 'Calculated calibration curves',
        'newThresholds': 'Updated confidence thresholds',
        'calibrationQuality': 'Calibration quality metric (ECE)',
        'uncertaintyFlaggingRules': 'Rules for flagging uncertainty',
        'displayRecommendations': 'Display recommendation settings',
        'validated': 'Whether validation passed',
        'violations': 'Safety rule violations found',
        'requiredWarnings': 'Mandatory safety warnings',
        'mustBeElectricianOnly': 'Requires licensed electrician',
        'mustBeProfessional': 'Requires professional service',
        'buildingCodeReferences': 'Relevant building codes',
        'liabilityDisclaimer': 'Required liability disclaimer',
        'rollbackRequired': 'Whether rollback is needed',
        'rollbackReasons': 'Reasons for rollback',
        'metricsComparison': 'Comparison of metrics',
        'rollbackExecuted': 'Whether rollback was executed',
        'alertSent': 'Whether alert was sent',
        'cooldownUntil': 'Cooldown period end time',
        'reviewRequested': 'Whether review was requested',
        'reviewId': 'Unique review identifier',
        'approvalStatus': 'Current approval status',
        'assignedReviewers': 'List of assigned reviewers',
        'notificationSent': 'Whether notification was sent',
        'scheduledDeploymentTime': 'Scheduled deployment time',
        'auditLog': 'Audit trail entries',
        'processedCount': 'Number of items processed',
        'validatedCount': 'Number of items validated',
        'deduplicatedCount': 'Number of duplicates removed',
        'validationErrors': 'Validation error details',
        'trainingPairsGenerated': 'Generated training pairs',
        'storageReady': 'Whether storage is ready',
        'processingStats': 'Processing statistics',
        'timeMetrics': 'Time-based metrics',
        'dwellTimes': 'Page dwell time data',
        'editCounts': 'Edit count by field',
        'featureUsagePath': 'Feature usage sequence',
        'completionStatus': 'Task completion status',
        'conversionRate': 'Conversion rate metric',
        'behaviorProfile': 'User behavior profile',
        'itemsAdded': 'Number of items added',
        'itemsRemoved': 'Number of items removed',
        'itemsUpdated': 'Number of items updated',
        'knowledgeBaseStats': 'Knowledge base statistics',
        'curatedSuccessfully': 'Curation success status',
        'diagnosisResult': 'Complete diagnosis result',
        'displayResult': 'Result formatted for display',
        'feedbackTrackingEnabled': 'Feedback tracking status',
        'processingTime': 'Total processing time in ms',
        'feedbackProcessed': 'Feedback processing status',
        'classification': 'Feedback classification',
        'trainingPairGenerated': 'Training pair generation status',
        'metricsUpdated': 'Metrics update status',
        'updateTriggerFired': 'Update trigger status',
        'processingDetails': 'Detailed processing info',
        'pipelineExecuted': 'Pipeline execution status',
        'stage': 'Current pipeline stage',
        'shadowTestResults': 'Shadow test results',
        'promotionStatus': 'Promotion status',
        'featureFlagUpdate': 'Feature flag update status',
        'window': 'Time window for metrics',
        'accuracyRate': 'Calculated accuracy rate',
        'averageConfidenceByCategory': 'Average confidence by category',
        'userAcceptanceRate': 'User acceptance rate',
        'latencyMetrics': 'Latency percentile metrics',
        'throughput': 'System throughput metric',
        'trends': 'Trend analysis data',
        'alertsGenerated': 'Number of alerts generated',
        'notificationsSent': 'Number of notifications sent',
        'notificationStatus': 'Status of sent notifications',
        'estimatedCost': 'Estimated repair cost breakdown'
    }
    
    for skill_id, skill_config in skills.items():
        # Fix input schema
        if 'inputSchema' in skill_config:
            props = skill_config['inputSchema'].get('properties', {})
            for prop_name, prop_def in props.items():
                if 'description' not in prop_def and prop_name in descriptions:
                    prop_def['description'] = descriptions[prop_name]
        
        # Fix output schema
        if 'outputSchema' in skill_config:
            props = skill_config['outputSchema'].get('properties', {})
            for prop_name, prop_def in props.items():
                if 'description' not in prop_def and prop_name in descriptions:
                    prop_def['description'] = descriptions[prop_name]
    
    return config

def add_error_handling(config: dict) -> dict:
    """Add error handling to output schemas"""
    skills = config.get('skills', {})
    
    error_schema = {
        "error": {
            "type": "object",
            "description": "Error information if processing failed",
            "properties": {
                "code": {"type": "string", "description": "Error code"},
                "message": {"type": "string", "description": "Error message"},
                "details": {"type": "object", "description": "Additional error details"}
            }
        },
        "success": {
            "type": "boolean",
            "description": "Whether the operation completed successfully"
        }
    }
    
    for skill_id, skill_config in skills.items():
        if 'outputSchema' in skill_config:
            props = skill_config['outputSchema'].get('properties', {})
            if 'error' not in props:
                props['error'] = error_schema['error']
            if 'success' not in props:
                props['success'] = error_schema['success']
    
    return config

def add_timestamps(config: dict) -> dict:
    """Add timestamp fields to appropriate schemas"""
    skills = config.get('skills', {})
    
    timestamp_schema = {
        "type": "string",
        "format": "date-time",
        "description": "Timestamp when the operation completed"
    }
    
    # Skills that should have timestamps in output
    timestamp_skills = [
        'model-performance-monitor',
        'drift-detection-model',
        'feedback-ingestion-processor',
        'user-interaction-analyzer',
        'knowledge-base-curator',
        'diagnosis-flow-orchestrator',
        'feedback-detection-flow',
        'auto-update-pipeline-orchestrator',
        'alert-notification-manager'
    ]
    
    for skill_id, skill_config in skills.items():
        if skill_id in timestamp_skills:
            if 'outputSchema' in skill_config:
                props = skill_config['outputSchema'].get('properties', {})
                if 'timestamp' not in props:
                    props['timestamp'] = timestamp_schema
    
    return config

def standardize_skills(config: dict) -> dict:
    """Standardize skill configurations"""
    skills = config.get('skills', {})
    
    for skill_id, skill_config in skills.items():
        # Ensure consistent invocation config structure
        inv_config = skill_config.get('invocationConfig', {})
        
        if 'retryPolicy' not in inv_config:
            inv_config['retryPolicy'] = {
                'maxRetries': 2,
                'backoffMultiplier': 1.5
            }
        
        # Ensure parallelizable is defined
        if 'parallelizable' not in inv_config:
            inv_config['parallelizable'] = False
        
        # Ensure cacheable is defined
        if 'cacheable' not in inv_config:
            inv_config['cacheable'] = False
        
        skill_config['invocationConfig'] = inv_config
    
    return config

import argparse
import os

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Improve Claude Skills Configuration.')
    parser.add_argument('config', nargs='?', default='claude-skills-config.json', help='Configuration file to improve')
    args = parser.parse_args()

    input_file = args.config
    output_file = os.path.splitext(input_file)[0] + "-improved.json"
    
    print("🔧 Claude Skills Configuration Improvement Tool")
    print("=" * 50)
    
    # Load config
    print("📂 Loading configuration...")
    config = load_config(input_file)
    original_config = copy.deepcopy(config)
    
    # Apply fixes
    print("🔨 Applying fixes...")
    
    print("  ├─ Fixing metadata...")
    config = fix_metadata(config)
    
    print("  ├─ Fixing integrations...")
    config = fix_integrations(config)
    
    print("  ├─ Fixing deployment config...")
    config = fix_deployment_config(config)
    
    print("  ├─ Adding property descriptions...")
    config = add_property_descriptions(config)
    
    print("  ├─ Adding error handling...")
    config = add_error_handling(config)
    
    print("  ├─ Adding timestamps...")
    config = add_timestamps(config)
    
    print("  └─ Standardizing skills...")
    config = standardize_skills(config)
    
    # Save improved config
    print(f"\n💾 Saving improved configuration to: {output_file}")
    save_config(config, output_file)
    
    # Count changes
    def count_properties(c):
        count = 0
        for skill in c.get('skills', {}).values():
            for schema_name in ['inputSchema', 'outputSchema']:
                if schema_name in skill:
                    props = skill[schema_name].get('properties', {})
                    for prop in props.values():
                        if 'description' in prop:
                            count += 1
        return count
    
    original_props = count_properties(original_config)
    new_props = count_properties(config)
    
    print("\n📊 Improvement Summary:")
    print(f"  • Property descriptions added: {new_props - original_props}")
    print(f"  • Total skills: {len(config.get('skills', {}))}")
    print(f"  • Metadata version added: ✅")
    print(f"  • Integration endpoints fixed: ✅")
    print(f"  • Deployment order fixed: ✅")
    print(f"  • Error handling added: ✅")
    print(f"  • Timestamps added: ✅")
    
    print("\n✅ Configuration improvement complete!")
    print(f"   Output file: {output_file}")

if __name__ == '__main__':
    main()
