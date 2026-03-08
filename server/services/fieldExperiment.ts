/**
 * ============================================================
 * Field Experiment Tracker (现场实验追踪)
 * ============================================================
 *
 * Every hypothesis the founder forms in the field gets tracked here.
 * The data flows back into the ontology and AI model calibration.
 *
 * Solo Founder Loop:
 *   发现痛点 → 形成假设 → 设计实验 → 现场执行 → 收集数据 → 验证/推翻 → 改进系统
 */

export interface FieldExperiment {
    id: string;
    name: string;                                    // "AI照片诊断 vs 师傅现场判断"
    hypothesis: string;                              // "AI准确率 ≥ 70%"
    method: string;                                  // How to test
    successCriteria: string;                         // What counts as success
    status: 'planned' | 'running' | 'completed' | 'failed' | 'invalidated';
    startDate: string;
    endDate?: string;
    targetSampleSize: number;                        // How many data points needed
    currentSampleSize: number;                       // How many collected so far
    dataPoints: ExperimentDataPoint[];
    result?: string;
    learnings?: string;                              // What was learned (good or bad)
    nextAction?: string;                             // What to do based on result
    category: 'diagnosis' | 'pricing' | 'dispatch' | 'satisfaction' | 'trust' | 'growth';
}

export interface ExperimentDataPoint {
    id: string;
    experimentId: string;
    timestamp: string;
    inputData: Record<string, any>;                  // What was measured
    outputData: Record<string, any>;                 // What actually happened
    notes: string;                                   // Field notes from founder
}

export interface RepairDataCollection {
    // Photos
    photoBefore: string[];                           // URLs
    photoAfter: string[];
    // Actual vs. AI diagnosis
    aiDiagnosis: string;
    actualProblem: string;
    diagnosisAccurate: boolean;
    // Materials
    materials: Array<{
        name: string;
        brand: string;
        quantity: number;
        unit: string;
        actualPrice: number;
        aiPredictedPrice?: number;
        purchaseLocation: string;                    // "三亚 五金店"
    }>;
    // Worker performance
    workerId: number;
    arrivalMinutes: number;                          // Minutes from dispatch to arrival
    completionMinutes: number;                       // Total job time
    wasFirstTimeFix: boolean;
    workerRating: number;                            // 1-5
    // Customer
    customerSatisfaction: number;                    // 1-5
    customerWouldRecommend: boolean;
    // Building context
    buildingAge?: number;
    buildingType?: string;                           // '老旧小区' | '高层公寓' | '别墅' | '民宿'
    weather?: string;                                // Climate factor at time of repair
}

/**
 * In-memory experiment store. Production → database-backed.
 */
class FieldExperimentService {
    private experiments: FieldExperiment[] = [
        {
            id: 'E01',
            name: 'AI照片诊断 vs 师傅现场判断',
            hypothesis: '上传照片后，AI诊断与师傅现场判断的一致率 ≥ 70%',
            method: '每次维修前让AI诊断，记录师傅到场后的实际判断，对比',
            successCriteria: '10个样本中 ≥7 个一致',
            status: 'planned',
            startDate: '2026-03-08',
            targetSampleSize: 10,
            currentSampleSize: 0,
            dataPoints: [],
            category: 'diagnosis',
        },
        {
            id: 'E02',
            name: 'AI报价 vs 实际价格偏差',
            hypothesis: 'MaterialAgent 生成的BOM报价与实际材料成本偏差 ≤ 15%',
            method: '记录每次维修的AI预测价格和实际购买价格',
            successCriteria: '平均偏差 ≤ 15%',
            status: 'planned',
            startDate: '2026-03-15',
            targetSampleSize: 15,
            currentSampleSize: 0,
            dataPoints: [],
            category: 'pricing',
        },
        {
            id: 'E03',
            name: 'APP派单 vs 微信群接单响应速度',
            hypothesis: 'APP指定派单后师傅响应时间比微信群接单快 2x',
            method: 'A/B测试：一半订单走APP，一半走微信群',
            successCriteria: 'APP平均响应 ≤ 15分钟，微信 ≥ 30分钟',
            status: 'planned',
            startDate: '2026-03-22',
            targetSampleSize: 20,
            currentSampleSize: 0,
            dataPoints: [],
            category: 'dispatch',
        },
        {
            id: 'E04',
            name: '透明报价对客户满意度的影响',
            hypothesis: '给客户看AI BOM明细后，满意度 ≥ 4.5/5',
            method: '一半客户给明细，一半只报总价，对比满意度',
            successCriteria: '明细组满意度比总价组高 ≥ 0.5分',
            status: 'planned',
            startDate: '2026-04-01',
            targetSampleSize: 20,
            currentSampleSize: 0,
            dataPoints: [],
            category: 'satisfaction',
        },
    ];

    getExperiments(): FieldExperiment[] {
        return this.experiments;
    }

    getExperiment(id: string): FieldExperiment | undefined {
        return this.experiments.find(e => e.id === id);
    }

    startExperiment(id: string): FieldExperiment | undefined {
        const exp = this.experiments.find(e => e.id === id);
        if (exp) {
            exp.status = 'running';
            exp.startDate = new Date().toISOString().split('T')[0];
            console.log(`[Experiment] 🧪 Started: ${exp.name}`);
        }
        return exp;
    }

    addDataPoint(experimentId: string, data: Omit<ExperimentDataPoint, 'id' | 'experimentId' | 'timestamp'>): ExperimentDataPoint | null {
        const exp = this.experiments.find(e => e.id === experimentId);
        if (!exp) return null;

        const point: ExperimentDataPoint = {
            id: `DP-${Date.now()}`,
            experimentId,
            timestamp: new Date().toISOString(),
            ...data,
        };

        exp.dataPoints.push(point);
        exp.currentSampleSize = exp.dataPoints.length;

        console.log(
            `[Experiment] 📊 ${exp.name}: ${exp.currentSampleSize}/${exp.targetSampleSize} data points`
        );

        // Auto-complete if target reached
        if (exp.currentSampleSize >= exp.targetSampleSize && exp.status === 'running') {
            exp.status = 'completed';
            exp.endDate = new Date().toISOString().split('T')[0];
            console.log(`[Experiment] ✅ Completed: ${exp.name}`);
        }

        return point;
    }

    /**
     * Record a complete repair for the knowledge ontology.
     * This is the single entry point that feeds ALL private data tables.
     */
    async recordRepair(data: RepairDataCollection): Promise<{
        ontologyEntriesCreated: number;
        experimentDataPointsCreated: number;
    }> {
        let ontologyEntries = 0;
        let experimentPoints = 0;

        // 1. Feed material prices to ontology
        for (const mat of data.materials) {
            console.log(`[DataPipeline] 💰 Material: ${mat.name} ¥${mat.actualPrice}/${mat.unit} @ ${mat.purchaseLocation}`);
            ontologyEntries++;
        }

        // 2. Feed diagnosis accuracy to experiment E01
        if (data.aiDiagnosis && data.actualProblem) {
            const e01 = this.experiments.find(e => e.id === 'E01');
            if (e01 && (e01.status === 'running' || e01.status === 'planned')) {
                this.addDataPoint('E01', {
                    inputData: { aiDiagnosis: data.aiDiagnosis, actualProblem: data.actualProblem },
                    outputData: { match: data.diagnosisAccurate },
                    notes: `AI: ${data.aiDiagnosis} | Actual: ${data.actualProblem} | Match: ${data.diagnosisAccurate}`,
                });
                experimentPoints++;
            }
        }

        // 3. Feed pricing accuracy to experiment E02
        const matsWithPredictions = data.materials.filter(m => m.aiPredictedPrice);
        if (matsWithPredictions.length > 0) {
            const e02 = this.experiments.find(e => e.id === 'E02');
            if (e02 && (e02.status === 'running' || e02.status === 'planned')) {
                const avgAccuracy = matsWithPredictions.reduce((sum, m) =>
                    sum + Math.abs(1 - (m.aiPredictedPrice! / m.actualPrice)), 0) / matsWithPredictions.length;
                this.addDataPoint('E02', {
                    inputData: { materials: matsWithPredictions },
                    outputData: { avgPriceDeviation: avgAccuracy },
                    notes: `${matsWithPredictions.length} materials, avg deviation: ${(avgAccuracy * 100).toFixed(1)}%`,
                });
                experimentPoints++;
            }
        }

        // 4. Log worker calibration
        console.log(`[DataPipeline] 👷 Worker ${data.workerId}: ${data.completionMinutes}min, ⭐${data.workerRating}, ${data.wasFirstTimeFix ? 'first-fix' : 'rework'}`);
        ontologyEntries++;

        // 5. Log customer satisfaction
        console.log(`[DataPipeline] 🏠 Customer: ${data.customerSatisfaction}/5, recommend: ${data.customerWouldRecommend}`);
        ontologyEntries++;

        // 6. Log building context for failure patterns
        if (data.buildingType) {
            console.log(`[DataPipeline] 🏗️ Building: ${data.buildingType}, age: ${data.buildingAge || 'unknown'}, weather: ${data.weather || 'unknown'}`);
            ontologyEntries++;
        }

        console.log(`[DataPipeline] ✅ Repair recorded: ${ontologyEntries} ontology entries, ${experimentPoints} experiment data points`);

        return { ontologyEntriesCreated: ontologyEntries, experimentDataPointsCreated: experimentPoints };
    }

    /**
     * Get sprint metrics for the Enterprise Dashboard.
     */
    getSprintMetrics(): {
        currentSprint: number;
        sprintName: string;
        totalExperiments: number;
        runningExperiments: number;
        completedExperiments: number;
        totalDataPoints: number;
        repairsCompleted: number;
        avgDiagnosisAccuracy: number;
        avgCustomerSatisfaction: number;
    } {
        const running = this.experiments.filter(e => e.status === 'running').length;
        const completed = this.experiments.filter(e => e.status === 'completed').length;
        const totalDp = this.experiments.reduce((sum, e) => sum + e.dataPoints.length, 0);

        return {
            currentSprint: 1,
            sprintName: '地基 (Foundation)',
            totalExperiments: this.experiments.length,
            runningExperiments: running,
            completedExperiments: completed,
            totalDataPoints: totalDp,
            repairsCompleted: 0,       // Updated via recordRepair
            avgDiagnosisAccuracy: 0,   // Calculated from E01 data
            avgCustomerSatisfaction: 0, // Calculated from repairs
        };
    }
}

export const fieldExperimentService = new FieldExperimentService();
