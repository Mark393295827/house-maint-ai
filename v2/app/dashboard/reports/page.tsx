"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Report {
    id: string;
    description: string;
    status: string;
    created_at: string;
    ai_diagnosis?: {
        issue_name: string;
        severity: string;
    };
}

export default function ReportsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports`, {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setReports(data.reports);
                }
            } catch (err) {
                console.error("Failed to fetch reports:", err);
            } finally {
                setLoading(false);
            }
        };

        if (session?.accessToken) {
            fetchReports();
        }
    }, [session]);

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: "待处理",
            diagnosed: "已诊断",
            assigned: "已分配",
            in_progress: "进行中",
            completed: "已完成",
            cancelled: "已取消",
        };
        return labels[status] || status;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                        ← 返回仪表盘
                    </Button>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">我的报告</h1>
                    <Link href="/dashboard/reports/new">
                        <Button>+ 创建新报告</Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-12">加载中...</div>
                ) : reports.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-gray-600 mb-6">还没有报告</p>
                            <Link href="/dashboard/reports/new">
                                <Button>创建第一个报告</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <Card
                                key={report.id}
                                className="hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => router.push(`/dashboard/reports/${report.id}`)}
                            >
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-start">
                                        <span className="text-lg">
                                            {report.ai_diagnosis?.issue_name || report.description.substring(0, 50)}
                                        </span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-normal">
                                            {getStatusLabel(report.status)}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600 text-sm mb-2">
                                        {report.description.substring(0, 100)}
                                        {report.description.length > 100 && "..."}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(report.created_at).toLocaleString("zh-CN")}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
