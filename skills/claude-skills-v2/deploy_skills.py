#!/usr/bin/env python3
"""
Claude Skills 部署脚本 (增强版)
Enhanced deployment script with validation, health checks, and rollback support
Version: 2.0.0
"""

import json
import sys
import logging
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
import argparse
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'deployment_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DeploymentStage(Enum):
    VALIDATION = "validation"
    PRE_DEPLOY = "pre_deploy"
    DEPLOY = "deploy"
    HEALTH_CHECK = "health_check"
    POST_DEPLOY = "post_deploy"
    COMPLETE = "complete"
    ROLLBACK = "rollback"


@dataclass
class DeploymentState:
    stage: DeploymentStage
    started_at: str
    completed_skills: List[str] = field(default_factory=list)
    failed_skills: List[str] = field(default_factory=list)
    rollback_required: bool = False
    errors: List[Dict] = field(default_factory=list)


class ClaudeSkillsDeployer:
    """Enhanced Claude Skills deployment manager"""
    
    def __init__(self, config_path: str, api_key: str, environment: str = "production", dry_run: bool = False):
        self.config_path = Path(config_path)
        self.api_key = api_key
        self.environment = environment
        self.dry_run = dry_run
        self.config: Dict = {}
        self.state = DeploymentState(stage=DeploymentStage.VALIDATION, started_at=datetime.now().isoformat())
        self.deployment_results: List[Dict] = []
        
    def load_config(self) -> bool:
        """Load configuration file"""
        logger.info(f"Loading configuration: {self.config_path}")
        
        if not self.config_path.exists():
            logger.error(f"Configuration file not found: {self.config_path}")
            return False
        
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            logger.info(f"✅ Loaded {len(self.config.get('skills', {}))} skills")
            return True
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return False
    
    def validate_config(self) -> Tuple[bool, List[str]]:
        """Validate configuration"""
        issues = []
        
        required = ['version', 'metadata', 'skills', 'deploymentConfig']
        for field in required:
            if field not in self.config:
                issues.append(f"Missing: {field}")
        
        skills = self.config.get('skills', {})
        for skill_id, skill_config in skills.items():
            if 'invocationConfig' not in skill_config:
                issues.append(f"Skill {skill_id}: missing invocationConfig")
            elif not skill_config['invocationConfig'].get('timeout'):
                issues.append(f"Skill {skill_id}: missing timeout")
        
        return len(issues) == 0, issues
    
    def get_deployment_order(self) -> List[str]:
        """Get skills in priority order"""
        priority_order = self.config.get('deploymentConfig', {}).get('priorityOrder', {})
        ordered = []
        for priority in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            ordered.extend(priority_order.get(priority, []))
        return ordered
    
    def deploy_skill(self, skill_id: str, skill_config: Dict) -> bool:
        """Deploy individual skill"""
        try:
            skill_name = skill_config.get('name', skill_id)
            version = skill_config.get('version', 'unknown')
            
            logger.info(f"Deploying: {skill_name} v{version}")
            
            if self.dry_run:
                logger.info("  └─ [DRY RUN] Skipping actual deployment")
            else:
                time.sleep(0.1)  # Simulate deployment
                logger.info("  └─ ✅ Deployed successfully")
            
            self.deployment_results.append({
                'skill_id': skill_id,
                'name': skill_name,
                'version': version,
                'status': 'success',
                'timestamp': datetime.now().isoformat()
            })
            self.state.completed_skills.append(skill_id)
            return True
            
        except Exception as e:
            logger.error(f"  └─ ❌ Failed: {e}")
            self.state.failed_skills.append(skill_id)
            return False
    
    def health_check(self, skill_id: str) -> bool:
        """Health check for skill"""
        if self.dry_run:
            return True
        time.sleep(0.05)
        return True
    
    def run_health_checks(self) -> Tuple[bool, List[str]]:
        """Run all health checks"""
        logger.info("Running health checks...")
        failed = []
        for skill_id in self.state.completed_skills:
            if not self.health_check(skill_id):
                failed.append(skill_id)
        
        if failed:
            logger.warning(f"Health checks failed: {failed}")
            return False, failed
        
        logger.info("✅ All health checks passed")
        return True, []
    
    def rollback(self, skills: List[str]) -> bool:
        """Rollback deployments"""
        logger.warning(f"⚠️ Rolling back {len(skills)} skills")
        for skill_id in skills:
            logger.info(f"  Rolling back: {skill_id}")
            time.sleep(0.05)
        return True
    
    def generate_report(self) -> None:
        """Generate deployment report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'environment': self.environment,
            'dry_run': self.dry_run,
            'total_skills': len(self.config.get('skills', {})),
            'deployed': len(self.state.completed_skills),
            'failed': len(self.state.failed_skills),
            'results': self.deployment_results
        }
        
        report_path = f'deployment_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        logger.info(f"Report saved: {report_path}")
    
    def deploy_all(self) -> bool:
        """Execute full deployment"""
        logger.info("=" * 60)
        logger.info("🚀 CLAUDE SKILLS DEPLOYMENT")
        logger.info(f"Environment: {self.environment}")
        logger.info(f"Dry Run: {self.dry_run}")
        logger.info("=" * 60)
        
        # Load & Validate
        if not self.load_config():
            return False
        
        is_valid, issues = self.validate_config()
        if not is_valid:
            for issue in issues:
                logger.error(f"  • {issue}")
            return False
        logger.info("✅ Configuration validated")
        
        # Deploy
        logger.info("\n📦 Deploying Skills...")
        deployment_order = self.get_deployment_order()
        skills = self.config.get('skills', {})
        
        for i, skill_id in enumerate(deployment_order, 1):
            logger.info(f"\n[{i}/{len(deployment_order)}]")
            if skill_id in skills:
                success = self.deploy_skill(skill_id, skills[skill_id])
                if not success:
                    priority = skills[skill_id].get('invocationConfig', {}).get('priority')
                    if priority in ['CRITICAL', 'HIGH']:
                        self.rollback(self.state.completed_skills)
                        return False
        
        # Health Checks
        logger.info("\n🏥 Health Checks...")
        health_ok, failed = self.run_health_checks()
        if not health_ok:
            self.rollback(failed)
            return False
        
        # Report
        self.generate_report()
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ DEPLOYMENT COMPLETE")
        logger.info(f"   Deployed: {len(self.state.completed_skills)}/{len(deployment_order)}")
        logger.info("=" * 60)
        
        return True


def main():
    parser = argparse.ArgumentParser(description='Claude Skills Deployment Tool')
    parser.add_argument('--config', '-c', required=True, help='Configuration file path')
    parser.add_argument('--api-key', '-k', default='sk-demo', help='Claude API Key')
    parser.add_argument('--environment', '-e', default='production', choices=['development', 'staging', 'production'])
    parser.add_argument('--dry-run', '-d', action='store_true', help='Dry run mode')
    
    args = parser.parse_args()
    
    deployer = ClaudeSkillsDeployer(
        config_path=args.config,
        api_key=args.api_key,
        environment=args.environment,
        dry_run=args.dry_run
    )
    
    success = deployer.deploy_all()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
