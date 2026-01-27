"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Worker {
    id: string;
    name: string;
    phone: string;
    avatar_url?: string;
    specialties: string[];
    certifications?: any[];
    rating: number;
    total_jobs: number;
    completed_jobs: number;
    cancellation_rate: number;
    hourly_rate: number;
    bio?: string;
    available: boolean;
    is_verified: boolean;
}

const SPECIALTIES_MAP: Record<string, string> = {
    air_conditioner: "空调",
    refrigerator: "冰箱",
    washing_machine: "洗衣机",
    water_heater: "热水器",
    tv: "电视",
    microwave: "微波炉",
};

export default function WorkerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [worker, setWorker] = useState<Worker | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchWorker = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/workers/${params.id}`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch worker");
                }

                const data = await response.json();
                setWorker(data.worker);
            } catch (err: any) {
                setError(err.message || "加载失败");
            } finally {
                setLoading(false);
            }
        };

        fetchWorker();
    }, [params.id]);

    const handleBooking = () => {
        if (!session) {
            router.push("/login");
            return;
        }
        // Navigate to order creation with worker pre-selected
        router.push(`/dashboard/orders/new?workerId=${params.id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">加载中...</div>
            </div>
        );
    }

    if (error || !worker) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-600">{error || "师傅不存在"}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        ← 返回
                    </Button>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                                {worker.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold">{worker.name}</h1>
                                    {worker.is_verified && (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                            ✓ 已认证
                                        </span>
                                    )}
                                    {worker.available && (
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
                                            可接单
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-gray-600 mb-3">
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-500 text-xl">⭐</span>
                                        <span className="text-2xl font-bold text-gray-900">
                                            {worker.rating.toFixed(1)}
                                        </span>
                                    </div>
                                    <span>|</span>
                                    <span>完成 {worker.completed_jobs} 单</span>
                                    <span>|</span>
                                    <span>取消率 {(worker.cancellation_rate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="text-3xl font-bold text-blue-600">
                                    ¥{worker.hourly_rate}/小时
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Specialties */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>专业技能</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {worker.specialties.map((specialty, idx) => (
                                <span
                                    key={idx}
                                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium"
                                >
                                    {SPECIALTIES_MAP[specialty] || specialty}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Bio */}
                {worker.bio && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>个人简介</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 leading-relaxed">{worker.bio}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Stats */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>服务统计</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                    {worker.total_jobs}
                                </div>
                                <div className="text-sm text-gray-600">总接单数</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                    {worker.completed_jobs}
                                </div>
                                <div className="text-sm text-gray-600">已完成</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">
                                    {((worker.completed_jobs / worker.total_jobs) * 100).toFixed(0)}%
                                </div>
                                <div className="text-sm text-gray-600">完成率</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Info */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>联系方式</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">电话：</span>
                            <span className="font-semibold">{worker.phone}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                    <Button
                        className="flex-1 text-lg py-6"
                        onClick={handleBooking}
                        disabled={!worker.available}
                    >
                        {worker.available ? "立即预约" : "暂不可预约"}
                    </Button>
                    <Button variant="outline" className="flex-1 text-lg py-6">
                        📞 电话联系
                    </Button>
                </div>
            </main>
        </div>
    );
}
