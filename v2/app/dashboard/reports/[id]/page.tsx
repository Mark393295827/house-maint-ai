"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DiagnosisResult {
    issue_name: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    estimated_cost: { min: number; max: number };
    tools_needed: string[];
    steps: string[];
    confidence: number;
    model: "llama3" | "gemini";
}

interface Report {
    id: string;
    description: string;
    address: string;
    images: string[];
    ai_diagnosis: DiagnosisResult;
    ai_confidence: number;
    status: string;
    created_at: string;
}

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/reports/${params.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${session?.accessToken}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch report");
                }

                const data = await response.json();
                setReport(data.report);
            } catch (err: any) {
                setError(err.message || "加载失败");
            } finally {
                setLoading(false);
            }
        };

        if (session?.accessToken) {
            fetchReport();
        }
    }, [params.id, session]);

    const getSeverityColor = (severity: string) => {
        const colors = {
            low: "bg-green-100 text-green-800",
            medium: "bg-yellow-100 text-yellow-800",
            high: "bg-orange-100 text-orange-800",
            critical: "bg-red-100 text-red-800",
        };
        return colors[severity as keyof typeof colors] || colors.medium;
    };

    const getSeverityLabel = (severity: string) => {
        const labels = {
            low: "低",
            medium: "中",
            high: "高",
            critical: "紧急",
        };
        return labels[severity as keyof typeof labels] || "中";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">加载中...</div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-600">{error || "报告不存在"}</div>
            </div>
        );
    }

    const diagnosis = report.ai_diagnosis;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <Button variant="ghost" onClick={() => router.push("/dashboard/reports")}>
                        ← 返回报告列表
                    </Button>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">AI诊断报告</h1>
                    <p className="text-gray-600">
                        创建于 {new Date(report.created_at).toLocaleString("zh-CN")}
                    </p>
                </div>

                {/* AI Diagnosis Result */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>🤖 AI诊断结果</span>
                            <span className="text-sm font-normal text-gray-500">
                                {diagnosis.model === "llama3" ? "Llama 3" : "Gemini"} • 置信度:{" "}
                                {(diagnosis.confidence * 100).toFixed(0)}%
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold">{diagnosis.issue_name}</h3>
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(
                                        diagnosis.severity
                                    )}`}
                                >
                                    {getSeverityLabel(diagnosis.severity)}
                                </span>
                            </div>
                            <p className="text-gray-700">{diagnosis.description}</p>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">💰 预估费用</h4>
                            <p className="text-2xl font-bold text-blue-600">
                                ¥{diagnosis.estimated_cost.min} - ¥{diagnosis.estimated_cost.max}
                            </p>
                        </div>

                        {diagnosis.tools_needed.length > 0 && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-2">🔧 所需工具</h4>
                                <div className="flex flex-wrap gap-2">
                                    {diagnosis.tools_needed.map((tool, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                                        >
                                            {tool}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {diagnosis.steps.length > 0 && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3">📋 维修步骤</h4>
                                <ol className="space-y-2">
                                    {diagnosis.steps.map((step, index) => (
                                        <li key={index} className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                                                {index + 1}
                                            </span>
                                            <span className="text-gray-700 pt-0.5">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Report Details */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>📝 报告详情</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {report.images.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">故障照片</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {report.images.map((image, index) => (
                                        <img
                                            key={index}
                                            src={image}
                                            alt={`故障照片 ${index + 1}`}
                                            className="rounded-lg w-full h-auto"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="font-semibold mb-1">问题描述</h4>
                            <p className="text-gray-700">{report.description}</p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-1">维修地址</h4>
                            <p className="text-gray-700">{report.address}</p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-1">状态</h4>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {report.status === "pending" ? "待分配" : report.status}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <Button
                                className="flex-1"
                                onClick={() => router.push("/dashboard/workers")}
                            >
                                🔍 寻找师傅
                            </Button>
                            <Button variant="outline" className="flex-1">
                                📞 联系客服
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
