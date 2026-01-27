"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Order {
    id: string;
    status: string;
    scheduled_at?: string;
    created_at: string;
    description: string;
    address: string;
    worker_name: string;
    worker_phone: string;
}

export default function OrdersPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setOrders(data.orders);
                }
            } catch (err) {
                console.error("Failed to fetch orders:", err);
            } finally {
                setLoading(false);
            }
        };

        if (session?.accessToken) {
            fetchOrders();
        }
    }, [session]);

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: "待接单",
            accepted: "已接单",
            in_progress: "进行中",
            completed: "已完成",
            cancelled: "已取消",
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800",
            accepted: "bg-blue-100 text-blue-800",
            in_progress: "bg-purple-100 text-purple-800",
            completed: "bg-green-100 text-green-800",
            cancelled: "bg-gray-100 text-gray-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
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
                    <h1 className="text-3xl font-bold">我的订单</h1>
                </div>

                {loading ? (
                    <div className="text-center py-12">加载中...</div>
                ) : orders.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <div className="text-6xl mb-4">📦</div>
                            <p className="text-gray-600 mb-6">还没有订单</p>
                            <Link href="/dashboard/workers">
                                <Button>找师傅创建订单</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <Card
                                key={order.id}
                                className="hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                            >
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-start">
                                        <span className="text-lg">{order.description.substring(0, 50)}</span>
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-normal ${getStatusColor(
                                                order.status
                                            )}`}
                                        >
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-600">师傅：</span>
                                        <span className="font-medium">{order.worker_name}</span>
                                        <span className="text-gray-400">|</span>
                                        <span className="text-gray-600">{order.worker_phone}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <span>地址：</span>
                                        {order.address}
                                    </div>
                                    {order.scheduled_at && (
                                        <div className="text-sm text-gray-600">
                                            <span>预约时间：</span>
                                            {new Date(order.scheduled_at).toLocaleString("zh-CN")}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-500 pt-2 border-t">
                                        创建于 {new Date(order.created_at).toLocaleString("zh-CN")}
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
