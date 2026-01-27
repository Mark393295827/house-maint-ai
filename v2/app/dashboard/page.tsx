"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">加载中...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="bg-white border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-600">House Maint AI</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            欢迎, {session.user.name}
                        </span>
                        <Button variant="outline" onClick={() => signOut()}>
                            退出
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">仪表盘</h2>
                    <p className="text-gray-600">管理您的维修报告和订单</p>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Link href="/dashboard/reports/new">
                        <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="text-4xl mb-4">📸</div>
                            <h3 className="text-xl font-semibold mb-2">创建报告</h3>
                            <p className="text-gray-600">拍照上传，AI智能诊断</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/reports">
                        <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="text-4xl mb-4">📋</div>
                            <h3 className="text-xl font-semibold mb-2">我的报告</h3>
                            <p className="text-gray-600">查看所有维修报告</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/workers">
                        <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="text-4xl mb-4">👨‍🔧</div>
                            <h3 className="text-xl font-semibold mb-2">找师傅</h3>
                            <p className="text-gray-600">搜索专业维修师傅</p>
                        </div>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-lg shadow">
                        <div className="text-2xl font-bold text-blue-600">0</div>
                        <div className="text-sm text-gray-600">待处理报告</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow">
                        <div className="text-2xl font-bold text-green-600">0</div>
                        <div className="text-sm text-gray-600">已完成订单</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow">
                        <div className="text-2xl font-bold text-orange-600">0</div>
                        <div className="text-sm text-gray-600">进行中</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow">
                        <div className="text-2xl font-bold text-purple-600">¥0</div>
                        <div className="text-sm text-gray-600">总支出</div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="mt-8 bg-white rounded-lg shadow">
                    <div className="p-6">
                        <h3 className="text-xl font-semibold mb-4">最近活动</h3>
                        <div className="text-center py-8 text-gray-500">
                            暂无活动记录
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
