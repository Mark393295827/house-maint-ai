import React, { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import EnterpriseLayout from '../components/EnterpriseLayout';
import EnterpriseMap, { type WorkerStatusSummary } from '../components/EnterpriseMap';
import { getOperatingStageCopies, type OperatingStageCopy } from '../constants/operatingModel';
import { useLanguage } from '../i18n/LanguageContext';
import EnterpriseAIConfigPage from './EnterpriseAIConfigPage';
import { AnalyticsPage, EnterpriseWorkersPage, PropertiesPage, TicketsPage } from './EnterprisePlaceholders';

type TimeRange = 'today' | 'week' | 'month';
type Region = 'all' | 'haitang' | 'jiyang' | 'tianya' | 'yazhou';
type PropertyType = 'all' | 'residential' | 'resort' | 'commercial';
type TicketStatus = 'all' | 'open' | 'in_progress' | 'overdue' | 'completed';
type StageId = OperatingStageCopy['id'];
type Category = 'all' | 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural';
type LocalizedText = { zh: string; en: string };

interface TrendPoint {
    label: LocalizedText;
    current: number;
    previous: number;
}

interface WorkOrder {
    id: string;
    title: LocalizedText;
    property: LocalizedText;
    propertyType: Exclude<PropertyType, 'all'>;
    region: Exclude<Region, 'all'>;
    category: Exclude<Category, 'all'>;
    stage: StageId;
    priority: 'critical' | 'high' | 'medium';
    slaMinutes: number;
    assignee: LocalizedText;
    status: Exclude<TicketStatus, 'all'>;
}

interface RegionPerformance {
    id: Exclude<Region, 'all'>;
    name: LocalizedText;
    tickets: number;
    sla: number;
    deflection: number;
    cycle: number;
}

interface KpiMetric {
    label: string;
    value: string;
    unit?: string;
    change: string;
    context: string;
    direction: 'up' | 'down';
    favorable: boolean;
    icon: string;
    tone: 'blue' | 'teal' | 'amber' | 'violet' | 'red';
}

const COPY = {
    zh: {
        eyebrow: '三亚资产组合 · 运营指挥台',
        title: '物业运营总览',
        subtitle: '聚合报修、诊断、分流、派单、验收与业主报表的实时经营视图',
        live: '实时数据',
        demo: '演示数据集',
        refreshed: '更新于',
        refresh: '刷新数据',
        export: '导出当前视图',
        filters: '全局筛选',
        region: '区域',
        property: '物业类型',
        status: '工单状态',
        reset: '重置筛选',
        ranges: { today: '今日', week: '近 7 天', month: '近 30 天' },
        regions: { all: '全部区域', haitang: '海棠区', jiyang: '吉阳区', tianya: '天涯区', yazhou: '崖州区' },
        properties: { all: '全部物业', residential: '住宅社区', resort: '酒店度假', commercial: '商业物业' },
        statuses: { all: '全部状态', open: '待处理', in_progress: '处理中', overdue: '已超时', completed: '已完成' },
        kpis: {
            intake: '接入工单', intakeContext: '所有渠道新建工单',
            sla: 'SLA 达成率', slaContext: '目标 92.0%',
            accuracy: 'AI 诊断准确率', accuracyContext: 'Top 10 故障品类',
            deflection: 'DIY 分流率', deflectionContext: '目标 20.0%',
            cycle: '平均维修周期', cycleContext: '从接入到验收',
        },
        versus: '较上一周期',
        trendTitle: '工单流入与完成趋势',
        trendSubtitle: '按所选范围汇总；虚线为上一周期',
        incoming: '流入工单',
        completed: '完成工单',
        previous: '上一周期',
        aiTitle: 'AI 运营洞察',
        aiSubtitle: '基于当前筛选范围自动识别',
        aiBadge: '3 项待关注',
        insights: [
            { title: '天涯区派单等待时间上升', detail: '水暖类平均等待 18 分钟，较组合均值高 31%。', tone: 'warning' },
            { title: 'DIY 分流超过目标', detail: '低风险电路问题分流率达到 24.8%，预计节省 ¥12,640。', tone: 'positive' },
            { title: '7 个工单需要人工复核', detail: '诊断置信度低于 78%，已进入责任判断队列。', tone: 'neutral' },
        ],
        viewTickets: '查看相关工单',
        workflowTitle: '六阶段运营闭环',
        workflowSubtitle: '点击阶段筛选下方工单；数量表示当前范围内进入该阶段的工单',
        mapTitle: '实时运维地图',
        mapSubtitle: '技师位置、服务状态与当前派单区域',
        mapLive: '实时',
        mapRepairing: '维修中',
        mapIdle: '待命',
        mapExpand: '展开地图',
        mapCollapse: '收起地图',
        stageCount: '工单',
        selected: '已筛选',
        clearStage: '清除阶段筛选',
        categoryTitle: '报修品类构成',
        categorySubtitle: '点击品类联动异常工单队列',
        categories: { all: '全部品类', plumbing: '水暖', electrical: '电路', hvac: '暖通空调', appliance: '家电', structural: '结构' },
        regionTitle: '区域服务表现',
        regionSubtitle: 'SLA、分流率与平均维修周期对比',
        tableRegion: '区域',
        tableTickets: '工单量',
        tableSla: 'SLA',
        tableDeflection: '分流率',
        tableCycle: '维修周期',
        queueTitle: 'SLA 异常工单',
        queueSubtitle: '按风险与剩余响应时间排序',
        queueCount: '条记录',
        columns: { id: '工单', issue: '问题 / 物业', stage: '当前阶段', priority: '优先级', sla: 'SLA 剩余', assignee: '负责人', status: '状态' },
        priority: { critical: '紧急', high: '高', medium: '中' },
        overdue: '已超时',
        minutes: '分钟',
        empty: '当前筛选范围内没有异常工单',
        activeFilters: '当前筛选',
    },
    en: {
        eyebrow: 'Sanya portfolio · Operations command',
        title: 'Property Operations Overview',
        subtitle: 'A live operating view across intake, diagnosis, deflection, dispatch, verification, and owner reporting',
        live: 'Live data',
        demo: 'Demo dataset',
        refreshed: 'Updated',
        refresh: 'Refresh data',
        export: 'Export current view',
        filters: 'Global filters',
        region: 'Region',
        property: 'Property type',
        status: 'Ticket status',
        reset: 'Reset filters',
        ranges: { today: 'Today', week: 'Last 7 days', month: 'Last 30 days' },
        regions: { all: 'All regions', haitang: 'Haitang', jiyang: 'Jiyang', tianya: 'Tianya', yazhou: 'Yazhou' },
        properties: { all: 'All properties', residential: 'Residential', resort: 'Resort', commercial: 'Commercial' },
        statuses: { all: 'All statuses', open: 'Open', in_progress: 'In progress', overdue: 'Overdue', completed: 'Completed' },
        kpis: {
            intake: 'Tickets received', intakeContext: 'New tickets across channels',
            sla: 'SLA attainment', slaContext: 'Target 92.0%',
            accuracy: 'AI diagnosis accuracy', accuracyContext: 'Top 10 issue categories',
            deflection: 'DIY deflection', deflectionContext: 'Target 20.0%',
            cycle: 'Average repair cycle', cycleContext: 'Intake to verification',
        },
        versus: 'vs previous period',
        trendTitle: 'Ticket intake and completion trend',
        trendSubtitle: 'Aggregated for the selected window; dashed line is the prior period',
        incoming: 'Tickets received',
        completed: 'Tickets completed',
        previous: 'Previous period',
        aiTitle: 'AI operating insights',
        aiSubtitle: 'Automatically detected in the current scope',
        aiBadge: '3 items to review',
        insights: [
            { title: 'Dispatch wait is rising in Tianya', detail: 'Plumbing wait time is 18 minutes, 31% above the portfolio average.', tone: 'warning' },
            { title: 'DIY deflection is above target', detail: 'Low-risk electrical issues reached 24.8%, saving an estimated RMB12,640.', tone: 'positive' },
            { title: '7 tickets require human review', detail: 'Diagnosis confidence is below 78% and queued for liability review.', tone: 'neutral' },
        ],
        viewTickets: 'View related tickets',
        workflowTitle: 'Six-stage operating loop',
        workflowSubtitle: 'Select a stage to filter the queue below; counts show tickets entering each stage',
        mapTitle: 'Live operations map',
        mapSubtitle: 'Technician locations, service status, and active dispatch areas',
        mapLive: 'Live',
        mapRepairing: 'Repairing',
        mapIdle: 'Standby',
        mapExpand: 'Expand map',
        mapCollapse: 'Collapse map',
        stageCount: 'tickets',
        selected: 'Filtered',
        clearStage: 'Clear stage filter',
        categoryTitle: 'Issue category mix',
        categorySubtitle: 'Select a category to update the exception queue',
        categories: { all: 'All categories', plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'HVAC', appliance: 'Appliance', structural: 'Structural' },
        regionTitle: 'Regional service performance',
        regionSubtitle: 'Compare SLA, deflection, and average repair cycle',
        tableRegion: 'Region',
        tableTickets: 'Tickets',
        tableSla: 'SLA',
        tableDeflection: 'Deflection',
        tableCycle: 'Repair cycle',
        queueTitle: 'SLA exception queue',
        queueSubtitle: 'Sorted by risk and remaining response time',
        queueCount: 'records',
        columns: { id: 'Ticket', issue: 'Issue / property', stage: 'Current stage', priority: 'Priority', sla: 'SLA remaining', assignee: 'Owner', status: 'Status' },
        priority: { critical: 'Critical', high: 'High', medium: 'Medium' },
        overdue: 'overdue',
        minutes: 'min',
        empty: 'No exception tickets match the current filters',
        activeFilters: 'Active filters',
    },
} as const;

const TREND_SERIES: Record<TimeRange, TrendPoint[]> = {
    today: [
        { label: { zh: '08时', en: '08:00' }, current: 32, previous: 28 },
        { label: { zh: '10时', en: '10:00' }, current: 48, previous: 36 },
        { label: { zh: '12时', en: '12:00' }, current: 41, previous: 44 },
        { label: { zh: '14时', en: '14:00' }, current: 67, previous: 52 },
        { label: { zh: '16时', en: '16:00' }, current: 58, previous: 56 },
        { label: { zh: '18时', en: '18:00' }, current: 74, previous: 63 },
        { label: { zh: '20时', en: '20:00' }, current: 69, previous: 61 },
        { label: { zh: '22时', en: '22:00' }, current: 86, previous: 72 },
    ],
    week: [
        { label: { zh: '周一', en: 'Mon' }, current: 318, previous: 294 },
        { label: { zh: '周二', en: 'Tue' }, current: 342, previous: 326 },
        { label: { zh: '周三', en: 'Wed' }, current: 386, previous: 354 },
        { label: { zh: '周四', en: 'Thu' }, current: 401, previous: 372 },
        { label: { zh: '周五', en: 'Fri' }, current: 428, previous: 405 },
        { label: { zh: '周六', en: 'Sat' }, current: 447, previous: 414 },
        { label: { zh: '周日', en: 'Sun' }, current: 463, previous: 426 },
    ],
    month: [
        { label: { zh: '第 1 周', en: 'Week 1' }, current: 1380, previous: 1260 },
        { label: { zh: '第 2 周', en: 'Week 2' }, current: 1510, previous: 1390 },
        { label: { zh: '第 3 周', en: 'Week 3' }, current: 1470, previous: 1435 },
        { label: { zh: '第 4 周', en: 'Week 4' }, current: 1690, previous: 1510 },
    ],
};

const REGION_FACTORS: Record<Region, number> = { all: 1, haitang: 0.34, jiyang: 0.29, tianya: 0.22, yazhou: 0.15 };
const PROPERTY_FACTORS: Record<PropertyType, number> = { all: 1, residential: 0.44, resort: 0.36, commercial: 0.2 };
const STATUS_FACTORS: Record<TicketStatus, number> = { all: 1, open: 0.31, in_progress: 0.26, overdue: 0.08, completed: 0.35 };

const WORKFLOW_COUNTS: Record<StageId, number> = {
    intake: 2785,
    diagnosis: 2634,
    deflection: 596,
    dispatch: 1831,
    verification: 1654,
    reporting: 1518,
};

const CATEGORY_COUNTS: Record<Exclude<Category, 'all'>, number> = {
    plumbing: 914,
    electrical: 627,
    hvac: 512,
    appliance: 438,
    structural: 294,
};

const REGION_PERFORMANCE: RegionPerformance[] = [
    { id: 'haitang', name: { zh: '海棠区', en: 'Haitang' }, tickets: 948, sla: 96.2, deflection: 23.1, cycle: 3.4 },
    { id: 'jiyang', name: { zh: '吉阳区', en: 'Jiyang' }, tickets: 808, sla: 94.7, deflection: 21.8, cycle: 3.7 },
    { id: 'tianya', name: { zh: '天涯区', en: 'Tianya' }, tickets: 613, sla: 88.9, deflection: 17.4, cycle: 4.6 },
    { id: 'yazhou', name: { zh: '崖州区', en: 'Yazhou' }, tickets: 416, sla: 92.8, deflection: 20.2, cycle: 4.1 },
];

const WORK_ORDERS: WorkOrder[] = [
    { id: 'HM-240718', title: { zh: '主卫天花板持续渗水', en: 'Persistent ceiling leak in main bathroom' }, property: { zh: '海棠湾壹号 · 2-1803', en: 'Haitang Bay One · 2-1803' }, propertyType: 'residential', region: 'haitang', category: 'plumbing', stage: 'dispatch', priority: 'critical', slaMinutes: -12, assignee: { zh: '张师傅', en: 'Zhang' }, status: 'overdue' },
    { id: 'HM-240721', title: { zh: '配电箱反复跳闸', en: 'Distribution board repeatedly tripping' }, property: { zh: '亚龙湾悦榕庄 · B12', en: 'Yalong Bay Resort · B12' }, propertyType: 'resort', region: 'jiyang', category: 'electrical', stage: 'diagnosis', priority: 'critical', slaMinutes: 8, assignee: { zh: '责任复核队列', en: 'Liability review queue' }, status: 'open' },
    { id: 'HM-240704', title: { zh: '中央空调制冷不足', en: 'Central HVAC cooling below target' }, property: { zh: '三亚中心广场 · 17F', en: 'Sanya Central Plaza · 17F' }, propertyType: 'commercial', region: 'tianya', category: 'hvac', stage: 'dispatch', priority: 'high', slaMinutes: 18, assignee: { zh: '李师傅', en: 'Li' }, status: 'in_progress' },
    { id: 'HM-240699', title: { zh: '洗衣机排水异常', en: 'Washing machine drainage fault' }, property: { zh: '半山半岛 · 5-903', en: 'Banshan Peninsula · 5-903' }, propertyType: 'residential', region: 'jiyang', category: 'appliance', stage: 'deflection', priority: 'medium', slaMinutes: 24, assignee: { zh: 'DIY 分流代理', en: 'DIY deflection agent' }, status: 'open' },
    { id: 'HM-240688', title: { zh: '阳台墙面出现裂纹', en: 'Crack developing along balcony wall' }, property: { zh: '崖州湾科技城 · A6', en: 'Yazhou Bay Science City · A6' }, propertyType: 'commercial', region: 'yazhou', category: 'structural', stage: 'verification', priority: 'high', slaMinutes: 31, assignee: { zh: '王工', en: 'Wang' }, status: 'in_progress' },
    { id: 'HM-240681', title: { zh: '厨房水槽下方漏水', en: 'Leak below kitchen sink' }, property: { zh: '红塘湾 · 8-1102', en: 'Hongtang Bay · 8-1102' }, propertyType: 'residential', region: 'tianya', category: 'plumbing', stage: 'verification', priority: 'high', slaMinutes: -6, assignee: { zh: '陈师傅', en: 'Chen' }, status: 'overdue' },
    { id: 'HM-240673', title: { zh: '客房门锁无法供电', en: 'Guest-room lock has no power' }, property: { zh: '海棠湾康莱德 · 708', en: 'Haitang Bay Conrad · 708' }, propertyType: 'resort', region: 'haitang', category: 'electrical', stage: 'reporting', priority: 'medium', slaMinutes: 42, assignee: { zh: '赵师傅', en: 'Zhao' }, status: 'completed' },
    { id: 'HM-240665', title: { zh: '热水器出水温度波动', en: 'Water-heater temperature fluctuating' }, property: { zh: '南山花园 · 3-602', en: 'Nanshan Garden · 3-602' }, propertyType: 'residential', region: 'yazhou', category: 'appliance', stage: 'intake', priority: 'medium', slaMinutes: 51, assignee: { zh: '接入代理', en: 'Intake agent' }, status: 'open' },
];

const localize = (value: LocalizedText, locale: 'zh' | 'en') => value[locale];

const formatCompact = (value: number, locale: 'zh' | 'en') => new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
}).format(value);

const scaleValue = (value: number, factor: number) => Math.max(0, Math.round(value * factor));

const PanelHeader: React.FC<{
    title: string;
    subtitle: string;
    action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
    <header className="tableau-panel-header">
        <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
        </div>
        {action}
    </header>
);

const KpiCard: React.FC<{ metric: KpiMetric; versus: string }> = ({ metric, versus }) => {
    return (
        <article className={`tableau-kpi-card is-${metric.tone}`}>
            <div className="tableau-kpi-heading">
                <span>{metric.label}</span>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>{metric.icon}</span>
            </div>
            <div className="tableau-kpi-value">
                <strong>{metric.value}</strong>
                {metric.unit && <span>{metric.unit}</span>}
            </div>
            <div className="tableau-kpi-footer">
                <span className={metric.favorable ? 'is-positive' : 'is-negative'}>
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{metric.direction === 'up' ? 'north_east' : 'south_east'}</span> {metric.change}
                </span>
                <small>{versus}</small>
            </div>
            <p>{metric.context}</p>
        </article>
    );
};

const TrendChart: React.FC<{
    points: TrendPoint[];
    factor: number;
    locale: 'zh' | 'en';
    incomingLabel: string;
    completedLabel: string;
}> = ({ points, factor, locale, incomingLabel, completedLabel }) => {
    const width = 820;
    const height = 260;
    const padding = { top: 18, right: 22, bottom: 38, left: 48 };
    const current = points.map((point) => scaleValue(point.current, factor));
    const completed = current.map((value, index) => Math.round(value * (0.78 + index * 0.018)));
    const previous = points.map((point) => scaleValue(point.previous, factor));
    const maxValue = Math.max(...current, ...previous, 10);
    const chartMax = Math.ceil(maxValue / 50) * 50 || 50;
    const xFor = (index: number) => padding.left + index * ((width - padding.left - padding.right) / Math.max(1, points.length - 1));
    const yFor = (value: number) => padding.top + (height - padding.top - padding.bottom) * (1 - value / chartMax);
    const toPath = (values: number[]) => values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(value)}`).join(' ');
    const ticks = [0, 0.25, 0.5, 0.75, 1];

    return (
        <div className="tableau-trend-chart">
            <div className="tableau-chart-legend" aria-hidden="true">
                <span><i className="legend-current" />{incomingLabel}</span>
                <span><i className="legend-completed" />{completedLabel}</span>
                <span><i className="legend-previous" />{locale === 'zh' ? '上一周期' : 'Previous period'}</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${incomingLabel}, ${completedLabel}`}>
                {ticks.map((tick) => {
                    const value = Math.round(chartMax * tick);
                    const y = yFor(value);
                    return (
                        <g key={tick}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="tableau-grid-line" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" className="tableau-axis-label">{formatCompact(value, locale)}</text>
                        </g>
                    );
                })}
                <path d={toPath(previous)} className="tableau-line-previous" />
                <path d={toPath(completed)} className="tableau-line-completed" />
                <path d={toPath(current)} className="tableau-line-current" />
                {current.map((value, index) => (
                    <g key={points[index].label.en}>
                        <circle cx={xFor(index)} cy={yFor(value)} r="4" className="tableau-point-current">
                            <title>{`${localize(points[index].label, locale)}: ${value}`}</title>
                        </circle>
                        <text x={xFor(index)} y={height - 12} textAnchor="middle" className="tableau-axis-label">{localize(points[index].label, locale)}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

const EnterpriseDashboardHome: React.FC = () => {
    const { locale: languageLocale } = useLanguage();
    const locale: 'zh' | 'en' = languageLocale === 'zh' ? 'zh' : 'en';
    const copy = COPY[locale];
    const stages = getOperatingStageCopies(locale);
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const [region, setRegion] = useState<Region>('all');
    const [propertyType, setPropertyType] = useState<PropertyType>('all');
    const [ticketStatus, setTicketStatus] = useState<TicketStatus>('all');
    const [selectedStage, setSelectedStage] = useState<StageId | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category>('all');
    const [mapExpanded, setMapExpanded] = useState(false);
    const [mapStatus, setMapStatus] = useState<WorkerStatusSummary>({ total: 3, repairing: 2, idle: 1 });
    const [lastUpdated, setLastUpdated] = useState(() => new Date());
    const [refreshing, setRefreshing] = useState(false);

    const scopeFactor = REGION_FACTORS[region] * PROPERTY_FACTORS[propertyType] * STATUS_FACTORS[ticketStatus];
    const trendPoints = TREND_SERIES[timeRange];
    const intakeTotal = trendPoints.reduce((sum, point) => sum + scaleValue(point.current, scopeFactor), 0);

    const metrics = useMemo<KpiMetric[]>(() => {
        const regionPenalty = region === 'tianya' ? 3.1 : region === 'yazhou' ? 1.2 : 0;
        const statusPenalty = ticketStatus === 'overdue' ? 8.4 : 0;
        const sla = Math.max(72, 94.8 - regionPenalty - statusPenalty);
        const accuracy = 87.6 - (propertyType === 'commercial' ? 1.4 : 0);
        const deflection = 21.4 - (region === 'tianya' ? 2.7 : 0);
        const cycle = 3.8 + (region === 'tianya' ? 0.8 : region === 'yazhou' ? 0.3 : 0);
        return [
            { label: copy.kpis.intake, value: formatCompact(intakeTotal, locale), change: '+8.6%', context: copy.kpis.intakeContext, direction: 'up', favorable: true, icon: 'fact_check', tone: 'blue' },
            { label: copy.kpis.sla, value: sla.toFixed(1), unit: '%', change: region === 'tianya' ? '-1.7pp' : '+2.4pp', context: copy.kpis.slaContext, direction: region === 'tianya' ? 'down' : 'up', favorable: region !== 'tianya', icon: 'track_changes', tone: region === 'tianya' ? 'red' : 'teal' },
            { label: copy.kpis.accuracy, value: accuracy.toFixed(1), unit: '%', change: '+1.8pp', context: copy.kpis.accuracyContext, direction: 'up', favorable: true, icon: 'smart_toy', tone: 'violet' },
            { label: copy.kpis.deflection, value: deflection.toFixed(1), unit: '%', change: '+3.2pp', context: copy.kpis.deflectionContext, direction: 'up', favorable: true, icon: 'auto_awesome', tone: 'amber' },
            { label: copy.kpis.cycle, value: cycle.toFixed(1), unit: locale === 'zh' ? '小时' : 'h', change: '-0.6h', context: copy.kpis.cycleContext, direction: 'down', favorable: true, icon: 'schedule', tone: 'blue' },
        ];
    }, [copy, intakeTotal, locale, propertyType, region, ticketStatus]);

    const workflowCounts = useMemo(() => stages.map((stage) => ({
        stage,
        count: scaleValue(WORKFLOW_COUNTS[stage.id], scopeFactor),
    })), [scopeFactor, stages]);

    const categoryCounts = useMemo(() => (Object.entries(CATEGORY_COUNTS) as [Exclude<Category, 'all'>, number][]).map(([id, value]) => ({
        id,
        value: scaleValue(value, scopeFactor),
    })), [scopeFactor]);

    const visibleOrders = useMemo(() => WORK_ORDERS.filter((order) => {
        if (region !== 'all' && order.region !== region) return false;
        if (propertyType !== 'all' && order.propertyType !== propertyType) return false;
        if (ticketStatus !== 'all' && order.status !== ticketStatus) return false;
        if (selectedStage && order.stage !== selectedStage) return false;
        if (selectedCategory !== 'all' && order.category !== selectedCategory) return false;
        return true;
    }).sort((a, b) => a.slaMinutes - b.slaMinutes), [propertyType, region, selectedCategory, selectedStage, ticketStatus]);

    const activeFilterCount = [region !== 'all', propertyType !== 'all', ticketStatus !== 'all', selectedStage !== null, selectedCategory !== 'all'].filter(Boolean).length;
    const maxCategoryValue = Math.max(...categoryCounts.map((item) => item.value), 1);
    const updatedTime = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(lastUpdated);

    useEffect(() => {
        const resizeTimer = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 180);
        return () => window.clearTimeout(resizeTimer);
    }, [mapExpanded]);

    const resetFilters = () => {
        setTimeRange('week');
        setRegion('all');
        setPropertyType('all');
        setTicketStatus('all');
        setSelectedStage(null);
        setSelectedCategory('all');
    };

    const handleRefresh = () => {
        setRefreshing(true);
        setLastUpdated(new Date());
        window.setTimeout(() => setRefreshing(false), 650);
    };

    const handleExport = () => {
        const header = ['ticket_id', 'issue', 'property', 'stage', 'priority', 'sla_minutes', 'assignee', 'status'];
        const rows = visibleOrders.map((order) => [
            order.id,
            localize(order.title, locale),
            localize(order.property, locale),
            order.stage,
            order.priority,
            order.slaMinutes,
            localize(order.assignee, locale),
            order.status,
        ]);
        const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `enterprise-operations-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="tableau-dashboard page-enter">
            <header className="tableau-dashboard-header">
                <div>
                    <p className="tableau-eyebrow">{copy.eyebrow}</p>
                    <div className="tableau-title-row">
                        <h1>{copy.title}</h1>
                        <span className="tableau-live-status"><i />{copy.live}</span>
                    </div>
                    <p className="tableau-dashboard-subtitle">{copy.subtitle}</p>
                </div>
                <div className="tableau-dashboard-actions">
                    <span className="tableau-data-freshness"><strong>{copy.demo}</strong>{copy.refreshed} {updatedTime}</span>
                    <button type="button" className="tableau-icon-button" onClick={handleRefresh} aria-label={copy.refresh} title={copy.refresh}>
                        <span className={`material-symbols-outlined text-[17px] ${refreshing ? 'is-spinning' : ''}`} aria-hidden="true">refresh</span>
                    </button>
                    <button type="button" className="tableau-icon-button" onClick={handleExport} aria-label={copy.export} title={copy.export}>
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">download</span>
                    </button>
                </div>
            </header>

            <section className="tableau-filter-bar" aria-label={copy.filters}>
                <div className="tableau-range-control" aria-label={copy.filters}>
                    {(Object.keys(copy.ranges) as TimeRange[]).map((range) => (
                        <button key={range} type="button" className={timeRange === range ? 'is-active' : ''} aria-pressed={timeRange === range} onClick={() => setTimeRange(range)}>
                            {copy.ranges[range]}
                        </button>
                    ))}
                </div>
                <label className="tableau-select-field">
                    <span>{copy.region}</span>
                    <select value={region} onChange={(event) => setRegion(event.target.value as Region)}>
                        {(Object.keys(copy.regions) as Region[]).map((id) => <option key={id} value={id}>{copy.regions[id]}</option>)}
                    </select>
                </label>
                <label className="tableau-select-field">
                    <span>{copy.property}</span>
                    <select value={propertyType} onChange={(event) => setPropertyType(event.target.value as PropertyType)}>
                        {(Object.keys(copy.properties) as PropertyType[]).map((id) => <option key={id} value={id}>{copy.properties[id]}</option>)}
                    </select>
                </label>
                <label className="tableau-select-field">
                    <span>{copy.status}</span>
                    <select value={ticketStatus} onChange={(event) => setTicketStatus(event.target.value as TicketStatus)}>
                        {(Object.keys(copy.statuses) as TicketStatus[]).map((id) => <option key={id} value={id}>{copy.statuses[id]}</option>)}
                    </select>
                </label>
                <button type="button" className="tableau-reset-button" onClick={resetFilters} disabled={activeFilterCount === 0 && timeRange === 'week'}>
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">restart_alt</span>
                    {copy.reset}
                    {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
                </button>
            </section>

            <section className="tableau-kpi-grid" aria-label={copy.title}>
                {metrics.map((metric) => <KpiCard key={metric.label} metric={metric} versus={copy.versus} />)}
            </section>

            <div className="tableau-primary-grid">
                <section className="tableau-panel tableau-trend-panel">
                    <PanelHeader title={copy.trendTitle} subtitle={copy.trendSubtitle} />
                    <TrendChart points={trendPoints} factor={scopeFactor} locale={locale} incomingLabel={copy.incoming} completedLabel={copy.completed} />
                </section>

                <section className="tableau-panel tableau-insights-panel">
                    <PanelHeader
                        title={copy.aiTitle}
                        subtitle={copy.aiSubtitle}
                        action={<span className="tableau-insight-count"><span className="material-symbols-outlined text-[13px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>{copy.aiBadge}</span>}
                    />
                    <div className="tableau-insight-list">
                        {copy.insights.map((insight, index) => (
                            <article key={insight.title} className={`tableau-insight is-${insight.tone}`}>
                                <span className="tableau-insight-icon">
                                    {index === 0 ? <span className="material-symbols-outlined text-[17px] text-amber-500" aria-hidden="true">warning</span> : index === 1 ? <span className="material-symbols-outlined text-[17px] text-success" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> : <span className="material-symbols-outlined text-[17px]" aria-hidden="true">speed</span>}
                                </span>
                                <div>
                                    <h3>{insight.title}</h3>
                                    <p>{insight.detail}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                    <Link to="tickets" className="tableau-panel-link">{copy.viewTickets}<span className="material-symbols-outlined text-[15px] ml-1" aria-hidden="true">arrow_forward</span></Link>
                </section>
            </div>

            <section className="tableau-panel tableau-workflow-panel">
                <PanelHeader
                    title={copy.workflowTitle}
                    subtitle={copy.workflowSubtitle}
                    action={selectedStage ? (
                        <button type="button" className="tableau-clear-filter" onClick={() => setSelectedStage(null)}>
                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">restart_alt</span>{copy.clearStage}
                        </button>
                    ) : undefined}
                />
                <div className="tableau-workflow">
                    {workflowCounts.map(({ stage, count }, index) => (
                        <button
                            key={stage.id}
                            type="button"
                            className={`tableau-stage${selectedStage === stage.id ? ' is-selected' : ''}`}
                            aria-pressed={selectedStage === stage.id}
                            onClick={() => setSelectedStage((current) => current === stage.id ? null : stage.id)}
                        >
                            <span className="tableau-stage-index">0{index + 1}</span>
                            <span className="tableau-stage-copy">
                                <strong>{stage.title}</strong>
                                <small>{stage.metric}</small>
                            </span>
                            <span className="tableau-stage-value">{formatCompact(count, locale)}<small>{copy.stageCount}</small></span>
                            {index < workflowCounts.length - 1 && <span className="material-symbols-outlined tableau-stage-arrow text-[15px]" aria-hidden="true">arrow_forward</span>}
                        </button>
                    ))}
                </div>
            </section>

            <section className={`tableau-panel tableau-map-panel${mapExpanded ? ' is-expanded' : ''}`} data-testid="operations-map-panel">
                <PanelHeader
                    title={copy.mapTitle}
                    subtitle={copy.mapSubtitle}
                    action={(
                        <div className="tableau-map-toolbar" aria-label={copy.mapTitle}>
                            <span className="tableau-map-live"><i />{copy.mapLive}</span>
                            <span className="tableau-map-status"><i className="is-repairing" />{copy.mapRepairing}<strong>{mapStatus.repairing}</strong></span>
                            <span className="tableau-map-status"><i className="is-idle" />{copy.mapIdle}<strong>{mapStatus.idle}</strong></span>
                            <button
                                type="button"
                                className="tableau-icon-button"
                                onClick={() => setMapExpanded((current) => !current)}
                                aria-label={mapExpanded ? copy.mapCollapse : copy.mapExpand}
                                title={mapExpanded ? copy.mapCollapse : copy.mapExpand}
                            >
                                {mapExpanded ? <span className="material-symbols-outlined text-[16px]" aria-hidden="true">fullscreen_exit</span> : <span className="material-symbols-outlined text-[16px]" aria-hidden="true">fullscreen</span>}
                            </button>
                        </div>
                    )}
                />
                <div className="tableau-map-frame">
                    <EnterpriseMap onStatusChange={setMapStatus} />
                </div>
            </section>

            <div className="tableau-secondary-grid">
                <section className="tableau-panel tableau-category-panel">
                    <PanelHeader title={copy.categoryTitle} subtitle={copy.categorySubtitle} />
                    <div className="tableau-category-list">
                        {categoryCounts.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={selectedCategory === item.id ? 'is-selected' : ''}
                                aria-pressed={selectedCategory === item.id}
                                onClick={() => setSelectedCategory((current) => current === item.id ? 'all' : item.id)}
                            >
                                <span>{copy.categories[item.id]}</span>
                                <span className="tableau-category-track"><i style={{ width: `${item.value / maxCategoryValue * 100}%` }} /></span>
                                <strong>{formatCompact(item.value, locale)}</strong>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="tableau-panel tableau-region-panel">
                    <PanelHeader title={copy.regionTitle} subtitle={copy.regionSubtitle} />
                    <div className="tableau-table-scroll">
                        <table className="tableau-region-table">
                            <thead><tr><th>{copy.tableRegion}</th><th>{copy.tableTickets}</th><th>{copy.tableSla}</th><th>{copy.tableDeflection}</th><th>{copy.tableCycle}</th></tr></thead>
                            <tbody>
                                {REGION_PERFORMANCE.filter((item) => region === 'all' || item.id === region).map((item) => (
                                    <tr key={item.id}>
                                        <td><button type="button" onClick={() => setRegion(item.id)}>{localize(item.name, locale)}</button></td>
                                        <td>{formatCompact(scaleValue(item.tickets, PROPERTY_FACTORS[propertyType] * STATUS_FACTORS[ticketStatus]), locale)}</td>
                                        <td><span className={`tableau-score${item.sla < 92 ? ' is-risk' : ''}`}>{item.sla.toFixed(1)}%</span></td>
                                        <td>{item.deflection.toFixed(1)}%</td>
                                        <td>{item.cycle.toFixed(1)}{locale === 'zh' ? ' 小时' : 'h'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section className="tableau-panel tableau-queue-panel">
                <PanelHeader
                    title={copy.queueTitle}
                    subtitle={copy.queueSubtitle}
                    action={<span className="tableau-record-count">{visibleOrders.length} {copy.queueCount}</span>}
                />
                <div className="tableau-table-scroll">
                    <table className="tableau-queue-table">
                        <thead><tr><th>{copy.columns.id}</th><th>{copy.columns.issue}</th><th>{copy.columns.stage}</th><th>{copy.columns.priority}</th><th>{copy.columns.sla}</th><th>{copy.columns.assignee}</th><th>{copy.columns.status}</th></tr></thead>
                        <tbody>
                            {visibleOrders.map((order) => {
                                const stage = stages.find((item) => item.id === order.stage);
                                return (
                                    <tr key={order.id}>
                                        <td><Link to="tickets">{order.id}</Link></td>
                                        <td><strong>{localize(order.title, locale)}</strong><small>{localize(order.property, locale)}</small></td>
                                        <td><span className="tableau-stage-cell"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">insights</span>{stage?.title}</span></td>
                                        <td><span className={`tableau-priority is-${order.priority}`}>{copy.priority[order.priority]}</span></td>
                                        <td><span className={order.slaMinutes < 0 ? 'tableau-sla is-overdue' : 'tableau-sla'}>{order.slaMinutes < 0 ? `${Math.abs(order.slaMinutes)} ${copy.minutes} ${copy.overdue}` : `${order.slaMinutes} ${copy.minutes}`}</span></td>
                                        <td>{localize(order.assignee, locale)}</td>
                                        <td><span className={`tableau-ticket-status is-${order.status}`}>{copy.statuses[order.status]}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {visibleOrders.length === 0 && <div className="tableau-empty-state"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">build</span><span>{copy.empty}</span></div>}
                </div>
            </section>
        </div>
    );
};

const EnterpriseDashboard: React.FC = () => (
    <EnterpriseLayout>
        <Routes>
            <Route index element={<EnterpriseDashboardHome />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="workers" element={<EnterpriseWorkersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="ai-config" element={<EnterpriseAIConfigPage />} />
        </Routes>
    </EnterpriseLayout>
);

export { EnterpriseDashboardHome };
export default EnterpriseDashboard;
