"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Report {
    id: string;
    description: string;
    address: string;
}

export default function NewOrderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [reports, setReports] = useState<Report[]>([]);

    const [formData, setFormData] = useState({
        reportId: "",
        workerId: searchParams.get("workerId") || "",
        scheduledDate: "",
        scheduledTime: "",
        notes: "",
    });

    useEffect(() => {
        // Fetch user's reports
        const fetchReports = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports`, {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setReports(data.reports.filter((r: any) => r.status === 'pending' || r.status === 'diagnosed'));
                }
            } catch (err) {
                console.error("Failed to fetch reports:", err);
            }
        };

        if (session?.accessToken) {
            fetchReports();
        }
    }, [session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const scheduledAt = formData.scheduledDate && formData.scheduledTime
                ? `${formData.scheduledDate}T${formData.scheduledTime}:00`
                : null;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({
                    report_id: formData.reportId,
                    worker_id: formData.workerId,
                    scheduled_at: scheduledAt,
                    notes: formData.notes,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create order");
            }

            const result = await response.json();
            router.push(`/dashboard/orders/${result.id}`);
        } catch (err: any) {
            setError(err.message || "创建订单失败，请重试");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        ← 返回
                    </Button>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-3xl font-bold mb-6">创建订单</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>预约维修服务</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Report Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    选择报告 *
                                </label>
                                <select
                                    value={formData.reportId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, reportId: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">请选择需要维修的报告</option>
                                    {reports.map((report) => (
                                        <option key={report.id} value={report.id}>
                                            {report.description.substring(0, 50)} - {report.address}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Scheduled Date & Time */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    预约时间（可选）
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="date"
                                        value={formData.scheduledDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, scheduledDate: e.target.value })
                                        }
                                        min={new Date().toISOString().split("T")[0]}
                                    />
                                    <Input
                                        type="time"
                                        value={formData.scheduledTime}
                                        onChange={(e) =>
                                            setFormData({ ...formData, scheduledTime: e.target.value })
                                        }
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    不填写则由师傅联系您确定时间
                                </p>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    备注说明
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) =>
                                        setFormData({ ...formData, notes: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={4}
                                    placeholder="有什么特殊要求或需要师傅注意的事项"
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    className="flex-1"
                                >
                                    取消
                                </Button>
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {loading ? "提交中..." : "确认预约"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2">💡 温馨提示</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                        <li>• 订单创建后，师傅将在24小时内联系您</li>
                        <li>• 可通过电话与师傅直接沟通具体时间</li>
                        <li>• 维修完成后记得给师傅评价哦</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
