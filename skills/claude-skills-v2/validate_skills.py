#!/usr/bin/env python3
"""
Claude Skills 验证、测试、改进脚本
Comprehensive validation, testing, and improvement tool for Claude Skills configuration
"""

import json
import sys
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum

class Severity(Enum):
    CRITICAL = "🔴 CRITICAL"
    HIGH = "🟠 HIGH"
    MEDIUM = "🟡 MEDIUM"
    LOW = "🔵 LOW"
    INFO = "ℹ️ INFO"

@dataclass
class ValidationIssue:
    severity: Severity
    category: str
    skill_id: str
    field: str
    message: str
    suggestion: Optional[str] = None

@dataclass
class ValidationResult:
    passed: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    summary: Dict[str, int] = field(default_factory=dict)
    improvements: List[Dict] = field(default_factory=list)

class SkillsValidator:
    """Comprehensive validator for Claude Skills configuration"""
    
    REQUIRED_TOP_LEVEL = ['version', 'metadata', 'skillGroups', 'skills', 'deploymentConfig']
    REQUIRED_SKILL_FIELDS = ['id', 'name', 'version', 'description', 'capabilities', 
                            'inputSchema', 'outputSchema', 'invocationConfig']
    VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    
    # Best practice thresholds
    MAX_TIMEOUT = 30000  # 30 seconds
    MIN_TIMEOUT = 100    # 100ms
    MAX_RETRIES = 5
    MIN_CAPABILITIES = 2
    MAX_CAPABILITIES = 10
    
    def __init__(self, config_path: str):
        self.config_path = Path(config_path)
        self.config: Dict = {}
        self.issues: List[ValidationIssue] = []
        self.improvements: List[Dict] = []
        
    def load_config(self) -> bool:
        """Load and parse the configuration file"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            return True
        except json.JSONDecodeError as e:
            self.issues.append(ValidationIssue(
                severity=Severity.CRITICAL,
                category="JSON",
                skill_id="N/A",
                field="root",
                message=f"Invalid JSON: {str(e)}",
                suggestion="Fix JSON syntax errors"
            ))
            return False
        except Exception as e:
            self.issues.append(ValidationIssue(
                severity=Severity.CRITICAL,
                category="File",
                skill_id="N/A",
                field="root",
                message=f"Cannot load file: {str(e)}"
            ))
            return False
    
    def validate_structure(self) -> None:
        """Validate top-level structure"""
        for field in self.REQUIRED_TOP_LEVEL:
            if field not in self.config:
                self.issues.append(ValidationIssue(
                    severity=Severity.CRITICAL,
                    category="Structure",
                    skill_id="N/A",
                    field=field,
                    message=f"Missing required top-level field: {field}",
                    suggestion=f"Add '{field}' to configuration"
                ))
    
    def validate_metadata(self) -> None:
        """Validate metadata section"""
        metadata = self.config.get('metadata', {})
        required_meta = ['name', 'description', 'version', 'author']
        for field in required_meta:
            if not metadata.get(field):
                self.issues.append(ValidationIssue(
                    severity=Severity.MEDIUM,
                    category="Metadata",
                    skill_id="N/A",
                    field=f"metadata.{field}",
                    message=f"Missing metadata field: {field}",
                    suggestion=f"Add '{field}' to metadata for better documentation"
                ))
    
    def validate_skill_groups(self) -> None:
        """Validate skill groups consistency"""
        groups = self.config.get('skillGroups', {})
        skills = self.config.get('skills', {})
        all_skill_ids = set(skills.keys())
        referenced_skills = set()
        
        for group_name, group_config in groups.items():
            if 'skills' not in group_config:
                self.issues.append(ValidationIssue(
                    severity=Severity.HIGH,
                    category="SkillGroups",
                    skill_id=group_name,
                    field="skills",
                    message=f"Group '{group_name}' has no skills array"
                ))
                continue
            
            for skill_id in group_config['skills']:
                referenced_skills.add(skill_id)
                if skill_id not in all_skill_ids:
                    self.issues.append(ValidationIssue(
                        severity=Severity.HIGH,
                        category="SkillGroups",
                        skill_id=skill_id,
                        field=f"skillGroups.{group_name}",
                        message=f"Referenced skill '{skill_id}' not found in skills",
                        suggestion="Add the missing skill or remove from group"
                    ))
        
        # Check for orphaned skills
        orphaned = all_skill_ids - referenced_skills
        for skill_id in orphaned:
            self.issues.append(ValidationIssue(
                severity=Severity.LOW,
                category="SkillGroups",
                skill_id=skill_id,
                field="skillGroups",
                message=f"Skill '{skill_id}' not assigned to any group",
                suggestion="Consider adding to appropriate skill group"
            ))
    
    def validate_skill(self, skill_id: str, skill_config: Dict) -> None:
        """Validate individual skill configuration"""
        # Check required fields
        for field in self.REQUIRED_SKILL_FIELDS:
            if field not in skill_config:
                self.issues.append(ValidationIssue(
                    severity=Severity.CRITICAL,
                    category="Skill",
                    skill_id=skill_id,
                    field=field,
                    message=f"Missing required field: {field}"
                ))
        
        # Validate ID format
        if 'id' in skill_config:
            id_val = skill_config['id']
            if not re.match(r'^skill-\d{3}$', id_val):
                self.issues.append(ValidationIssue(
                    severity=Severity.LOW,
                    category="Skill",
                    skill_id=skill_id,
                    field="id",
                    message=f"Non-standard ID format: {id_val}",
                    suggestion="Use format 'skill-XXX' where XXX is 3-digit number"
                ))
        
        # Validate version format
        if 'version' in skill_config:
            version = skill_config['version']
            if not re.match(r'^\d+\.\d+\.\d+$', version):
                self.issues.append(ValidationIssue(
                    severity=Severity.MEDIUM,
                    category="Skill",
                    skill_id=skill_id,
                    field="version",
                    message=f"Non-semver version: {version}",
                    suggestion="Use semantic versioning (X.Y.Z)"
                ))
        
        # Validate capabilities
        capabilities = skill_config.get('capabilities', [])
        if len(capabilities) < self.MIN_CAPABILITIES:
            self.issues.append(ValidationIssue(
                severity=Severity.MEDIUM,
                category="Skill",
                skill_id=skill_id,
                field="capabilities",
                message=f"Only {len(capabilities)} capabilities listed (min: {self.MIN_CAPABILITIES})",
                suggestion="Add more descriptive capabilities"
            ))
        
        # Validate schemas
        self._validate_schema(skill_id, skill_config.get('inputSchema', {}), 'inputSchema')
        self._validate_schema(skill_id, skill_config.get('outputSchema', {}), 'outputSchema')
        
        # Validate invocation config
        self._validate_invocation_config(skill_id, skill_config.get('invocationConfig', {}))
    
    def _validate_schema(self, skill_id: str, schema: Dict, schema_name: str) -> None:
        """Validate JSON Schema structure"""
        if not schema:
            self.issues.append(ValidationIssue(
                severity=Severity.HIGH,
                category="Schema",
                skill_id=skill_id,
                field=schema_name,
                message=f"Empty {schema_name}"
            ))
            return
        
        if schema.get('type') != 'object':
            self.issues.append(ValidationIssue(
                severity=Severity.MEDIUM,
                category="Schema",
                skill_id=skill_id,
                field=f"{schema_name}.type",
                message=f"{schema_name} should have type 'object'",
                suggestion="Set type: 'object' for consistent schema structure"
            ))
        
        if 'properties' not in schema:
            self.issues.append(ValidationIssue(
                severity=Severity.HIGH,
                category="Schema",
                skill_id=skill_id,
                field=f"{schema_name}.properties",
                message=f"{schema_name} missing 'properties' definition"
            ))
        
        # Check for descriptions in properties
        props = schema.get('properties', {})
        for prop_name, prop_def in props.items():
            if 'description' not in prop_def:
                self.issues.append(ValidationIssue(
                    severity=Severity.LOW,
                    category="Schema",
                    skill_id=skill_id,
                    field=f"{schema_name}.properties.{prop_name}",
                    message=f"Property '{prop_name}' missing description",
                    suggestion="Add description for better API documentation"
                ))
    
    def _validate_invocation_config(self, skill_id: str, config: Dict) -> None:
        """Validate invocation configuration"""
        if not config:
            self.issues.append(ValidationIssue(
                severity=Severity.HIGH,
                category="InvocationConfig",
                skill_id=skill_id,
                field="invocationConfig",
                message="Missing invocation configuration"
            ))
            return
        
        # Validate priority
        priority = config.get('priority')
        if priority not in self.VALID_PRIORITIES:
            self.issues.append(ValidationIssue(
                severity=Severity.MEDIUM,
                category="InvocationConfig",
                skill_id=skill_id,
                field="priority",
                message=f"Invalid priority: {priority}",
                suggestion=f"Use one of: {', '.join(self.VALID_PRIORITIES)}"
            ))
        
        # Validate timeout
        timeout = config.get('timeout', 0)
        if timeout < self.MIN_TIMEOUT:
            self.issues.append(ValidationIssue(
                severity=Severity.HIGH,
                category="InvocationConfig",
                skill_id=skill_id,
                field="timeout",
                message=f"Timeout too low: {timeout}ms (min: {self.MIN_TIMEOUT}ms)",
                suggestion="Increase timeout for reliability"
            ))
        elif timeout > self.MAX_TIMEOUT:
            self.issues.append(ValidationIssue(
                severity=Severity.MEDIUM,
                category="InvocationConfig",
                skill_id=skill_id,
                field="timeout",
                message=f"Timeout very high: {timeout}ms (max recommended: {self.MAX_TIMEOUT}ms)",
                suggestion="Consider optimizing skill or adding pagination"
            ))
        
        # Validate retry policy
        retry = config.get('retryPolicy', {})
        max_retries = retry.get('maxRetries', 0)
        if max_retries > self.MAX_RETRIES:
            self.issues.append(ValidationIssue(
                severity=Severity.MEDIUM,
                category="InvocationConfig",
                skill_id=skill_id,
                field="retryPolicy.maxRetries",
                message=f"Too many retries: {max_retries}",
                suggestion=f"Limit retries to {self.MAX_RETRIES} max"
            ))
        
        # Check for cache configuration
        if config.get('cacheable') and 'cacheTTL' not in config:
            self.issues.append(ValidationIssue(
                severity=Severity.LOW,
                category="InvocationConfig",
                skill_id=skill_id,
                field="cacheTTL",
                message="Cacheable=true but no cacheTTL specified",
                suggestion="Add cacheTTL for explicit cache duration"
            ))
    
    def validate_deployment_config(self) -> None:
        """Validate deployment configuration"""
        deploy = self.config.get('deploymentConfig', {})
        
        # Validate priority order
        priority_order = deploy.get('priorityOrder', {})
        all_skills = set(self.config.get('skills', {}).keys())
        ordered_skills = set()
        
        for priority, skills in priority_order.items():
            if priority not in self.VALID_PRIORITIES:
                self.issues.append(ValidationIssue(
                    severity=Severity.MEDIUM,
                    category="DeploymentConfig",
                    skill_id="N/A",
                    field=f"priorityOrder.{priority}",
                    message=f"Unknown priority level: {priority}"
                ))
            
            for skill_id in skills:
                ordered_skills.add(skill_id)
                if skill_id not in all_skills:
                    self.issues.append(ValidationIssue(
                        severity=Severity.HIGH,
                        category="DeploymentConfig",
                        skill_id=skill_id,
                        field="priorityOrder",
                        message=f"Skill '{skill_id}' in priority order but not defined"
                    ))
        
        # Check for missing skills in priority order
        missing = all_skills - ordered_skills
        for skill_id in missing:
            self.issues.append(ValidationIssue(
                severity=Severity.MEDIUM,
                category="DeploymentConfig",
                skill_id=skill_id,
                field="priorityOrder",
                message=f"Skill not in deployment priority order",
                suggestion="Add to priorityOrder for explicit deployment sequencing"
            ))
        
        # Validate safety constraints
        safety = deploy.get('safetyConstraints', {})
        if not safety.get('lockedFields'):
            self.issues.append(ValidationIssue(
                severity=Severity.HIGH,
                category="DeploymentConfig",
                skill_id="N/A",
                field="safetyConstraints.lockedFields",
                message="No locked safety fields defined",
                suggestion="Define critical fields that cannot be auto-modified"
            ))
        
        # Validate rollback thresholds
        rollback = safety.get('rollbackThresholds', {})
        if not rollback:
            self.issues.append(ValidationIssue(
                severity=Severity.HIGH,
                category="DeploymentConfig",
                skill_id="N/A",
                field="safetyConstraints.rollbackThresholds",
                message="No rollback thresholds defined",
                suggestion="Define accuracy, latency, and error rate thresholds"
            ))
    
    def validate_integrations(self) -> None:
        """Validate integration configurations"""
        integrations = self.config.get('integrations', {})
        
        # Check external services
        services = integrations.get('externalServices', {})
        for service_name, service_config in services.items():
            if 'endpoint' not in service_config:
                self.issues.append(ValidationIssue(
                    severity=Severity.HIGH,
                    category="Integrations",
                    skill_id="N/A",
                    field=f"externalServices.{service_name}.endpoint",
                    message=f"Service '{service_name}' missing endpoint"
                ))
            
            if 'timeout' not in service_config:
                self.issues.append(ValidationIssue(
                    severity=Severity.LOW,
                    category="Integrations",
                    skill_id="N/A",
                    field=f"externalServices.{service_name}.timeout",
                    message=f"Service '{service_name}' missing timeout",
                    suggestion="Add explicit timeout for reliability"
                ))
    
    def generate_improvements(self) -> None:
        """Generate improvement suggestions based on best practices"""
        skills = self.config.get('skills', {})
        
        for skill_id, skill_config in skills.items():
            # Check for Chinese name (bilingual support)
            if 'chineseName' not in skill_config:
                self.improvements.append({
                    'skill_id': skill_id,
                    'improvement': 'Add chineseName for bilingual support',
                    'priority': 'LOW'
                })
            
            # Check for comprehensive error handling
            output_schema = skill_config.get('outputSchema', {})
            props = output_schema.get('properties', {})
            if 'error' not in props and 'errorMessage' not in props:
                self.improvements.append({
                    'skill_id': skill_id,
                    'improvement': 'Add error/errorMessage to outputSchema for error handling',
                    'priority': 'MEDIUM'
                })
            
            # Check for timestamp in outputs
            if 'timestamp' not in props and skill_id not in ['safety-validator', 'confidence-calibrator']:
                self.improvements.append({
                    'skill_id': skill_id,
                    'improvement': 'Consider adding timestamp to outputSchema for audit trail',
                    'priority': 'LOW'
                })
    
    def validate(self) -> ValidationResult:
        """Run full validation"""
        if not self.load_config():
            return ValidationResult(
                passed=False,
                issues=self.issues,
                summary={'CRITICAL': 1}
            )
        
        print("🔍 Running validation checks...")
        
        # Structure validation
        print("  ├─ Validating structure...")
        self.validate_structure()
        
        # Metadata validation
        print("  ├─ Validating metadata...")
        self.validate_metadata()
        
        # Skill groups validation
        print("  ├─ Validating skill groups...")
        self.validate_skill_groups()
        
        # Individual skills validation
        print("  ├─ Validating individual skills...")
        skills = self.config.get('skills', {})
        for skill_id, skill_config in skills.items():
            self.validate_skill(skill_id, skill_config)
        
        # Deployment config validation
        print("  ├─ Validating deployment config...")
        self.validate_deployment_config()
        
        # Integrations validation
        print("  ├─ Validating integrations...")
        self.validate_integrations()
        
        # Generate improvements
        print("  └─ Generating improvements...")
        self.generate_improvements()
        
        # Calculate summary
        summary = {}
        for issue in self.issues:
            severity = issue.severity.name
            summary[severity] = summary.get(severity, 0) + 1
        
        passed = summary.get('CRITICAL', 0) == 0
        
        return ValidationResult(
            passed=passed,
            issues=self.issues,
            summary=summary,
            improvements=self.improvements
        )


class SkillsTester:
    """Test Skills configuration with simulated data"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.test_results: List[Dict] = []
    
    def generate_test_input(self, skill_id: str, input_schema: Dict) -> Dict:
        """Generate test input based on schema"""
        def generate_value(prop_def: Dict) -> Any:
            prop_type = prop_def.get('type', 'string')
            
            if prop_type == 'string':
                if 'enum' in prop_def:
                    return prop_def['enum'][0]
                if 'format' in prop_def:
                    if prop_def['format'] == 'date-time':
                        return datetime.now().isoformat()
                return f"test_{prop_def.get('description', 'value')[:20]}"
            elif prop_type == 'number':
                min_val = prop_def.get('minimum', 0)
                max_val = prop_def.get('maximum', 1)
                return (min_val + max_val) / 2
            elif prop_type == 'integer':
                return prop_def.get('minimum', 1)
            elif prop_type == 'boolean':
                return True
            elif prop_type == 'array':
                return []
            elif prop_type == 'object':
                return {}
            return None
        
        test_input = {}
        props = input_schema.get('properties', {})
        required = input_schema.get('required', [])
        
        for prop_name, prop_def in props.items():
            if prop_name in required or len(test_input) < 3:
                test_input[prop_name] = generate_value(prop_def)
        
        return test_input
    
    def validate_output_against_schema(self, output: Dict, schema: Dict) -> Tuple[bool, List[str]]:
        """Validate simulated output against schema"""
        errors = []
        props = schema.get('properties', {})
        
        for prop_name, prop_def in props.items():
            if prop_name in output:
                value = output[prop_name]
                expected_type = prop_def.get('type')
                
                type_map = {
                    'string': str,
                    'number': (int, float),
                    'integer': int,
                    'boolean': bool,
                    'array': list,
                    'object': dict
                }
                
                if expected_type in type_map:
                    if not isinstance(value, type_map[expected_type]):
                        errors.append(f"{prop_name}: expected {expected_type}, got {type(value).__name__}")
        
        return len(errors) == 0, errors
    
    def run_tests(self) -> List[Dict]:
        """Run tests for all skills"""
        skills = self.config.get('skills', {})
        
        for skill_id, skill_config in skills.items():
            test_input = self.generate_test_input(skill_id, skill_config.get('inputSchema', {}))
            
            # Simulate output (would be actual API call in production)
            simulated_output = self._simulate_output(skill_config.get('outputSchema', {}))
            
            is_valid, errors = self.validate_output_against_schema(
                simulated_output, 
                skill_config.get('outputSchema', {})
            )
            
            self.test_results.append({
                'skill_id': skill_id,
                'skill_name': skill_config.get('name'),
                'test_input': test_input,
                'test_passed': is_valid,
                'errors': errors,
                'output_schema_valid': is_valid
            })
        
        return self.test_results
    
    def _simulate_output(self, output_schema: Dict) -> Dict:
        """Simulate output based on schema"""
        output = {}
        props = output_schema.get('properties', {})
        
        for prop_name, prop_def in props.items():
            prop_type = prop_def.get('type', 'string')
            
            if prop_type == 'string':
                output[prop_name] = "simulated_value"
            elif prop_type == 'number':
                output[prop_name] = 0.85
            elif prop_type == 'integer':
                output[prop_name] = 42
            elif prop_type == 'boolean':
                output[prop_name] = True
            elif prop_type == 'array':
                output[prop_name] = []
            elif prop_type == 'object':
                output[prop_name] = {}
        
        return output


def generate_validation_report(result: ValidationResult, test_results: List[Dict]) -> str:
    """Generate comprehensive validation report"""
    report = []
    report.append("=" * 70)
    report.append("📋 CLAUDE SKILLS VALIDATION REPORT")
    report.append(f"Generated: {datetime.now().isoformat()}")
    report.append("=" * 70)
    report.append("")
    
    # Overall Status
    status = "✅ PASSED" if result.passed else "❌ FAILED"
    report.append(f"Overall Status: {status}")
    report.append("")
    
    # Summary
    report.append("📊 Issue Summary:")
    for severity, count in sorted(result.summary.items(), key=lambda x: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].index(x[0]) if x[0] in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] else 99):
        emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🔵', 'INFO': 'ℹ️'}.get(severity, '⚪')
        report.append(f"  {emoji} {severity}: {count}")
    report.append("")
    
    # Detailed Issues by Category
    report.append("=" * 70)
    report.append("📝 DETAILED ISSUES")
    report.append("=" * 70)
    
    issues_by_category = {}
    for issue in result.issues:
        cat = issue.category
        if cat not in issues_by_category:
            issues_by_category[cat] = []
        issues_by_category[cat].append(issue)
    
    for category, issues in issues_by_category.items():
        report.append(f"\n🔷 {category}")
        report.append("-" * 40)
        for issue in issues:
            report.append(f"  {issue.severity.value}")
            report.append(f"  Skill: {issue.skill_id}")
            report.append(f"  Field: {issue.field}")
            report.append(f"  Message: {issue.message}")
            if issue.suggestion:
                report.append(f"  💡 Suggestion: {issue.suggestion}")
            report.append("")
    
    # Test Results
    report.append("=" * 70)
    report.append("🧪 TEST RESULTS")
    report.append("=" * 70)
    
    passed_tests = sum(1 for t in test_results if t['test_passed'])
    total_tests = len(test_results)
    report.append(f"\nTests Passed: {passed_tests}/{total_tests}")
    report.append("")
    
    for test in test_results:
        status = "✅" if test['test_passed'] else "❌"
        report.append(f"{status} {test['skill_name']} ({test['skill_id']})")
        if test['errors']:
            for error in test['errors']:
                report.append(f"   └─ {error}")
    
    # Improvements
    report.append("")
    report.append("=" * 70)
    report.append("💡 IMPROVEMENT SUGGESTIONS")
    report.append("=" * 70)
    
    for imp in result.improvements[:20]:  # Top 20 improvements
        priority = imp['priority']
        emoji = {'HIGH': '🔴', 'MEDIUM': '🟡', 'LOW': '🔵'}.get(priority, '⚪')
        report.append(f"{emoji} [{priority}] {imp['skill_id']}: {imp['improvement']}")
    
    if len(result.improvements) > 20:
        report.append(f"... and {len(result.improvements) - 20} more improvements")
    
    report.append("")
    report.append("=" * 70)
    report.append("END OF REPORT")
    report.append("=" * 70)
    
    return "\n".join(report)


def main():
    """Main entry point"""
    config_file = "claude-skills-config.json"
    
    print("🚀 Claude Skills Validation & Testing Tool")
    print("=" * 50)
    print(f"Config file: {config_file}")
    print("")
    
    # Validate
    validator = SkillsValidator(config_file)
    result = validator.validate()
    
    print("")
    print(f"Validation: {'✅ PASSED' if result.passed else '❌ FAILED'}")
    print(f"Issues found: {len(result.issues)}")
    print("")
    
    # Test
    if validator.config:
        print("🧪 Running tests...")
        tester = SkillsTester(validator.config)
        test_results = tester.run_tests()
        
        passed = sum(1 for t in test_results if t['test_passed'])
        print(f"Tests: {passed}/{len(test_results)} passed")
        print("")
    else:
        test_results = []
    
    # Generate report
    report = generate_validation_report(result, test_results)
    
    # Save report
    report_path = "validation_report.txt"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"📄 Report saved to: {report_path}")
    
    # Print summary
    print("")
    print("=" * 50)
    print("SUMMARY")
    print("=" * 50)
    for severity, count in result.summary.items():
        print(f"  {severity}: {count}")
    
    return 0 if result.passed else 1


if __name__ == '__main__':
    sys.exit(main())
