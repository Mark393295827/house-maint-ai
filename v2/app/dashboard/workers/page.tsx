"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Worker {
    id: string;
    name: string;
    phone: string;
    specialties: string[];
    rating: number;
    total_jobs: number;
    completed_jobs: number;
    hourly_rate: number;
    available: boolean;
    bio?: string;
}

const SPECIALTIES = [
    { value: "air_conditioner", label: "空调" },
    { value: "refrigerator", label: "冰箱" },
    { value: "washing_machine", label: "洗衣机" },
    { value: "water_heater", label: "热水器" },
    { value: "tv", label: "电视" },
    { value: "microwave", label: "微波炉" },
];

export default function WorkersPage() {
    const router = useRouter();
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSpecialty, setSelectedSpecialty] = useState("");

    const fetchWorkers = async (specialty?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (specialty) params.append("specialty", specialty);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workers/search?${params}`
            );

            if (response.ok) {
                const data = await response.json();
                setWorkers(data.workers);
            }
        } catch (err) {
            console.error("Failed to fetch workers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
    }, []);

    const handleSpecialtyChange = (specialty: string) => {
        setSelectedSpecialty(specialty);
        fetchWorkers(specialty || undefined);
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

            <main className="container mx-auto px-4 py-8 max-w-6xl">
                <h1 className="text-3xl font-bold mb-6">寻找专业师傅</h1>

                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>筛选条件</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">专业领域</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                    <Button
                                        variant={selectedSpecialty === "" ? "default" : "outline"}
                                        onClick={() => handleSpecialtyChange("")}
                                        className="w-full"
                                    >
                                        全部
                                    </Button>
                                    {SPECIALTIES.map((specialty) => (
                                        <Button
                                            key={specialty.value}
                                            variant={
                                                selectedSpecialty === specialty.value ? "default" : "outline"
                                            }
                                            onClick={() => handleSpecialtyChange(specialty.value)}
                                            className="w-full"
                                        >
                                            {specialty.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Workers List */}
                {loading ? (
                    <div className="text-center py-12">搜索中...</div>
                ) : workers.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <div className="text-6xl mb-4">👨‍🔧</div>
                            <p className="text-gray-600">暂无符合条件的师傅</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {workers.map((worker) => (
                            <Card
                                key={worker.id}
                                className="hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => router.push(`/dashboard/workers/${worker.id}`)}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl mb-1">{worker.name}</CardTitle>
                                            <div className="flex items-center gap-2">
                                                <span className="text-yellow-500">⭐</span>
                                                <span className="font-semibold">{worker.rating.toFixed(1)}</span>
                                                <span className="text-sm text-gray-500">
                                                    ({worker.completed_jobs} 单)
                                                </span>
                                            </div>
                                        </div>
                                        {worker.available && (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                可接单
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <span className="text-sm text-gray-600">专长：</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {worker.specialties.map((specialty, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                                                >
                                                    {SPECIALTIES.find((s) => s.value === specialty)?.label ||
                                                        specialty}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {worker.bio && (
                                        <p className="text-sm text-gray-600 line-clamp-2">{worker.bio}</p>
                                    )}

                                    <div className="flex justify-between items-center pt-2 border-t">
                                        <span className="text-lg font-bold text-blue-600">
                                            ¥{worker.hourly_rate}/小时
                                        </span>
                                        <Button size="sm">查看详情</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
